<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doctor extends Model
{
    protected $fillable = ['hcp_id', 'name', 'specialty', 'qualification', 'status'];

    public function hcp(): BelongsTo { return $this->belongsTo(HealthCareProvider::class, 'hcp_id'); }
    public function schedules(): HasMany { return $this->hasMany(DoctorSchedule::class); }
    public function appointments(): HasMany { return $this->hasMany(Appointment::class); }

    /**
     * Available slots for a given date - schedule blocks minus already
     * booked/confirmed appointments that day.
     */
    public function availableSlots(string $date): array
    {
        $dayOfWeek = \Carbon\Carbon::parse($date)->dayOfWeek;
        $schedules = $this->schedules()->where('day_of_week', $dayOfWeek)->get();

        if ($schedules->isEmpty()) return [];

        $booked = $this->appointments()
            ->whereDate('confirmed_date', $date)
            ->whereIn('status', ['confirmed', 'rescheduled'])
            ->pluck('confirmed_time')
            ->filter()
            ->toArray();

        $slots = [];
        foreach ($schedules as $sched) {
            $start = \Carbon\Carbon::parse($date . ' ' . $sched->start_time);
            $end = \Carbon\Carbon::parse($date . ' ' . $sched->end_time);
            while ($start->lt($end)) {
                $slotTime = $start->format('H:i');
                if (!in_array($slotTime, $booked)) {
                    $slots[] = $slotTime;
                }
                $start->addMinutes($sched->slot_minutes);
            }
        }
        return $slots;
    }
}
