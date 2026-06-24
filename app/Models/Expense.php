<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'entry_type',
        'site_project_id',
        'material_id',
        'title',
        'vendor',
        'category',
        'purchase_date',
        'quantity',
        'unit',
        'unit_cost',
        'total_amount',
        'payment_method',
        'status',
        'receipt_path',
        'receipt_original_name',
        'receipt_text',
        'receipt_confidence',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'quantity' => 'decimal:1',
            'unit_cost' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'receipt_confidence' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function siteProject(): BelongsTo
    {
        return $this->belongsTo(SiteProject::class);
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
