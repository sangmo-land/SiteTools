<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Material;
use App\Models\SiteProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_site_tool_summary(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('stats')
                ->has('recentExpenses')
                ->has('categoryTotals')
                ->has('monthlyTrend')
                ->has('projects'));
    }

    public function test_user_can_create_project_and_expense(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.projects.store'), [
                'name' => 'Warehouse fit-out',
                'location' => 'Ikeja',
                'budget' => 2500000,
                'start_date' => now()->toDateString(),
                'status' => 'active',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $project = SiteProject::where('user_id', $user->id)->firstOrFail();
        $material = Material::create([
            'name' => 'Cement 42.5R 50kg',
            'category' => 'Cement & Concrete',
            'unit' => 'bag',
            'default_unit_price' => 5800,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->post(route('tools.expenses.store'), [
                'site_project_id' => $project->id,
                'material_id' => $material->id,
                'vendor' => 'Depot 12',
                'purchase_date' => now()->toDateString(),
                'quantity' => 10.5,
                'unit' => 'bag',
                'unit_cost' => 5800,
                'payment_method' => 'POS',
                'status' => 'paid',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('expenses', [
            'user_id' => $user->id,
            'site_project_id' => $project->id,
            'material_id' => $material->id,
            'title' => 'Cement 42.5R 50kg',
            'total_amount' => 60900,
        ]);
    }

    public function test_user_can_upload_a_receipt_without_expense_details(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.receipts.store'), [
                'receipt' => UploadedFile::fake()->image('supplier-receipt.jpg'),
            ])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status', 'Receipt uploaded.')
            ->assertRedirect();

        $receipt = Expense::where('user_id', $user->id)->firstOrFail();

        $this->assertSame('receipt', $receipt->entry_type);
        $this->assertNull($receipt->material_id);
        $this->assertSame('supplier-receipt.jpg', $receipt->receipt_original_name);
        Storage::disk('public')->assertExists($receipt->receipt_path);
    }

    public function test_receipt_only_upload_requires_a_receipt(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.receipts.store'))
            ->assertSessionHasErrors('receipt');

        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_expense_tracker_and_calculators_render(): void
    {
        $user = User::factory()->create();
        $material = Material::create([
            'name' => 'PVC pipe 110mm',
            'category' => 'Plumbing',
            'unit' => 'length',
            'default_unit_price' => 6500,
            'is_active' => true,
        ]);

        Expense::create([
            'user_id' => $user->id,
            'material_id' => $material->id,
            'title' => 'PVC pipes',
            'category' => 'Plumbing',
            'purchase_date' => now()->toDateString(),
            'total_amount' => 120000,
            'payment_method' => 'Cash',
            'status' => 'paid',
        ]);

        $this->actingAs($user)
            ->get(route('tools.expenses'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tools/Expenses')
                ->has('expenses.data', 1)
                ->has('categories')
                ->has('materials', 1)
                ->has('summary'));

        $this->actingAs($user)
            ->get(route('tools.calculators'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tools/Calculators'));
    }

    public function test_user_can_scan_a_receipt_with_openai(): void
    {
        config([
            'services.openai.api_key' => 'test-key',
            'services.openai.base_url' => 'https://api.openai.com/v1',
            'services.openai.receipt_model' => 'gpt-5.4-mini',
        ]);

        Http::fake([
            'api.openai.com/v1/responses' => Http::response([
                'output' => [[
                    'type' => 'message',
                    'content' => [[
                        'type' => 'output_text',
                        'text' => json_encode([
                            'raw_text' => "DEPOT 12\nTOTAL 60,900 FCFA",
                            'vendor' => 'Depot 12',
                            'purchase_date' => '2026-06-20',
                            'total_amount' => 60900,
                            'currency' => 'XAF',
                            'confidence' => 96.5,
                        ]),
                    ]],
                ]],
            ]),
        ]);

        $user = User::factory()->create();
        $receipt = UploadedFile::fake()->image('receipt.jpg');

        $this->actingAs($user)
            ->post(route('tools.expenses.scan-receipt'), [
                'receipt' => $receipt,
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJson([
                'text' => "DEPOT 12\nTOTAL 60,900 FCFA",
                'vendor' => 'Depot 12',
                'purchase_date' => '2026-06-20',
                'total_amount' => 60900,
                'currency' => 'XAF',
                'confidence' => 96.5,
            ]);

        Http::assertSent(function (ClientRequest $request): bool {
            return $request->url() === 'https://api.openai.com/v1/responses'
                && $request->hasHeader('Authorization', 'Bearer test-key')
                && $request['model'] === 'gpt-5.4-mini'
                && $request['store'] === false
                && data_get($request->data(), 'input.0.content.1.type') === 'input_image'
                && data_get($request->data(), 'text.format.type') === 'json_schema';
        });
    }

    public function test_receipt_scanner_requires_an_openai_api_key(): void
    {
        config(['services.openai.api_key' => null]);
        Http::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.expenses.scan-receipt'), [
                'receipt' => UploadedFile::fake()->image('receipt.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(503)
            ->assertJson([
                'message' => 'AI receipt scanning is not configured yet.',
            ]);

        Http::assertNothingSent();
    }
}
