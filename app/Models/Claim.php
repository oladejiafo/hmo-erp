<?php

namespace App\Models;

use App\Enums\ClaimStatus;
use App\Enums\ClaimType;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Claim extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId, SoftDeletes;

    protected $fillable = [
        'branch_id', 'claim_number', 'hcp_id', 'enrollee_id', 'dependent_id',
        'service_date', 'submission_date', 'admission_date', 'discharge_date',
        'diagnosis_codes', 'diagnosis_description',
        'total_amount_claimed', 'total_amount_approved', 'total_amount_paid',
        'status', 'claim_type', 'risk_score',
        'is_pre_authorized', 'pre_auth_code',
        'reviewer_notes', 'rejection_reason',
        'auto_validated_at', 'approved_at', 'rejected_at', 'paid_at',
    ];

    protected $casts = [
        'status'              => ClaimStatus::class,
        'claim_type'          => ClaimType::class,
        'diagnosis_codes'     => 'array',
        'service_date'        => 'date',
        'submission_date'     => 'date',
        'admission_date'      => 'date',
        'discharge_date'      => 'date',
        'is_pre_authorized'   => 'boolean',
        'risk_score'          => 'decimal:2',
        'total_amount_claimed' => 'decimal:2',
        'total_amount_approved' => 'decimal:2',
        'total_amount_paid'   => 'decimal:2',
        'auto_validated_at'   => 'datetime',
        'approved_at'         => 'datetime',
        'rejected_at'         => 'datetime',
        'paid_at'             => 'datetime',
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isEditable(): bool
    {
        return $this->status === ClaimStatus::SUBMITTED;
    }

    public function isHighRisk(): bool
    {
        return $this->risk_score >= config('fraud.auto_quarantine_threshold', 70);
    }

    public function isHighValue(): bool
    {
        return $this->total_amount_claimed >= config('hmo.claim_escalation_amount', 500000);
    }

    public function requiresSupervisorReview(): bool
    {
        return $this->isHighRisk() || $this->isHighValue();
    }

    public function getDiscrepancyAttribute(): float
    {
        return $this->total_amount_claimed - $this->total_amount_approved;
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeByStatus($query, ClaimStatus|string $status)
    {
        $value = $status instanceof ClaimStatus ? $status->value : $status;
        return $query->where('status', $value);
    }

    public function scopePending($query)
    {
        return $query->whereNotIn('status', [
            ClaimStatus::PAID->value,
            ClaimStatus::REJECTED->value,
            ClaimStatus::REVERSED->value,
        ]);
    }

    public function scopeHighRisk($query)
    {
        return $query->where('risk_score', '>=', config('fraud.auto_quarantine_threshold', 70));
    }

    public function scopeForHcp($query, int $hcpId)
    {
        return $query->where('hcp_id', $hcpId);
    }

    public function scopeForEnrollee($query, int $enrolleeId)
    {
        return $query->where('enrollee_id', $enrolleeId);
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function dependent(): BelongsTo
    {
        return $this->belongsTo(Dependent::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ClaimItem::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ClaimDocument::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(ClaimStatusLog::class)->orderBy('created_at');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ClaimAssignment::class);
    }

    public function activeAssignment(): HasOne
    {
        return $this->hasOne(ClaimAssignment::class)->where('is_active', true)->latest();
    }

    public function fraudFlags(): HasMany
    {
        return $this->hasMany(FraudFlag::class);
    }

    public function openFraudFlags(): HasMany
    {
        return $this->hasMany(FraudFlag::class)->where('status', 'open');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(ProviderPayment::class);
    }
}