<?php

namespace App\Enums;

enum PaymentBatchStatus: string
{
    case DRAFT      = 'draft';
    case SUBMITTED  = 'submitted';
    case APPROVED   = 'approved';
    case PROCESSING = 'processing';
    case COMPLETED  = 'completed';
    case FAILED     = 'failed';
    case REVERSED   = 'reversed';

    public function isEditable(): bool
    {
        return $this === self::DRAFT;
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }

    public function color(): string
    {
        return match($this) {
            self::DRAFT      => 'secondary',
            self::SUBMITTED  => 'info',
            self::APPROVED   => 'warning',
            self::PROCESSING => 'primary',
            self::COMPLETED  => 'success',
            self::FAILED     => 'danger',
            self::REVERSED   => 'dark',
        };
    }
}