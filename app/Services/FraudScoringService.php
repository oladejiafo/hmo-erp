<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\FraudFlag;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FraudScoringService
{
    /**
     * Calculate a composite risk score (0–100) for a claim.
     * Score is stored on the claim and used for auto-routing.
     *
     * Score breakdown:
     *   - Existing validation flags from ClaimValidationService:  additive
     *   - HCP frequency anomaly check:                           up to 20pts
     *   - Enrollee abnormal usage check:                         up to 20pts
     *   - Provider pattern deviation:                            up to 10pts
     *   - High-cost enrollee check:                              up to 10pts
     *
     * Final score >= 70  → auto-escalate to supervisor
     * Final score >= 95  → auto-reject
     */
    public function score(Claim $claim): float
    {
        $score = 0.0;

        // Start with flag scores already recorded during validation
        $existingFlagScore = FraudFlag::where('claim_id', $claim->id)
            ->where('status', 'open')
            ->sum('flag_score');

        $score += min($existingFlagScore, 60); // Cap validation flags at 60

        // ── Dynamic scoring checks ────────────────────────────────────────────

        $score += $this->scoreHcpFrequency($claim);
        $score += $this->scoreEnrolleeUsage($claim);
        $score += $this->scoreProviderDeviation($claim);
        $score += $this->scoreHighCostEnrollee($claim);

        $finalScore = min(round($score, 2), 100.0);

        // Persist score on claim
        $claim->updateQuietly(['risk_score' => $finalScore]);

        // If new dynamic flags were created, persist them
        $this->persistDynamicFlags($claim, $finalScore);

        return $finalScore;
    }

    // ─── Scoring Factors ──────────────────────────────────────────────────────

    /**
     * HCP submitting abnormally high volume for a specific enrollee.
     * Threshold: more than N claims in 30-day window (configurable).
     */
    protected function scoreHcpFrequency(Claim $claim): float
    {
        $threshold = config('fraud.frequency_threshold_monthly', 4);
        $windowStart = Carbon::parse($claim->service_date)->startOfMonth();
        $windowEnd   = Carbon::parse($claim->service_date)->endOfMonth();

        $count = Claim::withoutGlobalScopes()
            ->where('hcp_id', $claim->hcp_id)
            ->where('enrollee_id', $claim->enrollee_id)
            ->whereBetween('service_date', [$windowStart, $windowEnd])
            ->where('id', '!=', $claim->id)
            ->count();

        if ($count < $threshold) {
            return 0;
        }

        // Scale: each claim above threshold adds 5 points, max 20
        $excess = $count - $threshold + 1;

        $flagScore = min($excess * 5, 20);

        FraudFlag::firstOrCreate(
            [
                'claim_id'  => $claim->id,
                'flag_type' => 'frequency_anomaly',
            ],
            [
                'hcp_id'      => $claim->hcp_id,
                'enrollee_id' => $claim->enrollee_id,
                'flag_score'  => $flagScore,
                'description' => "HCP submitted {$count} claims for this enrollee in the same month (threshold: {$threshold}).",
                'details'     => [
                    'monthly_count' => $count,
                    'threshold'     => $threshold,
                    'month'         => $windowStart->format('F Y'),
                ],
                'status'      => 'open',
            ]
        );

        return $flagScore;
    }

    /**
     * Enrollee's total annual spend approaching or exceeding the high-cost threshold.
     */
    protected function scoreEnrolleeUsage(Claim $claim): float
    {
        $highCostThreshold = config('fraud.high_cost_enrollee_threshold', 2000000);

        $annualTotal = Claim::withoutGlobalScopes()
            ->where('enrollee_id', $claim->enrollee_id)
            ->whereYear('service_date', $claim->service_date->year)
            ->where('id', '!=', $claim->id)
            ->whereNotIn('status', ['rejected', 'reversed'])
            ->sum('total_amount_claimed');

        $annualTotal += $claim->total_amount_claimed;

        if ($annualTotal < ($highCostThreshold * 0.8)) {
            return 0; // Under 80% of threshold — no flag
        }

        // Scale 0–10 based on how far over they are
        $ratio = min($annualTotal / $highCostThreshold, 2.0);
        $score = ($ratio - 0.8) / 1.2 * 10;

        FraudFlag::firstOrCreate(
            [
                'claim_id'  => $claim->id,
                'flag_type' => 'over_benefit_limit',
            ],
            [
                'hcp_id'      => $claim->hcp_id,
                'enrollee_id' => $claim->enrollee_id,
                'flag_score'  => round($score, 2),
                'description' => sprintf(
                    'Enrollee annual spend: ₦%s (%.0f%% of high-cost threshold ₦%s).',
                    number_format($annualTotal, 2),
                    ($annualTotal / $highCostThreshold) * 100,
                    number_format($highCostThreshold, 2)
                ),
                'details'     => [
                    'annual_total'        => $annualTotal,
                    'threshold'           => $highCostThreshold,
                    'percentage_consumed' => round(($annualTotal / $highCostThreshold) * 100, 1),
                ],
                'status' => 'open',
            ]
        );

        return round($score, 2);
    }

    /**
     * Compare this claim's average item cost vs the HCP's historical average.
     * Significant deviation from baseline = pattern deviation flag.
     */
    protected function scoreProviderDeviation(Claim $claim): float
    {
        // Get HCP's average claim amount over last 6 months
        $avgClaimAmount = Claim::withoutGlobalScopes()
            ->where('hcp_id', $claim->hcp_id)
            ->where('id', '!=', $claim->id)
            ->where('service_date', '>=', now()->subMonths(6))
            ->whereNotIn('status', ['rejected', 'reversed'])
            ->avg('total_amount_claimed');

        if (! $avgClaimAmount || $avgClaimAmount == 0) {
            return 0; // No historical baseline yet
        }

        $deviationRatio = $claim->total_amount_claimed / $avgClaimAmount;

        // If this claim is > 3x the HCP's typical claim, flag it
        if ($deviationRatio < 3.0) {
            return 0;
        }

        $score = min(($deviationRatio - 3.0) * 2, 10);

        FraudFlag::firstOrCreate(
            [
                'claim_id'  => $claim->id,
                'flag_type' => 'pattern_deviation',
            ],
            [
                'hcp_id'      => $claim->hcp_id,
                'enrollee_id' => $claim->enrollee_id,
                'flag_score'  => round($score, 2),
                'description' => sprintf(
                    'Claim amount ₦%s is %.1fx the HCP average (₦%s) over last 6 months.',
                    number_format($claim->total_amount_claimed, 2),
                    $deviationRatio,
                    number_format($avgClaimAmount, 2)
                ),
                'details'     => [
                    'claim_amount'  => $claim->total_amount_claimed,
                    'hcp_avg'       => $avgClaimAmount,
                    'deviation_x'   => round($deviationRatio, 2),
                ],
                'status' => 'open',
            ]
        );

        return round($score, 2);
    }

    protected function scoreHighCostEnrollee(Claim $claim): float
    {
        // Covered in scoreEnrolleeUsage — no double scoring needed here
        return 0;
    }

    protected function persistDynamicFlags(Claim $claim, float $finalScore): void
    {
        // Any additional post-score flags can be persisted here
        // Currently handled inline within each scoring method
    }
}