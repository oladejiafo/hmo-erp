<?php

namespace App\Enums;

/**
 * ASSUMPTION FLAGGED: I have not seen App\Enums\ClaimStatus, only its usage
 * (ClaimStatus::SUBMITTED, ::PAID, ::REJECTED, ::REVERSED as string-backed
 * cases). This enum is written to match that same shape: a plain backed enum,
 * string values, used directly as an Eloquent cast. If ClaimStatus has extra
 * methods (label(), color(), etc.) that the frontend or other controllers
 * depend on, add the equivalent here once I see that file.
 */
enum ClaimConfirmationStatus: string
{
    case PENDING   = 'pending';
    case CONFIRMED = 'confirmed';
    case DISPUTED  = 'disputed';

    public function label(): string
    {
        return match ($this) {
            self::PENDING   => 'Pending Confirmation',
            self::CONFIRMED => 'Confirmed by Member',
            self::DISPUTED  => 'Disputed by Member',
        };
    }
}
