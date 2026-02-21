<?php

namespace App\Enums;

enum HcpType: string
{
    case HOSPITAL     = 'hospital';
    case CLINIC       = 'clinic';
    case PHARMACY     = 'pharmacy';
    case LAB          = 'lab';
    case SPECIALIST   = 'specialist';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}