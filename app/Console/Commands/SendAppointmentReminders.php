<?php
namespace App\Console\Commands;

use App\Models\Appointment;
use App\Services\NotificationService;
use Illuminate\Console\Command;

/**
 * NOTE: NotificationService::create() is private (confirmed in earlier
 * phases). Add this public wrapper to NotificationService before this
 * command will work:
 *
 *   public function systemNotify(int $userId, ?int $branchId, array $data): void
 *   {
 *       $this->create($userId, $branchId, $data);
 *   }
 */
class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';
    protected $description = 'Notify enrollees about confirmed appointments happening tomorrow';

    public function handle(NotificationService $notifications): int
    {
        $tomorrow = now()->addDay()->toDateString();

        $appointments = Appointment::whereIn('status', ['confirmed', 'rescheduled'])
            ->where('reminder_sent', false)
            ->where(function ($q) use ($tomorrow) {
                $q->whereDate('confirmed_date', $tomorrow)
                  ->orWhere(function ($q2) use ($tomorrow) {
                      $q2->whereNull('confirmed_date')->whereDate('preferred_date', $tomorrow);
                  });
            })
            ->with(['enrollee.user', 'hcp:id,name', 'doctor:id,name'])
            ->get();

        foreach ($appointments as $appt) {
            $user = $appt->enrollee?->user;
            if (!$user) continue;

            $when = $appt->confirmed_time ?? $appt->preferred_time_slot;
            $with = $appt->doctor?->name ? "Dr. {$appt->doctor->name}" : $appt->hcp->name;

            $notifications->systemNotify($user->id, $appt->branch_id, [
                'type' => 'system',
                'severity' => 'info',
                'title' => 'Appointment tomorrow',
                'body' => "Reminder: your appointment with {$with} is tomorrow at {$when}.",
                'action_url' => '/enrollee/appointments',
                'notifiable_type' => Appointment::class,
                'notifiable_id' => $appt->id,
            ]);

            $appt->update(['reminder_sent' => true]);
        }

        $this->info("Sent {$appointments->count()} reminders.");
        return self::SUCCESS;
    }
}
