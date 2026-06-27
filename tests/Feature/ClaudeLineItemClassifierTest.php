<?php

namespace Tests\Feature;

use App\Services\ClaudeLineItemClassifier;
use Mockery;
use Tests\TestCase;

class ClaudeLineItemClassifierTest extends TestCase
{
    public function test_it_returns_empty_matches_when_not_configured(): void
    {
        config()->set('services.anthropic.key', null);

        $items = [
            ['description' => 'CIMENT 42.5', 'quantity' => 10, 'unit_price' => 7000, 'total' => 70000],
        ];

        $result = (new ClaudeLineItemClassifier)->classify($items, [
            ['id' => 5, 'name' => 'Cement 42.5', 'category' => 'Cement', 'unit' => 'bag'],
        ]);

        $this->assertCount(1, $result);
        $this->assertSame('CIMENT 42.5', $result[0]['description']);
        $this->assertNull($result[0]['material_id']);
        $this->assertNull($result[0]['match_confidence']);
    }

    public function test_it_merges_classifications_onto_items(): void
    {
        config()->set('services.anthropic.key', 'test-key');

        $catalog = [
            ['id' => 5, 'name' => 'Cement 42.5', 'category' => 'Cement', 'unit' => 'bag'],
        ];

        $items = [
            ['description' => 'CIMENT 42.5', 'quantity' => 10, 'unit_price' => 7000, 'total' => 70000],
            ['description' => 'Mystery thing', 'quantity' => 1, 'unit_price' => 500, 'total' => 500],
            ['description' => 'grey powder', 'quantity' => 2, 'unit_price' => 7000, 'total' => 14000],
        ];

        $classifier = Mockery::mock(ClaudeLineItemClassifier::class)
            ->makePartial()
            ->shouldAllowMockingProtectedMethods();

        $classifier->shouldReceive('requestClassification')->once()->andReturn([
            0 => ['index' => 0, 'material_id' => 5, 'canonical_name' => 'Cement 42.5', 'normalized_unit' => 'Bag', 'confidence' => 0.95],
            1 => ['index' => 1, 'material_id' => 999, 'canonical_name' => 'Mystery', 'normalized_unit' => 'crate', 'confidence' => 0.9],
            2 => ['index' => 2, 'material_id' => 5, 'canonical_name' => 'Maybe cement', 'normalized_unit' => 'bag', 'confidence' => 0.2],
        ]);

        $result = $classifier->classify($items, $catalog);

        // Confident, valid match — kept and normalised (unit lower-cased).
        $this->assertSame('CIMENT 42.5', $result[0]['description']);
        $this->assertSame(5, $result[0]['material_id']);
        $this->assertSame('Cement 42.5', $result[0]['material_name']);
        $this->assertSame('bag', $result[0]['normalized_unit']);
        $this->assertSame(0.95, $result[0]['match_confidence']);

        // Material id not in the catalogue — discarded, but the suggestion is kept.
        $this->assertNull($result[1]['material_id']);
        $this->assertSame('Mystery', $result[1]['canonical_name']);
        $this->assertNull($result[1]['normalized_unit']); // "crate" is not an allowed unit

        // Below the confidence threshold — match discarded.
        $this->assertNull($result[2]['material_id']);
        $this->assertSame(0.2, $result[2]['match_confidence']);
    }

    public function test_configured_reflects_anthropic_key(): void
    {
        $classifier = new ClaudeLineItemClassifier;

        config()->set('services.anthropic.key', null);
        $this->assertFalse($classifier->isConfigured());

        config()->set('services.anthropic.key', 'test-key');
        $this->assertTrue($classifier->isConfigured());
    }
}
