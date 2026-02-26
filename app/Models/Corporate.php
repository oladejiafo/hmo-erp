<?php

namespace App\Models;

use App\Enums\CorporateStatus;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Corporate extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId, SoftDeletes;

    protected $fillable = [
        'branch_id', 'name', 'code', 'rc_number', 'industry',
        'address', 'city', 'state', 'email', 'phone', 'logo_path',
        'status', 'contract_start_date', 'contract_end_date',
        'total_employees', 'notes',
    ];

    protected $casts = [
        'status'              => CorporateStatus::class,
        'contract_start_date' => 'date',
        'contract_end_date'   => 'date',
        'total_employees'     => 'integer',
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === CorporateStatus::ACTIVE;
    }

    public function isContractExpired(): bool
    {
        return $this->contract_end_date && $this->contract_end_date->isPast();
    }

    public function daysUntilRenewal(): int
    {
        return max(0, now()->diffInDays($this->contract_end_date, false));
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', CorporateStatus::ACTIVE->value);
    }

    public function scopeExpiringWithin($query, int $days)
    {
        return $query->whereBetween('contract_end_date', [now(), now()->addDays($days)]);
    }

    // ─── Relationships ────────────────────────────────────────────────────────
    public function plans(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Plan::class);
    }
    
    public function activePlans(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Plan::class)->where('status', 'active');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(CorporateContact::class);
    }

    // public function plans(): HasMany
    // {
    //     return $this->hasMany(CorporatePlan::class);
    // }

    // public function activePlans(): HasMany
    // {
    //     return $this->hasMany(CorporatePlan::class)->where('status', 'active');
    // }

    public function invoices(): HasMany
    {
        return $this->hasMany(CorporateInvoice::class);
    }

    public function enrollees(): HasMany
    {
        return $this->hasMany(Enrollee::class);
    }

    public function activeEnrollees(): HasMany
    {
        return $this->hasMany(Enrollee::class)->where('status', 'active');
    }
}