<?php

namespace Tests\Feature;

use App\Models\Expense;
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

        $this->actingAs($user)
            ->post(route('tools.expenses.store'), [
                'site_project_id' => $project->id,
                'title' => 'Cement',
                'vendor' => 'Depot 12',
                'category' => 'Cement & Concrete',
                'purchase_date' => now()->toDateString(),
                'quantity' => 10,
                'unit' => 'bags',
                'unit_cost' => 9500,
                'payment_method' => 'POS',
                'status' => 'paid',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('expenses', [
            'user_id' => $user->id,
            'site_project_id' => $project->id,
            'title' => 'Cement',
            'total_amount' => 95000,
        ]);
    }

    public function test_expense_tracker_and_calculators_render(): void
    {
        $user = User::factory()->create();

        Expense::create([
            'user_id' => $user->id,
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
                ->has('summary'));

        $this->actingAs($user)
            ->get(route('tools.calculators'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tools/Calculators'));
    }
}
