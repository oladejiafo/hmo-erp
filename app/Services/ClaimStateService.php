<?php

namespace App\Services;

use App\Enums\ClaimStatus;
use App\Models\Claim;
use App\Models\ClaimStatusLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ClaimStateService
{
    /**
     * Transition a claim to a new status.
     * Enforces the state machine — throws if the transition is invalid.
     * Records every transition in claim_status_logs.
     *
     * @param  Claim        $claim
     * @param  ClaimStatus  $newStatus
     * @param  string|null  $note      Officer or system note for the log
     * @param  string       $triggeredBy  'user' | 'system' | 'fraud_engine' | 'scheduler'
     * @throws \InvalidArgumentException
     */
    public function transition(
        Claim $claim,
        ClaimStatus $newStatus,
        ?string $note = null,
        string $triggeredBy = 'user'
    ): Claim {
        $currentStatus = $claim->status;

        if (! $currentStatus->canTransitionTo($newStatus)) {
            throw new \InvalidArgumentException(
                "Invalid claim transition: cannot move from [{$currentStatus->label()}] to [{$newStatus->label()}]."
            );
        }

        return DB::transaction(function () use ($claim, $currentStatus, $newStatus, $note, $triggeredBy) {

            // Update timestamps for terminal states
            $timestamps = match ($newStatus) {
                ClaimStatus::AUTO_VALIDATED => ['auto_validated_at' => now()],
                ClaimStatus::APPROVED       => ['approved_at' => now()],
                ClaimStatus::REJECTED       => ['rejected_at' => now()],
                ClaimStatus::PAID           => ['paid_at' => now()],
                default                     => [],
            };

            $claim->update(array_merge(['status' => $newStatus], $timestamps));

            // Log the transition — always
            ClaimStatusLog::create([
                'claim_id'     => $claim->id,
                'user_id'      => Auth::id(),
                'from_status'  => $currentStatus->value,
                'to_status'    => $newStatus->value,
                'note'         => $note,
                'triggered_by' => $triggeredBy,
            ]);

            return $claim->fresh();
        });
    }

    /**
     * Convenience methods for common transitions.
     */
    public function startValidation(Claim $claim): Claim
    {
        return $this->transition(
            $claim,
            ClaimStatus::AUTO_VALIDATING,
            'Auto validation started.',
            'system'
        );
    }

    public function markValidated(Claim $claim): Claim
    {
        return $this->transition(
            $claim,
            ClaimStatus::AUTO_VALIDATED,
            'Auto validation passed. Awaiting assignment.',
            'system'
        );
    }

    public function flag(Claim $claim, string $reason): Claim
    {
        return $this->transition(
            $claim,
            ClaimStatus::FLAGGED,
            $reason,
            'fraud_engine'
        );
    }

    public function sendToReview(Claim $claim, ?string $note = null): Claim
    {
        return $this->transition(
            $claim,
            ClaimStatus::UNDER_REVIEW,
            $note ?? 'Sent to claims officer for review.',
            'user'
        );
    }

    public function escalateToSupervisor(Claim $claim, string $reason): Claim
    {
        return $this->transition(
            $claim,
            ClaimStatus::SUPERVISOR_REVIEW,
            $reason,
            'system'
        );
    }

    public function approve(Claim $claim, float $approvedAmount, ?string $note = null): Claim
    {
        $claim->update(['total_amount_approved' => $approvedAmount]);

        return $this->transition(
            $claim,
            ClaimStatus::APPROVED,
            $note ?? "Approved. Amount: ₦" . number_format($approvedAmount, 2),
            'user'
        );
    }

    public function reject(Claim $claim, string $reason): Claim
    {
        $claim->update(['rejection_reason' => $reason]);

        return $this->transition($claim, ClaimStatus::REJECTED, $reason, 'user');
    }

    public function markPaid(Claim $claim, float $paidAmount): Claim
    {
        $claim->update(['total_amount_paid' => $paidAmount]);

        return $this->transition(
            $claim,
            ClaimStatus::PAID,
            "Payment processed. Amount: ₦" . number_format($paidAmount, 2),
            'system'
        );
    }
}