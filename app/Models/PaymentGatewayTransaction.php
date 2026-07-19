<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentGatewayTransaction extends Model
{
    protected $fillable = [
        'batch_id', 'provider_payment_id', 'gateway', 'reference', 'gateway_reference',
        'status', 'amount', 'request_payload', 'response_payload', 'failure_reason',
        'initiated_at', 'confirmed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'request_payload' => 'array',
        'response_payload' => 'array',
        'initiated_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(PaymentBatch::class, 'batch_id');
    }

    public function providerPayment(): BelongsTo
    {
        return $this->belongsTo(ProviderPayment::class);
    }
}
