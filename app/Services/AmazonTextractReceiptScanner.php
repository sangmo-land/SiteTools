<?php

namespace App\Services;

use Aws\Textract\TextractClient;
use DateTimeImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;

class AmazonTextractReceiptScanner
{
    public function scan(UploadedFile $receipt, ?TextractClient $client = null): array
    {
        $path = $receipt->getRealPath();

        if ($path === false || ($contents = file_get_contents($path)) === false) {
            throw new RuntimeException('The uploaded receipt could not be read.');
        }

        $result = ($client ?? $this->client())->analyzeExpense([
            'Document' => ['Bytes' => $contents],
        ])->toArray();
        $documents = $result['ExpenseDocuments'] ?? [];

        if ($documents === []) {
            throw new RuntimeException('Amazon Textract returned no receipt data.');
        }

        return $this->normalize($documents);
    }

    private function client(): TextractClient
    {
        $key = config('services.textract.key');
        $secret = config('services.textract.secret');

        if (blank($key) || blank($secret)) {
            throw new RuntimeException('Amazon Textract credentials are not configured.');
        }

        $credentials = [
            'key' => $key,
            'secret' => $secret,
        ];

        if (filled(config('services.textract.token'))) {
            $credentials['token'] = config('services.textract.token');
        }

        $configuration = [
            'version' => 'latest',
            'region' => config('services.textract.region', 'us-east-1'),
            'credentials' => $credentials,
        ];

        if (filled(config('services.textract.endpoint'))) {
            $configuration['endpoint'] = config('services.textract.endpoint');
        }

        return new TextractClient($configuration);
    }

    private function normalize(array $documents): array
    {
        $summaryFields = [];
        $items = [];
        $lines = [];
        $confidences = [];

        foreach ($documents as $document) {
            foreach ($document['SummaryFields'] ?? [] as $field) {
                $type = strtoupper((string) data_get($field, 'Type.Text'));

                if ($type !== '' && ! isset($summaryFields[$type])) {
                    $summaryFields[$type] = $field;
                }

                $this->collectConfidence($confidences, $field);
            }

            foreach ($document['LineItemGroups'] ?? [] as $group) {
                foreach ($group['LineItems'] ?? [] as $lineItem) {
                    $normalizedItem = $this->normalizeItem($lineItem['LineItemExpenseFields'] ?? [], $confidences);

                    if ($normalizedItem !== null) {
                        $items[] = $normalizedItem;
                    }
                }
            }

            foreach ($document['Blocks'] ?? [] as $block) {
                if (($block['BlockType'] ?? null) === 'LINE' && filled($block['Text'] ?? null)) {
                    $lines[] = trim((string) $block['Text']);
                }
            }
        }

        $vendorField = $this->firstField($summaryFields, ['VENDOR_NAME', 'SUPPLIER_NAME', 'NAME']);
        $numberField = $this->firstField($summaryFields, ['INVOICE_RECEIPT_ID', 'RECEIPT_ID', 'INVOICE_ID']);
        $dateField = $this->firstField($summaryFields, ['INVOICE_RECEIPT_DATE', 'RECEIPT_DATE', 'INVOICE_DATE']);
        $subtotalField = $this->firstField($summaryFields, ['SUBTOTAL']);
        $taxField = $this->firstField($summaryFields, ['TAX', 'VAT']);
        $totalField = $this->firstField($summaryFields, ['TOTAL', 'AMOUNT_DUE', 'PAID_AMOUNT']);
        $paymentField = $this->firstField($summaryFields, ['PAYMENT_METHOD', 'PAYMENT_TERMS']);

        return [
            'text' => Str::limit(implode("\n", $lines), 65000, ''),
            'vendor' => $this->limitedValue($vendorField, 160),
            'receipt_number' => $this->limitedValue($numberField, 100),
            'purchase_date' => $this->normalizeDate($dateField),
            'subtotal' => $this->amountFromField($subtotalField),
            'tax_amount' => $this->amountFromField($taxField),
            'total_amount' => $this->amountFromField($totalField),
            'currency' => $this->currency($summaryFields, $totalField),
            'payment_method' => $this->limitedValue($paymentField, 50),
            'items' => array_slice($items, 0, 200),
            'confidence' => $confidences === []
                ? 0
                : round(array_sum($confidences) / count($confidences), 2),
        ];
    }

