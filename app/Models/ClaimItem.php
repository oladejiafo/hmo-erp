<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClaimItem extends Model
{
    protected $table = 'claim_items';

    protected $fillable = [
        'claim_id',
        'tariff_id',
        'service_code',
        'service_name',
        'category',
        'quantity',
        'unit_price_claimed',
        'total_price_claimed',
        'tariff_unit_price',
        'amount_approved',
        'status',
        'adjustment_reason',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price_claimed' => 'decimal:2',
        'total_price_claimed' => 'decimal:2',
        'tariff_unit_price' => 'decimal:2',
        'amount_approved' => 'decimal:2',
    ];

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function tariff(): BelongsTo
    {
        return $this->belongsTo(HcpTariff::class, 'tariff_id');
    }
}