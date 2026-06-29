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

    /** Hard caps on the table Claude may return, so a download stays sane. */
    private const MAX_TABLE_COLUMNS = 8;

    private const MAX_TABLE_ROWS = 500;

    public function isConfigured(): bool
    {
        return filled(config('services.anthropic.key'));
    }

    /**
     * @return array{answer: string, recordCount: int, table: array{title: string, columns: list<string>, rows: list<list<string>>}|null}
     */
    public function answer(User $user, string $question, ?Client $client = null): array
    {
        $records = $this->records($user);

        if ($records === []) {
            return [
                'answer' => 'There are no receipts or expenses on record yet, so there is nothing to query. Upload a receipt first.',
                'recordCount' => 0,
                'table' => null,
            ];
        }

        $message = $this->requestAnswer($question, $records, $client);

        [$answer, $table] = $this->parse($message);

        return [
            'answer' => $answer,
            'recordCount' => count($records),
            'table' => $table,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $records
     */
    protected function requestAnswer(string $question, array $records, ?Client $client): object
    {
        $client ??= new Client(apiKey: (string) config('services.anthropic.key'));

        return $client->messages->create(
            maxTokens: 2500,
            model: (string) config('services.anthropic.model', 'claude-opus-4-8'),
            system: $this->systemPrompt($records),
            messages: [[
                'role' => 'user',
                'content' => $question,
            ]],
        );
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
        $items = $expense->line_items ?: ($expense->receipt_items ?? []);

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

        $maxCols = self::MAX_TABLE_COLUMNS;

        return <<<PROMPT
        You answer questions about construction-material purchases for a building site in Cameroon. Amounts are in FCFA (XAF) unless a record's currency says otherwise.

        You are given {$count} expense/receipt records as JSON. Each record is one purchase: its vendor, date, category, totals, payment method, status, and — where a receipt was scanned — its line items and receipt number. Records of type "receipt" were uploaded as a receipt image; "expense" records were entered as full purchases.

        Data rules:
        - Answer ONLY from the records below. Do not invent vendors, amounts, dates, or items.
        - If the records do not contain enough information to answer, say so plainly.
        - When you total or compare amounts, add carefully and show the figure with its currency (e.g. "1 250 000 FCFA").
        - Keep the answer short and direct. Dates are ISO (YYYY-MM-DD); "recent" or "latest" refers to the most recent dates present.

        Respond with ONLY a JSON object (no prose, no markdown code fences) in exactly this shape:
        {"answer": "<concise natural-language answer>", "table": null}

        Set "table" to null for simple questions. When the question asks to list, break down, compare, or export several records — or whenever a table would make the answer clearer and downloadable — provide it instead:
        "table": {"title": "<short title>", "columns": ["Date", "Vendor", "Total"], "rows": [["2026-06-01", "Quincaillerie X", "1 250 000 FCFA"]]}

        Table rules:
        - Every row must have exactly as many values as "columns"; use at most {$maxCols} columns.
        - All values are plain strings. Format money with its currency. Use "" for missing values, never null.
        - Add a final totals row when amounts are summed (e.g. ["Total", "", "3 400 000 FCFA"]).
        - The "answer" field is always required, even when a table is present — summarise the table in one or two sentences.

        Records:
        {$data}
        PROMPT;
    }

    /**
     * Decode Claude's JSON reply into the answer text and an optional table.
     * Falls back to treating the whole reply as the answer if it is not the
     * expected JSON, so the assistant keeps working even on a malformed reply.
     *
     * @return array{0: string, 1: array{title: string, columns: list<string>, rows: list<list<string>>}|null}
     */
    private function parse(object $message): array
    {
        $text = $this->rawText($message);
        $decoded = $this->decodeJson($text);

        if (! is_array($decoded)) {
            return [
                $text !== '' ? $text : 'I could not produce an answer for that. Try rephrasing the question.',
                null,
            ];
        }

        $answer = is_string($decoded['answer'] ?? null) ? trim($decoded['answer']) : '';

        if ($answer === '') {
            $answer = 'I could not produce an answer for that. Try rephrasing the question.';
        }

        return [$answer, $this->sanitizeTable($decoded['table'] ?? null)];
    }

    private function rawText(object $message): string
    {
        $text = '';

        foreach ($message->content as $block) {
            if (($block->type ?? null) === 'text') {
                $text .= $block->text ?? '';
            }
        }

        return trim($text);
    }

    private function decodeJson(string $text): mixed
    {
        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $end < $start) {
            return null;
        }

        return json_decode(substr($text, $start, $end - $start + 1), true);
    }

    /**
     * @return array{title: string, columns: list<string>, rows: list<list<string>>}|null
     */
    private function sanitizeTable(mixed $table): ?array
    {
        if (! is_array($table)) {
            return null;
        }

        $columns = array_values(array_filter(
            array_map($this->toCell(...), is_array($table['columns'] ?? null) ? $table['columns'] : []),
            static fn (string $column): bool => $column !== '',
        ));
        $columns = array_slice($columns, 0, self::MAX_TABLE_COLUMNS);

        if ($columns === []) {
            return null;
        }

        $count = count($columns);
        $rows = [];

        foreach (is_array($table['rows'] ?? null) ? $table['rows'] : [] as $row) {
            if (! is_array($row)) {
                continue;
            }

            $cells = array_slice(array_map($this->toCell(...), array_values($row)), 0, $count);
            $rows[] = array_pad($cells, $count, '');

            if (count($rows) >= self::MAX_TABLE_ROWS) {
                break;
            }
        }

        if ($rows === []) {
            return null;
        }

        $title = $this->toCell($table['title'] ?? '');

        return [
            'title' => $title !== '' ? $title : 'Receipt report',
            'columns' => $columns,
            'rows' => $rows,
        ];
    }

    private function toCell(mixed $value): string
    {
        if (is_string($value)) {
            return trim($value);
        }

        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return '';
    }
}