    private function normalizeItem(array $fields, array &$confidences): ?array
    {
        $fieldMap = [];

        foreach ($fields as $field) {
            $type = strtoupper((string) data_get($field, 'Type.Text'));

            if ($type !== '' && ! isset($fieldMap[$type])) {
                $fieldMap[$type] = $field;
            }

            $this->collectConfidence($confidences, $field);
        }

        $description = $this->limitedValue(
            $this->firstField($fieldMap, ['ITEM', 'DESCRIPTION', 'PRODUCT_CODE', 'EXPENSE_ROW']),
            255,
        );

        if ($description === null) {
            return null;
        }

        return [
            'description' => $description,
            'quantity' => $this->amountFromField($this->firstField($fieldMap, ['QUANTITY'])),
            'unit_price' => $this->amountFromField($this->firstField($fieldMap, ['UNIT_PRICE'])),
            'total' => $this->amountFromField($this->firstField($fieldMap, ['PRICE', 'LINE_TOTAL', 'AMOUNT'])),
        ];
    }

    private function firstField(array $fields, array $types): ?array
    {
        foreach ($types as $type) {
            if (isset($fields[$type]) && is_array($fields[$type])) {
                return $fields[$type];
            }
        }

        return null;
    }

    private function limitedValue(?array $field, int $limit): ?string
    {
        $value = trim((string) data_get($field, 'ValueDetection.Text', ''));

        return $value === '' ? null : Str::limit($value, $limit, '');
    }

    private function amountFromField(?array $field): ?float
    {
        return $this->parseAmount($this->limitedValue($field, 100));
    }

    private function parseAmount(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $number = preg_replace('/[^0-9,.\-]/', '', $value) ?? '';

        if ($number === '' || $number === '-') {
            return null;
        }

        $lastComma = strrpos($number, ',');
        $lastDot = strrpos($number, '.');

        if ($lastComma !== false && $lastDot !== false) {
            $decimalSeparator = $lastComma > $lastDot ? ',' : '.';
            $thousandsSeparator = $decimalSeparator === ',' ? '.' : ',';
            $number = str_replace($thousandsSeparator, '', $number);
            $number = str_replace($decimalSeparator, '.', $number);
        } elseif ($lastComma !== false || $lastDot !== false) {
            $separator = $lastComma !== false ? ',' : '.';
            $parts = explode($separator, $number);
            $lastPart = end($parts);

            if (count($parts) > 2 || strlen($lastPart) === 3) {
                $number = str_replace($separator, '', $number);
            } else {
                $number = str_replace($separator, '.', $number);
            }
        }

        return is_numeric($number)
            ? max(0, min(999999999, (float) $number))
            : null;
    }

    private function normalizeDate(?array $field): ?string
    {
        $value = trim((string) (
            data_get($field, 'ValueDetection.NormalizedValue.Value')
            ?: data_get($field, 'ValueDetection.Text', '')
        ));

        if ($value === '') {
            return null;
        }

        foreach (['!Y-m-d', '!d/m/Y', '!d-m-Y', '!Y/m/d', '!d.m.Y', '!d M Y', '!M d, Y'] as $format) {
            $date = DateTimeImmutable::createFromFormat($format, $value);
            $errors = DateTimeImmutable::getLastErrors();

            if ($date !== false && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }

    private function currency(array $summaryFields, ?array $totalField): ?string
    {
        $code = strtoupper(trim((string) data_get($totalField, 'Currency.Code', '')));

        if ($code === '') {
            foreach ($summaryFields as $field) {
                $code = strtoupper(trim((string) data_get($field, 'Currency.Code', '')));

                if ($code !== '') {
                    break;
                }
            }
        }

        if ($code !== '') {
            return Str::limit($code, 10, '');
        }

        $text = strtoupper((string) data_get($totalField, 'ValueDetection.Text', ''));
        $currencies = [
            'FCFA' => 'XAF', 'XAF' => 'XAF', 'NGN' => 'NGN', '₦' => 'NGN',
            'USD' => 'USD', '$' => 'USD', 'EUR' => 'EUR', '€' => 'EUR',
            'GBP' => 'GBP', '£' => 'GBP',
        ];

        foreach ($currencies as $needle => $currency) {
            if (str_contains($text, $needle)) {
                return $currency;
            }
        }

        return null;
    }

    private function collectConfidence(array &$confidences, array $field): void
    {
        $confidence = data_get($field, 'ValueDetection.Confidence');

        if (is_numeric($confidence)) {
            $confidences[] = max(0, min(100, (float) $confidence));
        }
    }
}
