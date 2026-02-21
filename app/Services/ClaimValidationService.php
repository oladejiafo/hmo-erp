<?php

namespace App\Services;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use App\Models\FraudFlag;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ClaimValidationService
{
    protected array $validationErrors = [];

    /**
     * Run all auto-validation checks on a newly submitted claim.
     * Returns true if claim passes validation, false if it fails hard.
     * Soft failures (warnings that need review) are recorded as fraud flags.
     *
     * Hard failures  → status = rejected immediately with reason
     * Soft failures  → status = flagged, sent to fraud scoring
     */
    public function validate(Claim $claim): ValidationResult
    {
        $this->validationErrors = [];
        $flags = [];

        // ── HARD CHECKS — these reject the claim outright ──────────────────
        $enrolleeCheck = $this->checkEnrolleeEligibility($claim);
        if (! $enrolleeCheck['passed']) {
            return ValidationResult::hardFail($enrolleeCheck['reason']);
        }

        $duplicateCheck = $this->checkDuplicate($claim);
        if (! $duplicateCheck['passed']) {
            return ValidationResult::hardFail($duplicateCheck['reason']);
        }

        $hcpCheck = $this->checkHcpStatus($claim);
        if (! $hcpCheck['passed']) {
            return ValidationResult::hardFail($hcpCheck['reason']);
        }

        // ── SOFT CHECKS — these generate fraud flags ────────────────────────
        $tariffCheck = $this->checkTariffCompliance($claim);
        if (! $tariffCheck['passed']) {
            $flags[] = $this->createFlag($claim, 'tariff_mismatch', $tariffCheck);
        }

        $benefitCheck = $this->checkBenefitLimit($claim);
        if (! $benefitCheck['passed']) {
            $flags[] = $this->createFlag($claim, 'over_benefit_limit', $benefitCheck);
        }

        $preAuthCheck = $this->checkPreAuthorization($claim);
        if (! $preAuthCheck['passed']) {
            $flags[] = $this->createFlag($claim, 'pre_auth_missing', $preAuthCheck);
        }

        return ValidationResult::pass(flags: $flags);
    }

    // ─── Individual Checks ────────────────────────────────────────────────────

    protected function checkEnrolleeEligibility(Claim $claim): array
    {
        $enrollee = $claim->enrollee;

        if (! $enrollee->isActive()) {
            return [
                'passed' => false,
                'reason' => "Enrollee {$enrollee->enrollee_id} is {$enrollee->status->value}. Cannot process claims.",
            ];
        }

        if ($enrollee->isPlanExpired()) {
            return [
                'passed' => false,
                'reason' => "Enrollee plan expired on {$enrollee->expiry_date->format('d M Y')}.",
            ];
        }

        return ['passed' => true];
    }

    protected function checkDuplicate(Claim $claim): array
    {
        $windowStart = Carbon::parse($claim->service_date)->subDays(
            config('fraud.duplicate_window_days', 30)
        );

        $exists = Claim::withoutGlobalScopes()
            ->where('id', '!=', $claim->id)
            ->where('hcp_id', $claim->hcp_id)
            ->where('enrollee_id', $claim->enrollee_id)
            ->where('service_date', $claim->service_date)
            ->whereNotIn('status', [ClaimStatus::REJECTED->value, ClaimStatus::REVERSED->value])
            ->exists();

        if ($exists) {
            return [
                'passed' => false,
                'reason' => "Duplicate claim detected: same enrollee, same HCP, same service date ({$claim->service_date->format('d M Y')}).",
            ];
        }

        return ['passed' => true];
    }

    protected function checkHcpStatus(Claim $claim): array
    {
        $hcp = $claim->hcp;

        if (! $hcp->canSubmitClaims()) {
            return [
                'passed' => false,
                'reason' => "HCP [{$hcp->name}] status is [{$hcp->status->value}]. Claims not accepted.",
            ];
        }

        return ['passed' => true];
    }

    protected function checkTariffCompliance(Claim $claim): array
    {
        $multiplier = config('fraud.cost_spike_multiplier', 1.5);
        $violations = [];

        foreach ($claim->items as $item) {
            if (! $item->tariff_id || ! $item->tariff_unit_price) {
                // Unmatched tariff — flag for manual check
                $violations[] = "{$item->service_name}: no matching tariff found";
                continue;
            }

            $expectedMax = $item->tariff_unit_price * $multiplier;

            if ($item->unit_price_claimed > $expectedMax) {
                $violations[] = sprintf(
                    '%s: claimed ₦%s vs tariff ₦%s (%.0f%% above)',
                    $item->service_name,
                    number_format($item->unit_price_claimed, 2),
                    number_format($item->tariff_unit_price, 2),
                    (($item->unit_price_claimed / $item->tariff_unit_price) - 1) * 100
                );
            }
        }

        if (! empty($violations)) {
            return [
                'passed'      => false,
                'description' => 'Tariff mismatch on ' . count($violations) . ' item(s).',
                'details'     => ['violations' => $violations],
                'score'       => 25.0,
            ];
        }

        return ['passed' => true];
    }

    protected function checkBenefitLimit(Claim $claim): array
    {
        $enrollee = $claim->enrollee;
        $remainingBalance = $enrollee->benefit_balance;

        if ($claim->total_amount_claimed > $remainingBalance) {
            return [
                'passed'      => false,
                'description' => sprintf(
                    'Claim amount ₦%s exceeds remaining benefit balance ₦%s.',
                    number_format($claim->total_amount_claimed, 2),
                    number_format($remainingBalance, 2)
                ),
                'details'     => [
                    'claimed'           => $claim->total_amount_claimed,
                    'remaining_balance' => $remainingBalance,
                    'excess'            => $claim->total_amount_claimed - $remainingBalance,
                ],
                'score'       => 20.0,
            ];
        }

        return ['passed' => true];
    }

    protected function checkPreAuthorization(Claim $claim): array
    {
        if ($claim->claim_type->requiresPreAuth() && ! $claim->is_pre_authorized) {
            return [
                'passed'      => false,
                'description' => "Claim type [{$claim->claim_type->label()}] requires pre-authorization but none provided.",
                'details'     => ['claim_type' => $claim->claim_type->value],
                'score'       => 15.0,
            ];
        }

        return ['passed' => true];
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    protected function createFlag(Claim $claim, string $flagType, array $checkResult): FraudFlag
    {
        return FraudFlag::create([
            'claim_id'    => $claim->id,
            'hcp_id'      => $claim->hcp_id,
            'enrollee_id' => $claim->enrollee_id,
            'flag_type'   => $flagType,
            'flag_score'  => $checkResult['score'] ?? 10.0,
            'description' => $checkResult['description'] ?? $checkResult['reason'] ?? '',
            'details'     => $checkResult['details'] ?? null,
            'status'      => 'open',
        ]);
    }
}


/**
 * Value object returned by ClaimValidationService::validate()
 */
class ValidationResult
{
    public function __construct(
        public readonly bool   $passed,
        public readonly bool   $hardFail,
        public readonly string $reason = '',
        public readonly array  $flags = [],
    ) {}

    public static function hardFail(string $reason): self
    {
        return new self(passed: false, hardFail: true, reason: $reason);
    }

    public static function pass(array $flags = []): self
    {
        return new self(passed: true, hardFail: false, flags: $flags);
    }

    public function hasSoftFlags(): bool
    {
        return ! empty($this->flags);
    }
}