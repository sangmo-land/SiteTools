<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('receipt_number', 100)->nullable()->after('receipt_original_name');
            $table->string('receipt_currency', 10)->nullable()->after('receipt_number');
            $table->decimal('receipt_subtotal', 14, 2)->nullable()->after('receipt_currency');
            $table->decimal('receipt_tax_amount', 14, 2)->nullable()->after('receipt_subtotal');
            $table->json('receipt_items')->nullable()->after('receipt_tax_amount');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn([
                'receipt_number',
                'receipt_currency',
                'receipt_subtotal',
                'receipt_tax_amount',
                'receipt_items',
            ]);
        });
    }
};
