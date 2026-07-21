<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RetailEnrollmentPayment extends Model
{
    protected $fillable = [
        'enrollee_id', 'plan_id', 'tx_ref', 'gateway_reference',
        'amount', 'status', 'payment_link', 'response_payload', 'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'response_payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
