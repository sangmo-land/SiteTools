<?php

namespace App\Services;

use Anthropic\Client;
use Throwable;

/**
 * Matches scanned receipt line items to catalogue materials and normalises
 * their units using Claude, so that prices recorded from different vendors and
 * receipt wordings (e.g. "CIMENT 42.5", "Cement 50kg", "Ciment Portland") can
 * be compared against the same canonical material for price analysis.
 *
 * Best-effort by design: when Anthropic is not configured, or any error
 * occurs, the items are returned unchanged with empty matches so receipt
 * scanning keeps working without it.
 */
class ClaudeLineItemClassifier
{
    /**
     * Minimum confidence before a catalogue match is trusted. Below this the
     * model's suggestion is discarded so low-quality guesses don't pollute the
     * price history.
     */
    private const MATCH_THRESHOLD = 0.5;

    private const NORMALIZED_UNITS = [
        'bag', 'kg', 'ton', 'piece', 'bar', 'litre', 'sheet', 'roll', 'm', 'm2', 'm3',
    ];

    public function isConfigured(): bool
    {
        return filled(config('services.anthropic.key'));
    }

    /**
     * @param  list<array<string, mixed>>  $items  Receipt line items ({description, quantity, unit_price, total}).
     * @param  list<array<string, mixed>>  $catalog  Active materials ({id, name, category, unit}).
     * @return list<array<string, mixed>>
     */
    public function classify(array $items, array $catalog, ?Client $client = null): array
    {
        if ($items === [] || $catalog === [] || ! $this->isConfigured()) {
            return $this->withoutMatches($items);
        }

        try {
            $classifications = $this->requestClassification($items, $catalog, $client);
        } catch (Throwable $exception) {
            report($exception);

            return $this->withoutMatches($items);
        }

        return $this->merge($items, $catalog, $classifications);
    }

    /**
     * @return array<int, array<string, mixed>> Keyed by item index.
     */
    protected function requestClassification(array $items, array $catalog, ?Client $client): array
    {
        $client ??= new Client(apiKey: (string) config('services.anthropic.key'));

        $message = $client->messages->create(
            maxTokens: 2000,
            model: (string) config('services.anthropic.model', 'claude-opus-4-8'),
            system: $this->systemPrompt(),
            messages: [[
                'role' => 'user',
                'content' => $this->userPrompt($items, $catalog),
            ]],
        );

        return $this->decode($message);
    }

    private function systemPrompt(): string
    {
        $units = implode(', ', self::NORMALIZED_UNITS);

        return <<<PROMPT
        You normalise line items scanned from construction-material receipts for a building site in Cameroon (prices in FCFA).

        For every line item, decide which single catalogue material it refers to and normalise its unit of sale.

        Rules:
        - Match by meaning, not exact wording. "CIMENT 42.5", "Cement 50kg", and "Ciment Portland" are all the catalogue's cement entry. Watch for French and abbreviated supplier wording.
        - Use material_id null when no catalogue material is a reasonable match. Never invent an id.
        - canonical_name is the catalogue material's name when matched, otherwise a short clean label for the item.
        - normalized_unit must be one of: {$units}. Pick the singular unit the item is sold by.
        - confidence is 0 to 1 for how sure you are of the material_id match.
        - Preserve the given index for every item.

        Respond with ONLY a JSON object, no prose, in exactly this shape:
        {"classifications":[{"index":0,"material_id":12,"canonical_name":"Cement 42.5","normalized_unit":"bag","confidence":0.93}]}
        PROMPT;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  list<array<string, mixed>>  $catalog
     */
    private function userPrompt(array $items, array $catalog): string
    {
        $catalogJson = json_encode(array_map(static fn (array $material): array => [
            'id' => $material['id'] ?? null,
            'name' => $material['name'] ?? null,
            'category' => $material['category'] ?? null,
            'unit' => $material['unit'] ?? null,
        ], $catalog), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $itemsJson = json_encode($this->indexedItems($items), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return "Catalogue materials:\n{$catalogJson}\n\nReceipt line items:\n{$itemsJson}";
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function indexedItems(array $items): array
    {
        $indexed = [];

        foreach (array_values($items) as $index => $item) {
            $indexed[] = [
                'index' => $index,
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'] ?? null,
                'unit_price' => $item['unit_price'] ?? null,
                'total' => $item['total'] ?? null,
            ];
        }

        return $indexed;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function decode(object $message): array
    {
        $text = '';

        foreach ($message->content as $block) {
            if (($block->type ?? null) === 'text') {
                $text .= $block->text ?? '';
            }
        }

        $json = $this->extractJson($text);
        $decoded = $json === null ? null : json_decode($json, true);

        if (! is_array($decoded) || ! isset($decoded['classifications']) || ! is_array($decoded['classifications'])) {
            return [];
        }

        $byIndex = [];

        foreach ($decoded['classifications'] as $entry) {
            if (is_array($entry) && isset($entry['index']) && is_numeric($entry['index'])) {
                $byIndex[(int) $entry['index']] = $entry;
            }
        }

        return $byIndex;
    }

    private function extractJson(string $text): ?string
    {
        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $end < $start) {
            return null;
        }

        return substr($text, $start, $end - $start + 1);
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  list<array<string, mixed>>  $catalog
     * @param  array<int, array<string, mixed>>  $classifications
     * @return list<array<string, mixed>>
     */
    private function merge(array $items, array $catalog, array $classifications): array
    {
        $catalogById = [];

        foreach ($catalog as $material) {
            if (isset($material['id'])) {
                $catalogById[(int) $material['id']] = $material;
            }
        }

        $merged = [];

        foreach (array_values($items) as $index => $item) {
            $entry = $classifications[$index] ?? null;
            $merged[] = array_merge($item, $this->matchFor($entry, $catalogById));
        }

        return $merged;
    }

    /**
     * @param  array<string, mixed>|null  $entry
     * @param  array<int, array<string, mixed>>  $catalogById
     * @return array<string, mixed>
     */
    private function matchFor(?array $entry, array $catalogById): array
    {
        if ($entry === null) {
            return $this->emptyMatch();
        }

        $confidence = is_numeric($entry['confidence'] ?? null)
            ? max(0.0, min(1.0, (float) $entry['confidence']))
            : null;

        $materialId = isset($entry['material_id']) && is_numeric($entry['material_id'])
            ? (int) $entry['material_id']
            : null;

        $matched = $materialId !== null
            && isset($catalogById[$materialId])
            && $confidence !== null
            && $confidence >= self::MATCH_THRESHOLD;

        return [
            'material_id' => $matched ? $materialId : null,
            'material_name' => $matched ? ($catalogById[$materialId]['name'] ?? null) : null,
            'canonical_name' => is_string($entry['canonical_name'] ?? null) ? $entry['canonical_name'] : null,
            'normalized_unit' => $this->normalizedUnit($entry['normalized_unit'] ?? null),
            'match_confidence' => $confidence,
        ];
    }

    private function normalizedUnit(mixed $unit): ?string
    {
        if (! is_string($unit)) {
            return null;
        }

        $unit = strtolower(trim($unit));

        return in_array($unit, self::NORMALIZED_UNITS, true) ? $unit : null;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function withoutMatches(array $items): array
    {
        return array_map(fn (array $item): array => array_merge($item, $this->emptyMatch()), array_values($items));
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyMatch(): array
    {
        return [
            'material_id' => null,
            'material_name' => null,
            'canonical_name' => null,
            'normalized_unit' => null,
            'match_confidence' => null,
        ];
    }
}
