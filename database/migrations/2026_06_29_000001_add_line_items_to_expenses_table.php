<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Itemised lines for a manually recorded purchase: each entry is
            // {material_id, material_name, description, category, quantity,
            // unit, unit_price, total}. A purchase can hold many of these.
            $table->json('line_items')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('line_items');
        });
    }
};
