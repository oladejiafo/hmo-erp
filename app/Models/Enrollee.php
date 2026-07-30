<?php

namespace App\Models;

use App\Enums\EnrolleeStatus;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Plan;

class Enrollee extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId, SoftDeletes;

    protected $fillable = [
        'branch_id', 'corporate_id','user_id', 'plan_id', 'enrollee_id',
        'first_name', 'last_name', 'middle_name', 'date_of_birth', 'gender',
        'phone', 'email', 'address', 'state_of_residence', 'lga',
        'photo_path', 'nin', 'staff_id', 'primary_hcp_id',
        'status', 'enrollment_date', 'expiry_date', 'benefit_balance',
        'consent_given_at', 'consent_version',
    ];

    protected $casts = [
        'status'          => EnrolleeStatus::class,
        'date_of_birth'   => 'date',
        'enrollment_date' => 'date',
        'expiry_date'     => 'date',
        'benefit_balance' => 'decimal:2',
        'nin'             => 'encrypted', 
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────
    /**
     * Get the user account associated with this enrollee
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name}");
    }

    public function getAgeAttribute(): int
    {
        return $this->date_of_birth->age;
    }

    public function isActive(): bool
    {
        return $this->status === EnrolleeStatus::ACTIVE;
    }

    public function isPlanExpired(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    public function hasBenefitBalance(): bool
    {
        return $this->benefit_balance > 0;
    }

    public function canMakeClaim(): bool
    {
        return $this->isActive()
            && ! $this->isPlanExpired()
            && $this->hasBenefitBalance();
    }

    public function deductBenefit(float $amount): void
    {
        $this->decrement('benefit_balance', $amount);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', EnrolleeStatus::ACTIVE->value);
    }

    public function scopeExpired($query)
    {
        return $query->where('expiry_date', '<', now());
    }

    public function scopeForCorporate($query, int $corporateId)
    {
        return $query->where('corporate_id', $corporateId);
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function corporate(): BelongsTo
    {
        return $this->belongsTo(Corporate::class);
    }

    // public function plan(): BelongsTo
    // {
    //     return $this->belongsTo(CorporatePlan::class, 'plan_id');
    // }

    public function plan(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function primaryHcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'primary_hcp_id');
    }

    public function dependents(): HasMany
    {
        return $this->hasMany(Dependent::class);
    }

    public function activeDependents(): HasMany
    {
        return $this->hasMany(Dependent::class)->where('status', 'active');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(EnrolleeCard::class);
    }

    public function activeCard(): HasOne
    {
        return $this->hasOne(EnrolleeCard::class)->where('status', 'active')->latest();
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class);
    }

    public function transferLogs(): HasMany
    {
        return $this->hasMany(EnrolleeTransferLog::class);
    }
}