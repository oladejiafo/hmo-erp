<?php
/**
 * NEW FILE - app/Traits/HasSlaClock.php
 *
 * Generalizes the safe/warning/danger pattern verified in
 * PreAuthorisation::getTatStatusAttribute() (age vs threshold, two tiers)
 * so Tickets don't need to reinvent it a third time.
 *
 * Unlike Claims' SLAController (which computes business-day targets
 * dynamically per claim type via SystemSetting), this trait stores the
 * target directly on the row at creation - closer to PA's approach, since
 * tickets don't carry the same NHIA business-day reporting requirement
 * claims do. Simpler is correct here, not a shortcut.
 *
 * Requires the consuming model to have: created_at, resolved_at (nullable),
 * sla_target_hours (int), and a way to know if it's still "active" via
 * isSlaActive(). The model defines isSlaActive() itself since "active"
 * means something different per model (Ticket: not resolved/closed).
 */

namespace App\Traits;

trait HasSlaClock
{
    public function getSlaAgeHoursAttribute(): float
    {
        $end = $this->resolved_at ?? now();
        /** @disregard P1013 */
        return round($this->created_at->diffInMinutes($end) / 60, 1);
    }

    public function getSlaDueAtAttribute(): \Carbon\Carbon
    {
        /** @disregard P1013 */
        return $this->created_at->copy()->addHours($this->sla_target_hours);
    }

    /**
     * 'safe' | 'warning' | 'danger' | 'resolved' - same four states as
     * PreAuthorisation::tat_status, same naming, so frontend components
     * that already understand PA's tat_status can reuse the same color
     * mapping without a new lookup table.
     */
    public function getSlaStatusAttribute(): string
    {
        if (! $this->isSlaActive()) {
            return 'resolved';
        }

        $ageHours = $this->sla_age_hours;
        $warnAt = $this->sla_target_hours * 0.75; // warn at 75% of budget, mirrors PA's warn-before-limit approach

        if ($ageHours >= $this->sla_target_hours) return 'danger';
        if ($ageHours >= $warnAt) return 'warning';
        return 'safe';
    }

    public function getSlaIsOverdueAttribute(): bool
    {
        return $this->sla_status === 'danger';
    }
}
