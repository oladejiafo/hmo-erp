<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Models/HcpCapitationRate.php
 *
 * Agreed monthly capitation rate for an HCP.
 * Rate is set by Finance/management and used when generating runs.
 * Only one active rate per HCP at a time.
 */
class HcpCapitationRate extends Model
{
    protected $table = 'hcp_capitation_rates';

    protected $fillable = [
        'hcp_id', 'branch_id',
        'rate_per_principal', 'rate_per_dependent',
        'tier', 'effective_from', 'effective_to',
        'is_active', 'notes', 'created_by',
    ];

    protected $casts = [
        'rate_per_principal' => 'float',
        'rate_per_dependent' => 'float',
        'effective_from'     => 'date',
        'effective_to'       => 'date',
        'is_active'          => 'boolean',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Rate active as of a given date (defaults to today) */
    public function scopeActiveOn(Builder $query, ?Carbon $date = null): Builder
    {
        $date ??= Carbon::today();
        return $query->where('is_active', true)
                     ->where('effective_from', '<=', $date)
                     ->where(fn ($q) =>
                         $q->whereNull('effective_to')
                           ->orWhere('effective_to', '>=', $date)
                     );
    }

    public function scopeForBranch(Builder $query, int $branchId): Builder
    {
        return $query->where('branch_id', $branchId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Get the current active rate for a given HCP (or null if none set).
     */
    public static function currentForHcp(int $hcpId, ?int $branchId = null): ?self
    {
        return static::where('hcp_id', $hcpId)
                     ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                     ->activeOn()
                     ->first();
    }
}