<?php

namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use SoftDeletes, HasAuditLog;

    protected $fillable = [
        'name', 'code', 'state', 'address', 'phone', 'email', 'type', 'status',
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isHQ(): bool
    {
        return $this->type === 'HQ';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeHQ($query)
    {
        return $query->where('type', 'HQ');
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function corporates(): HasMany
    {
        return $this->hasMany(Corporate::class);
    }

    public function enrollees(): HasMany
    {
        return $this->hasMany(Enrollee::class);
    }

    public function healthCareProviders(): HasMany
    {
        return $this->hasMany(HealthCareProvider::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(Claim::class);
    }

    public function paymentBatches(): HasMany
    {
        return $this->hasMany(PaymentBatch::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(CorporateInvoice::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }
}