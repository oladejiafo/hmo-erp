<?php

namespace App\Models;

use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Models/CapitationRecord.php  (replaces thin Phase 1 stub)
 *
 * One row = one HCP's capitation line item inside a CapitationRun.
 *
 * Formula:
 *   total_amount = (principal_count × rate_per_member)
 *                + (dependent_count × rate_per_dependent)
 *   effective_total = total_amount + adjustment_amount
 */
class CapitationRecord extends Model
{
    use BelongsToBranch;

    protected $fillable = [
        'run_id', 'hcp_id', 'branch_id',
        'period_month', 'period_year',
        'principal_count', 'dependent_count', 'enrolled_member_count',
        'previous_member_count', 'member_variance',
        'rate_per_member', 'rate_per_dependent',
        'total_amount', 'adjustment_amount', 'adjustment_note',
        'notes', 'status', 'payment_batch_id',
        'hcp_name_snapshot', 'hcp_tier_snapshot',
    ];

    protected $casts = [
        'rate_per_member'    => 'float',
        'rate_per_dependent' => 'float',
        'total_amount'       => 'float',
        'adjustment_amount'  => 'float',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function run(): BelongsTo
    {
        return $this->belongsTo(CapitationRun::class, 'run_id');
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function paymentBatch(): BelongsTo
    {
        return $this->belongsTo(PaymentBatch::class, 'payment_batch_id');
    }

    // ── Computed Attributes ───────────────────────────────────────────────────

    public function getPeriodLabelAttribute(): string
    {
        return Carbon::createFromDate($this->period_year, $this->period_month, 1)->format('F Y');
    }

    public function getEffectiveTotalAttribute(): float
    {
        return $this->total_amount + ($this->adjustment_amount ?? 0);
    }

    /**
     * Recompute totals from counts and rates and persist.
     */
    public function recalculate(): void
    {
        $principalTotal = $this->principal_count * ($this->rate_per_member ?? 0);
        $depRate        = $this->rate_per_dependent ?? $this->rate_per_member ?? 0;
        $dependentTotal = $this->dependent_count * $depRate;
        $memberTotal    = $this->principal_count + $this->dependent_count;

        $this->update([
            'enrolled_member_count' => $memberTotal,
            'member_variance'       => $memberTotal - ($this->previous_member_count ?? 0),
            'total_amount'          => $principalTotal + $dependentTotal,
        ]);
    }
}