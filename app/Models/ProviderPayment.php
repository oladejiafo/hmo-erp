<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderPayment extends Model
{
    protected $fillable = [
        'batch_id',
        'hcp_id',
        'claim_id',
        'amount',
        'status',
        'paid_at',
        'payment_reference',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PaymentBatch::class, 'batch_id');
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function gatewayTransactions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PaymentGatewayTransaction::class, 'provider_payment_id');
    }
}