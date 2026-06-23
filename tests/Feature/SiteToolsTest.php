<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Material;
use App\Models\SiteProject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
