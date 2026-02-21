<?php

namespace App\Enums;

enum EnrolleeStatus: string
{
    case ACTIVE    = 'active';
    case INACTIVE  = 'inactive';
    case SUSPENDED = 'suspended';
    case DECEASED  = 'deceased';

    public function canMakeClaims(): bool
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
            self::ACTIVE    => 'success',
            self::INACTIVE  => 'secondary',
            self::SUSPENDED => 'warning',
            self::DECEASED  => 'dark',
        };
    }
}