<?php

namespace App\Enums;

enum CorporateStatus: string
{
    case ACTIVE     = 'active';
    case SUSPENDED  = 'suspended';
    case EXPIRED    = 'expired';
    case TERMINATED = 'terminated';

    public function isActive(): bool
    {
        return $this === self::ACTIVE;
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }

    public function color(): string
    {
        return match($this) {
            self::ACTIVE     => 'success',
            self::SUSPENDED  => 'warning',
            self::EXPIRED    => 'danger',
            self::TERMINATED => 'dark',
        };
    }
}