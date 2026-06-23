<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\SiteProject;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $duplex = SiteProject::create([
            'user_id' => $user->id,
            'name' => 'Lekki duplex phase 1',
            'location' => 'Lekki, Lagos',
            'client_name' => 'Internal build',
            'budget' => 18500000,
            'start_date' => now()->subMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $renovation = SiteProject::create([
            'user_id' => $user->id,
            'name' => 'Ikoyi apartment renovation',
            'location' => 'Ikoyi, Lagos',
            'client_name' => 'Private client',
            'budget' => 7200000,
            'start_date' => now()->subMonth()->toDateString(),
            'status' => 'planning',
        ]);

        collect([
            [$duplex, 'Cement delivery', 'Dangote depot', 'Cement & Concrete', 120, 'bags', 9200, 'POS', 'paid', now()->subDays(3)],
            [$duplex, 'Sharp sand', 'Ajah material yard', 'Cement & Concrete', 18, 'tons', 18500, 'Bank transfer', 'paid', now()->subDays(8)],
            [$duplex, '16mm rebar', 'Steel hub', 'Steel & Rebar', 72, 'lengths', 7800, 'POS', 'pending', now()->subDays(12)],
            [$renovation, 'PVC plumbing fittings', 'Mainland pipes', 'Plumbing', 1, 'lot', 285000, 'Cash', 'paid', now()->subDays(5)],
            [$renovation, 'Emulsion paint', 'Color house', 'Paint & Finishes', 12, 'buckets', 33500, 'POS', 'reconciled', now()->subDays(15)],
        ])->each(function (array $item) use ($user) {
            [$project, $title, $vendor, $category, $quantity, $unit, $unitCost, $payment, $status, $date] = $item;

            Expense::create([
                'user_id' => $user->id,
                'site_project_id' => $project->id,
                'title' => $title,
                'vendor' => $vendor,
                'category' => $category,
                'purchase_date' => $date->toDateString(),
                'quantity' => $quantity,
                'unit' => $unit,
                'unit_cost' => $unitCost,
                'total_amount' => $quantity * $unitCost,
                'payment_method' => $payment,
                'status' => $status,
                'notes' => 'Demo record',
            ]);
        });
    }
}
