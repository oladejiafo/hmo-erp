<?php

namespace App\Enums;

enum HcpStatus: string
{
    case PENDING     = 'pending';
    case ACTIVE      = 'active';
    case SUSPENDED   = 'suspended';
    case BLACKLISTED = 'blacklisted';
    case TERMINATED  = 'terminated';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    public function canSubmitClaims(): bool
    {
        return $this === self::ACTIVE;
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING     => 'warning',
            self::ACTIVE      => 'success',
            self::SUSPENDED   => 'danger',
            self::BLACKLISTED => 'dark',
            self::TERMINATED  => 'secondary',
        };
    }
}