<?php

namespace App\Services;

use Anthropic\Client;
use App\Models\Expense;
use App\Models\User;

/**
 * Answers natural-language questions about a user's uploaded receipts and
 * expenses using Claude. The data Amazon Textract extracted from each receipt
 * (vendor, date, totals, line items, receipt number, ...) is already stored on
 * the expense row; this service serialises a compact view of it and asks Claude
 * to answer strictly from that data.
 */
class ReceiptQueryService
{
    /** Hard cap on how many records are sent to Claude per question. */
    private const MAX_RECORDS = 400;

    public function isConfigured(): bool
    {
        return filled(config('services.anthropic.key'));
    }

    /**
     * @return array{answer: string, recordCount: int}
     */
    public function answer(User $user, string $question, ?Client $client = null): array
    {
        $records = $this->records($user);

        if ($records === []) {
            return [
                'answer' => "There are no receipts or expenses on record yet, so there is nothing to query. Upload a receipt first.",
                'recordCount' => 0,
            ];
        }

        $client ??= new Client(apiKey: (string) config('services.anthropic.key'));

        $message = $client->messages->create(
            maxTokens: 1500,
            model: (string) config('services.anthropic.model', 'claude-opus-4-8'),
            system: $this->systemPrompt($records),
            messages: [[
                'role' => 'user',
                'content' => $question,
            ]],
        );

        return [
            'answer' => $this->extractText($message),
            'recordCount' => count($records),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function records(User $user): array
    {
        return Expense::query()
            ->where('user_id', $user->id)
            ->with('siteProject:id,name')
            ->latest('purchase_date')
            ->latest()
            ->limit(self::MAX_RECORDS)
            ->get()
            ->map(fn (Expense $expense): array => array_filter([
                'type' => $expense->entry_type,
                'date' => $expense->purchase_date?->toDateString(),
                'vendor' => $expense->vendor,
                'item' => $expense->title,
                'category' => $expense->category,
                'project' => $expense->siteProject?->name,
                'quantity' => $expense->quantity !== null ? (float) $expense->quantity : null,
                'unit' => $expense->unit,
                'unit_cost' => $expense->unit_cost !== null ? (float) $expense->unit_cost : null,
                'total' => (float) $expense->total_amount,
                'currency' => $expense->receipt_currency ?: 'XAF',
                'payment_method' => $expense->payment_method,
                'status' => $expense->status,
                'receipt_number' => $expense->receipt_number,
                'tax' => $expense->receipt_tax_amount !== null ? (float) $expense->receipt_tax_amount : null,
                'line_items' => $this->lineItems($expense),
                'notes' => $expense->notes,
            ], static fn ($value) => $value !== null && $value !== '' && $value !== []))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function lineItems(Expense $expense): array
    {
        $items = $expense->receipt_items ?? [];

        if (! is_array($items)) {
            return [];
        }

        return array_values(array_map(static fn (array $item): array => array_filter([
            'description' => $item['description'] ?? null,
            'quantity' => $item['quantity'] ?? null,
            'unit_price' => $item['unit_price'] ?? null,
            'total' => $item['total'] ?? null,
            'material' => $item['material_name'] ?? null,
        ], static fn ($value) => $value !== null && $value !== ''), array_filter($items, 'is_array')));
    }

    /**
     * @param  list<array<string, mixed>>  $records
     */
    private function systemPrompt(array $records): string
    {
        $count = count($records);
        $data = json_encode($records, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
        You answer questions about construction-material purchases for a building site in Cameroon. Amounts are in FCFA (XAF) unless a record's currency says otherwise.

        You are given {$count} expense/receipt records as JSON. Each record is one purchase: its vendor, date, category, totals, payment method, status, and — where a receipt was scanned — its line items and receipt number. Records of type "receipt" were uploaded as a receipt image; "expense" records were entered as full purchases.

        Rules:
        - Answer ONLY from the records below. Do not invent vendors, amounts, dates, or items.
        - If the records do not contain enough information to answer, say so plainly.
        - When you total or compare amounts, add carefully and show the figure with its currency (e.g. "1 250 000 FCFA").
        - Keep answers short and direct. Use a short list or a single total line when that is clearest.
        - Dates are ISO (YYYY-MM-DD). "Recent" or "latest" refers to the most recent dates present.

        Records:
        {$data}
        PROMPT;
    }

    private function extractText(object $message): string
    {
        $text = '';

        foreach ($message->content as $block) {
            if (($block->type ?? null) === 'text') {
                $text .= $block->text ?? '';
            }
        }

        $text = trim($text);

        return $text !== '' ? $text : "I could not produce an answer for that. Try rephrasing the question.";
    }
}
