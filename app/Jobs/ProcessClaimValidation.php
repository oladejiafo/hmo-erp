<?php

namespace App\Jobs;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use App\Services\ClaimStateService;
use App\Services\ClaimValidationService;
use App\Services\FraudScoringService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessClaimValidation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Retry up to 3 times on failure.
     * Wait 60 seconds before each retry.
     */
    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public readonly Claim $claim) {}

    public function handle(
        ClaimValidationService $validationService,
        ClaimStateService $stateService,
        FraudScoringService $fraudService
    ): void {
        // Reload fresh from DB - the claim may have been modified since dispatch
        $claim = $this->claim->fresh(['items', 'enrollee', 'hcp']);

        if (! $claim) {
            Log::warning("ProcessClaimValidation: Claim ID {$this->claim->id} no longer exists. Skipping.");
            return;
        }

        // Only process claims in submitted state
        if ($claim->status !== ClaimStatus::SUBMITTED) {
            Log::info("ProcessClaimValidation: Claim {$claim->claim_number} is [{$claim->status->value}]. Skipping.");
            return;
        }

        Log::info("Starting validation for claim: {$claim->claim_number}");

        try {
            // Step 1: Transition to validating
            $stateService->startValidation($claim);

            // Step 2: Run validation checks
            $result = $validationService->validate($claim);

            if ($result->hardFail) {
                // Hard failure - reject immediately, no human review needed
                $stateService->reject($claim, $result->reason);
                Log::info("Claim {$claim->claim_number} hard-failed validation: {$result->reason}");
                return;
            }

            // Step 3: Mark as auto-validated
            $stateService->markValidated($claim);

            // Step 4: Run fraud scoring (only for validated claims)
            $riskScore = $fraudService->score($claim);

            Log::info("Claim {$claim->claim_number} scored: {$riskScore}");

            // Step 5: Route based on score and flags
            $this->routeAfterScoring($claim->fresh(), $stateService, $riskScore, $result->hasSoftFlags());

        } catch (\Throwable $e) {
            Log::error("ProcessClaimValidation failed for {$claim->claim_number}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e; // Re-throw so the queue marks it for retry
        }
    }

    protected function routeAfterScoring(
        Claim $claim,
        ClaimStateService $stateService,
        float $riskScore,
        bool $hasSoftFlags
    ): void {
        $autoRejectThreshold    = config('fraud.auto_reject_threshold', 95);
        $autoQuarantineThreshold = config('fraud.auto_quarantine_threshold', 70);

        if ($riskScore >= $autoRejectThreshold) {
            // Extremely high certainty fraud - auto reject
            $stateService->reject(
                $claim,
                "Auto-rejected. Risk score {$riskScore}/100 exceeds auto-rejection threshold."
            );
            return;
        }

        if ($riskScore >= $autoQuarantineThreshold || $hasSoftFlags) {
            // High risk or has flags - route to flagged for supervisor review
            $stateService->flag(
                $claim,
                "Risk score: {$riskScore}/100. Flagged for supervisor review."
            );
            return;
        }

        // Clean claim - send straight to officer queue
        $stateService->sendToReview($claim, "Auto-validated. Risk score: {$riskScore}/100. Sent for review.");
    }

    /**
     * Handle a job failure after all retries exhausted.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessClaimValidation PERMANENTLY FAILED for claim {$this->claim->claim_number}: "
            . $exception->getMessage());

        // Revert claim to submitted so it can be manually retried
        try {
            $this->claim->updateQuietly(['status' => ClaimStatus::SUBMITTED->value]);
        } catch (\Throwable $e) {
            // Do nothing - can't let this crash
        }
    }
}