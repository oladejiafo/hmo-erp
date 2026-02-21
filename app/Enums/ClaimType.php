<?php

namespace App\Enums;

enum ClaimType: string
{
    case OUTPATIENT  = 'outpatient';
    case INPATIENT   = 'inpatient';
    case DENTAL      = 'dental';
    case OPTICAL     = 'optical';
    case MATERNITY   = 'maternity';
    case EMERGENCY   = 'emergency';
    case SURGERY     = 'surgery';
    case LABORATORY  = 'laboratory';
    case RADIOLOGY   = 'radiology';
    case DRUG_REFILL = 'drug_refill';

    public function label(): string
    {
        return match($this) {
            self::OUTPATIENT  => 'Outpatient',
            self::INPATIENT   => 'Inpatient',
            self::DENTAL      => 'Dental',
            self::OPTICAL     => 'Optical',
            self::MATERNITY   => 'Maternity',
            self::EMERGENCY   => 'Emergency',
            self::SURGERY     => 'Surgery',
            self::LABORATORY  => 'Laboratory',
            self::RADIOLOGY   => 'Radiology',
            self::DRUG_REFILL => 'Drug Refill',
        };
    }

    /**
     * High-value or high-risk claim types that auto-trigger supervisor review.
     */
    public function requiresPreAuth(): bool
    {
        return in_array($this, [
            self::INPATIENT,
            self::SURGERY,
            self::MATERNITY,
        ]);
    }
}