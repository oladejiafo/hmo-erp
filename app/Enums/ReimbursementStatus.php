<?php

namespace App\Enums;

enum ReimbursementStatus: string
{
    case PENDING      = 'pending';
    case UNDER_REVIEW = 'under_review';
    case APPROVED     = 'approved';
    case REJECTED     = 'rejected';
    case PAID         = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::PENDING      => 'Pending',
            self::UNDER_REVIEW => 'Under Review',
            self::APPROVED     => 'Approved',
            self::REJECTED     => 'Rejected',
            self::PAID         => 'Paid',
        };
    }
}
