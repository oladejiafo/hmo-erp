<?php

namespace App\Enums;

enum ClaimStatus: string
{
    case SUBMITTED         = 'submitted';
    case AUTO_VALIDATING   = 'auto_validating';
    case AUTO_VALIDATED    = 'auto_validated';
    case FLAGGED           = 'flagged';
    case UNDER_REVIEW      = 'under_review';
    case SUPERVISOR_REVIEW = 'supervisor_review';
    case APPROVED          = 'approved';
    case REJECTED          = 'rejected';
    case PAID              = 'paid';
    case REVERSED          = 'reversed';

    public function label(): string
    {
        return match($this) {
            self::SUBMITTED         => 'Submitted',
            self::AUTO_VALIDATING   => 'Auto Validating',
            self::AUTO_VALIDATED    => 'Auto Validated',
            self::FLAGGED           => 'Flagged',
            self::UNDER_REVIEW      => 'Under Review',
            self::SUPERVISOR_REVIEW => 'Supervisor Review',
            self::APPROVED          => 'Approved',
            self::REJECTED          => 'Rejected',
            self::PAID              => 'Paid',
            self::REVERSED          => 'Reversed',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::SUBMITTED         => 'secondary',
            self::AUTO_VALIDATING   => 'info',
            self::AUTO_VALIDATED    => 'info',
            self::FLAGGED           => 'danger',
            self::UNDER_REVIEW      => 'warning',
            self::SUPERVISOR_REVIEW => 'warning',
            self::APPROVED          => 'success',
            self::REJECTED          => 'danger',
            self::PAID              => 'primary',
            self::REVERSED          => 'dark',
        };
    }

    /**
     * Valid transitions FROM this status.
     * This is the state machine definition — enforced by ClaimStateService.
     */
    public function allowedTransitions(): array
    {
        return match($this) {
            self::SUBMITTED         => [self::AUTO_VALIDATING],
            self::AUTO_VALIDATING   => [self::AUTO_VALIDATED, self::FLAGGED],
            self::AUTO_VALIDATED    => [self::UNDER_REVIEW, self::FLAGGED],
            self::FLAGGED           => [self::SUPERVISOR_REVIEW, self::UNDER_REVIEW, self::REJECTED],
            self::UNDER_REVIEW      => [self::APPROVED, self::REJECTED, self::SUPERVISOR_REVIEW],
            self::SUPERVISOR_REVIEW => [self::APPROVED, self::REJECTED],
            self::APPROVED          => [self::PAID],
            self::PAID              => [self::REVERSED],
            self::REJECTED          => [],
            self::REVERSED          => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::REJECTED, self::REVERSED]);
    }

    public function requiresSupervisor(): bool
    {
        return $this === self::SUPERVISOR_REVIEW;
    }
}