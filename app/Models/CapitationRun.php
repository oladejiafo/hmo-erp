<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Models/CapitationRun.php
 *
 * One record = one monthly capitation run for a branch.
 * Groups all capitation_records (per-HCP lines) for a given period.
 *
 * Status lifecycle:
 *   draft   — generated, under review. Records can be edited.
 *   approved — Finance approved. Payment batch created/pending.
 *   paid    — Payment batch completed, HCPs have been paid.
 *
 * @property int         $id
 * @property int         $branch_id
 * @property int         $period_month
 * @property int         $period_year
 * @property string      $status
 * @property int         $total_hcp_count
 * @property int         $total_principal_count
 * @property int         $total_dependent_count
 * @property int         $total_member_count
 * @property float       $total_amount
 * @property int         $member_variance
 * @property int|null    $generated_by_id
 * @property int|null    $approved_by_id
 * @property Carbon|null $approved_at
 * @property int|null    $payment_batch_id
 * @property string|null $notes
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 */
class CapitationRun extends Model
{
    protected $table = 'capitation_runs';

    protected $fillable = [
        'branch_id',
        'period_month',
        'period_year',
        'status',
        'total_hcp_count',
        'total_principal_count',
        'total_dependent_count',
        'total_member_count',
        'total_amount',
        'member_variance',
        'generated_by_id',
        'approved_by_id',
        'approved_at',
        'payment_batch_id',
        'notes',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'approved_at'  => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function generatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function paymentBatch(): BelongsTo
    {
        return $this->belongsTo(PaymentBatch::class, 'payment_batch_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(CapitationRecord::class, 'run_id')->orderBy('hcp_name_snapshot');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForBranch(Builder $query, int $branchId): Builder
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', 'draft');
    }

    // ── Computed Attributes ───────────────────────────────────────────────────

    /**
     * Human-readable period label, e.g. "June 2025"
     */
    public function getPeriodLabelAttribute(): string
    {
        return Carbon::createFromDate($this->period_year, $this->period_month, 1)
                     ->format('F Y');
    }

    /**
     * Short period code for batch numbers, e.g. "2025-06"
     */
    public function getPeriodCodeAttribute(): string
    {
        return sprintf('%04d-%02d', $this->period_year, $this->period_month);
    }

    // ── Business Logic ────────────────────────────────────────────────────────

    /**
     * Check if a run already exists for a given branch + period.
     */
    public static function existsForPeriod(int $branchId, int $month, int $year): bool
    {
        return static::where('branch_id', $branchId)
                     ->where('period_month', $month)
                     ->where('period_year', $year)
                     ->exists();
    }

    /**
     * Get the approved run for the previous month (for variance calculation).
     */
    public function previousRun(): ?CapitationRun
    {
        $prevDate = Carbon::createFromDate($this->period_year, $this->period_month, 1)
                          ->subMonth();

        return static::where('branch_id', $this->branch_id)
                     ->where('period_month', $prevDate->month)
                     ->where('period_year', $prevDate->year)
                     ->whereIn('status', ['approved', 'paid'])
                     ->first();
    }

    /**
     * Recompute totals from all child records and save.
     * Called after records are generated or edited.
     */
    public function recomputeTotals(): void
    {
        $agg = $this->records()
                    ->selectRaw('
                        COUNT(*) as hcp_count,
                        SUM(principal_count) as principal_sum,
                        SUM(dependent_count) as dependent_sum,
                        SUM(enrolled_member_count) as member_sum,
                        SUM(total_amount + COALESCE(adjustment_amount, 0)) as amount_sum
                    ')
                    ->first();

        $this->update([
            'total_hcp_count'       => $agg->hcp_count ?? 0,
            'total_principal_count' => $agg->principal_sum ?? 0,
            'total_dependent_count' => $agg->dependent_sum ?? 0,
            'total_member_count'    => $agg->member_sum ?? 0,
            'total_amount'          => $agg->amount_sum ?? 0,
        ]);
    }
}