<?php

namespace App\Enums;

enum TicketPriority: string
{
    case LOW    = 'low';
    case MEDIUM = 'medium';
    case HIGH   = 'high';
    case URGENT = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::LOW    => 'Low',
            self::MEDIUM => 'Medium',
            self::HIGH   => 'High',
            self::URGENT => 'Urgent',
        };
    }

    /**
     * Default SLA target hours per priority. Configurable later via
     * SystemSetting the same way SLAController's claim targets are, but
     * hardcoded defaults for v1 rather than adding another settings screen
     * before there's any real ticket volume to tune against.
     */
    public function defaultSlaHours(): int
    {
        return match ($this) {
            self::URGENT => 4,
            self::HIGH   => 24,
            self::MEDIUM => 48,
            self::LOW    => 120,
        };
    }
}
