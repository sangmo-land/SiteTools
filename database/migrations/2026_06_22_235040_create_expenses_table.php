<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('site_project_id')->nullable()->constrained('site_projects')->nullOnDelete();
            $table->string('title');
            $table->string('vendor')->nullable();
            $table->string('category', 80)->index();
            $table->date('purchase_date')->index();
            $table->decimal('quantity', 12, 3)->nullable();
            $table->string('unit', 30)->nullable();
            $table->decimal('unit_cost', 14, 2)->nullable();
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->string('payment_method', 50)->default('POS');
            $table->string('status', 30)->default('paid');
            $table->string('receipt_path')->nullable();
            $table->string('receipt_original_name')->nullable();
            $table->longText('receipt_text')->nullable();
            $table->decimal('receipt_confidence', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'purchase_date']);
            $table->index(['user_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
