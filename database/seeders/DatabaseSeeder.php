<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\Material;
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
            'is_admin' => true,
        ]);

        $materials = collect([
            ['Cement 42.5R 50kg', 'Cement & Concrete', 'bag', 5800],
            ['River sand', 'Aggregates', 'ton', 18000],
            ['Gravel 5/15', 'Aggregates', 'ton', 21000],
            ['Concrete block 15cm', 'Blocks & Bricks', 'piece', 450],
            ['Concrete block 20cm', 'Blocks & Bricks', 'piece', 550],
            ['Rebar 8mm', 'Steel & Rebar', 'length', 2500],
            ['Rebar 12mm', 'Steel & Rebar', 'length', 4200],
            ['Timber plank 4m', 'Timber & Formwork', 'piece', 3500],
            ['PVC pipe 110mm', 'Plumbing', 'length', 6500],
            ['Electrical cable 2.5mm', 'Electrical', 'roll', 24500],
            ['Emulsion paint 20L', 'Paint & Finishes', 'bucket', 32000],
            ['Nails 50kg carton', 'Tools & Equipment', 'carton', 28500],
            ['Truck delivery', 'Transport', 'trip', 45000],
        ])->mapWithKeys(fn (array $item) => [
            $item[0] => Material::create([
                'name' => $item[0],
                'category' => $item[1],
                'unit' => $item[2],
                'default_unit_price' => $item[3],
                'is_active' => true,
            ]),
        ]);

        $duplex = SiteProject::create([
            'user_id' => $user->id,
            'name' => 'Bonamoussadi villa phase 1',
            'location' => 'Douala, Littoral',
            'client_name' => 'Internal build',
            'budget' => 18500000,
            'start_date' => now()->subMonths(2)->toDateString(),
            'status' => 'active',
        ]);

        $renovation = SiteProject::create([
            'user_id' => $user->id,
            'name' => 'Bastos apartment renovation',
            'location' => 'Yaounde, Centre',
            'client_name' => 'Private client',
            'budget' => 7200000,
            'start_date' => now()->subMonth()->toDateString(),
            'status' => 'planning',
        ]);

        collect([
            [$duplex, 'Cement 42.5R 50kg', 'Quincaillerie Akwa', 120.0, 'POS', 'paid', now()->subDays(3)],
            [$duplex, 'River sand', 'Depot Makepe', 18.5, 'Bank transfer', 'paid', now()->subDays(8)],
            [$duplex, 'Rebar 12mm', 'Acier Douala', 72.0, 'POS', 'pending', now()->subDays(12)],
            [$renovation, 'PVC pipe 110mm', 'Plomberie Mvog-Ada', 16.0, 'Cash', 'paid', now()->subDays(5)],
            [$renovation, 'Emulsion paint 20L', 'Peinture Bastos', 12.0, 'POS', 'reconciled', now()->subDays(15)],
        ])->each(function (array $item) use ($user, $materials) {
            [$project, $materialName, $vendor, $quantity, $payment, $status, $date] = $item;
            $material = $materials[$materialName];

            Expense::create([
                'user_id' => $user->id,
                'site_project_id' => $project->id,
                'material_id' => $material->id,
                'title' => $material->name,
                'vendor' => $vendor,
                'category' => $material->category,
                'purchase_date' => $date->toDateString(),
                'quantity' => $quantity,
                'unit' => $material->unit,
                'unit_cost' => $material->default_unit_price,
                'total_amount' => $quantity * $material->default_unit_price,
                'payment_method' => $payment,
                'status' => $status,
                'notes' => 'Demo record',
            ]);
        });
    }
}
