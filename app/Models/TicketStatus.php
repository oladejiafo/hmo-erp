<?php

namespace App\Enums;

enum TicketStatus: string
{
    case OPEN        = 'open';
    case IN_PROGRESS = 'in_progress';
    case RESOLVED    = 'resolved';
    case CLOSED      = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::OPEN        => 'Open',
            self::IN_PROGRESS => 'In Progress',
            self::RESOLVED    => 'Resolved',
            self::CLOSED      => 'Closed',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::OPEN        => 'warning',
            self::IN_PROGRESS => 'info',
            self::RESOLVED    => 'success',
            self::CLOSED      => 'secondary',
        };
    }

    public function isActive(): bool
    {
        return in_array($this, [self::OPEN, self::IN_PROGRESS]);
    }
}
