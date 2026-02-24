<?php

namespace App\Models;

use App\Enums\PaymentBatchStatus;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// NOTE: CapitationRun is in the same namespace — no explicit use needed.

class PaymentBatch extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId;

    protected $fillable = [
        'branch_id', 'batch_number', 'batch_type', 'description', 'total_amount',
        'claim_count', 'provider_count', 'status', 'created_by',
        'approved_by', 'approved_at', 'processed_at',
        'bank_export_path', 'bank_reference', 'failure_reason',
        'capitation_run_id',
    ];

    protected $casts = [
        'status'       => PaymentBatchStatus::class,
        'total_amount' => 'decimal:2',
        'approved_at'  => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ProviderPayment::class, 'batch_id');
    }

    public function capitationRun(): BelongsTo
    {
        return $this->belongsTo(CapitationRun::class, 'capitation_run_id');
    }

    public function scopeByStatus($query, PaymentBatchStatus|string $status)
    {
        $value = $status instanceof PaymentBatchStatus ? $status->value : $status;
        return $query->where('status', $value);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('batch_type', $type);
    }
}