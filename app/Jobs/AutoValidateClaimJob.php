<?php
// app/Jobs/AutoValidateClaimJob.php

namespace App\Jobs;

use App\Models\Claim;
use App\Enums\ClaimStatus;
use App\Services\ClaimStateService;
use App\Services\ClaimValidationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AutoValidateClaimJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    public $tries = 3; // Retry 3 times if fails
    public $backoff = 5; // Wait 5 seconds between retries

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected Claim $claim
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        ClaimStateService $stateService,
        ClaimValidationService $validationService
    ): void {
        try {
            Log::info("Starting auto-validation for claim #{$this->claim->id}");

            // Step 1: Run duplicate check
            /** @disregard P1013 */
            $duplicateCheck = $validationService->checkForDuplicates($this->claim);
            
            if ($duplicateCheck->hasDuplicates) {
                $this->flagClaim('Duplicate claim detected', $duplicateCheck->details);
                return;
            }

            // Step 2: Run tariff validation
            /** @disregard P1013 */
            $tariffValidation = $validationService->validateTariff($this->claim);
            
            if (!$tariffValidation->isValid) {
                $this->flagClaim('Tariff validation failed', $tariffValidation->errors);
                return;
            }

            // Step 3: Calculate risk score
            /** @disregard P1013 */
            $riskScore = $validationService->calculateRiskScore($this->claim);

            // Step 4: Move to auto-validated status
            $stateService->transition($this->claim, ClaimStatus::AUTO_VALIDATED);
            
            // Save risk score to claim
            $this->claim->update([
                'risk_score' => $riskScore->score,
                'risk_level' => $riskScore->level,
                'validated_at' => now(),
            ]);

            Log::info("Claim #{$this->claim->id} auto-validated successfully", [
                'risk_score' => $riskScore->score,
                'risk_level' => $riskScore->level
            ]);

        } catch (\Exception $e) {
            Log::error("Auto-validation failed for claim #{$this->claim->id}: " . $e->getMessage());
            
            // If all retries fail, flag for manual review
            if ($this->attempts() >= $this->tries) {
                $this->claim->update([
                    'status' => ClaimStatus::FLAGGED,
                    'flag_reason' => 'Auto-validation failed after retries: ' . $e->getMessage()
                ]);
            }
            
            throw $e;
        }
    }

    /**
     * Flag a claim with reason
     */
    protected function flagClaim(string $reason, array $details = []): void
    {
        $this->claim->update([
            'status' => ClaimStatus::FLAGGED,
            'flag_reason' => $reason,
            'flag_details' => $details
        ]);

        Log::warning("Claim #{$this->claim->id} flagged: {$reason}", $details);
    }
}