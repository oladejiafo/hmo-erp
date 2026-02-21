<?php

namespace App\Models;

use App\Enums\HcpStatus;
use App\Enums\HcpType;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class HealthCareProvider extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId, SoftDeletes;

    protected $table = 'health_care_providers';

    protected $fillable = [
        'branch_id', 'hcp_code', 'name', 'type', 'address', 'city',
        'state', 'lga', 'latitude', 'longitude', 'email', 'phone', 'alt_phone',
        'nhis_accreditation_no', 'tier', 'status', 'performance_score',
        'accredited_at', 'contract_expiry_date', 'notes',
    ];

    protected $casts = [
        'status'                => HcpStatus::class,
        'type'                  => HcpType::class,
        'accredited_at'         => 'date',
        'contract_expiry_date'  => 'date',
        'performance_score'     => 'decimal:2',
        'latitude'              => 'decimal:7',
        'longitude'             => 'decimal:7',
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === HcpStatus::ACTIVE;
    }

    public function isBlacklisted(): bool
    {
        return $this->status === HcpStatus::BLACKLISTED;
    }

    public function canSubmitClaims(): bool
    {
        return $this->status->canSubmitClaims()
            && (! $this->contract_expiry_date || $this->contract_expiry_date->isFuture());
    }

    public function updatePerformanceScore(float $score): void
    {
        $this->update(['performance_score' => round($score, 2)]);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', HcpStatus::ACTIVE->value);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByTier($query, string $tier)
    {
        return $query->where('tier', $tier);
    }

    public function scopeByState($query, string $state)
    {
        return $query->where('state', $state);
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tariffs(): HasMany
    {
        return $this->hasMany(HcpTariff::class, 'hcp_id');
    }

    public function activeTariffs(): HasMany
    {
        return $this->hasMany(HcpTariff::class, 'hcp_id')
                    ->where('is_active', true)
                    ->where(fn ($q) => $q->whereNull('effective_to')->orWhere('effective_to', '>=', now()));
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(HcpContract::class, 'hcp_id');
    }

    public function activeContract(): HasOne
    {
        return $this->hasOne(HcpContract::class, 'hcp_id')
                    ->where('status', 'active')
                    ->latest('start_date');
    }

    public function bankDetails(): HasMany
    {
        return $this->hasMany(HcpBankDetail::class, 'hcp_id');
    }

    public function activeBankDetail(): HasOne
    {
        return $this->hasOne(HcpBankDetail::class, 'hcp_id')->where('is_active', true);
    }

    public function performanceScores(): HasMany
    {
        return $this->hasMany(HcpPerformanceScore::class, 'hcp_id');
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class, 'hcp_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ProviderPayment::class, 'hcp_id');
    }

    public function enrollees(): HasMany
    {
        return $this->hasMany(Enrollee::class, 'primary_hcp_id');
    }
}