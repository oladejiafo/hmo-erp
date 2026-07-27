<?php
/**
 * FILE: app/Services/Telemedicine/TelemedicineService.php
 *
 * Single source of truth for encounter creation, room provisioning, and
 * closing a consult. Both EnrolleePortalController and ProviderPortalController
 * call into this instead of duplicating the logic - the exact rework the
 * phased plan flagged as wasteful if Telemedicine and EMR were built
 * separately.
 */
namespace App\Services\Telemedicine;

use App\Models\Appointment;
use App\Models\Encounter;
use App\Services\NotificationService;

class TelemedicineService
{
    public function __construct(
        protected DailyVideoService $video,
        protected NotificationService $notifications,
    ) {}

    /**
     * Called right after an appointment is confirmed (either the instant
     * doctor+slot path in EnrolleePortalController::bookAppointment, or
     * the manual path in ProviderPortalController::confirmAppointment).
     * No-op for in-person appointments. Safe to call more than once -
     * won't create a duplicate encounter for the same appointment.
     */
    public function createEncounterForAppointment(Appointment $appointment): ?Encounter
    {
        if ($appointment->consultation_type === 'in_person') {
            return null;
        }

        $existing = Encounter::where('appointment_id', $appointment->id)->first();
        if ($existing) {
            return $existing;
        }

        $scheduledAt = $appointment->confirmed_date && $appointment->confirmed_time
            ? \Carbon\Carbon::parse($appointment->confirmed_date->toDateString() . ' ' . $appointment->confirmed_time)
            : ($appointment->confirmed_date ?? $appointment->preferred_date);

        $encounter = Encounter::create([
            'branch_id'      => $appointment->branch_id,
            'appointment_id' => $appointment->id,
            'enrollee_id'    => $appointment->enrollee_id,
            'dependent_id'   => $appointment->dependent_id,
            'hcp_id'         => $appointment->hcp_id,
            'doctor_id'      => $appointment->doctor_id,
            'type'           => $appointment->consultation_type,
            'status'         => 'scheduled',
            'chief_complaint'=> $appointment->reason,
            'scheduled_at'   => $scheduledAt,
        ]);

        return $encounter;
    }

    /**
     * Ensures a Daily.co room exists for this encounter (created lazily,
     * on first join - never for appointments that get cancelled before
     * the visit) and returns a fresh, single-use join URL for whoever is
     * joining right now.
     */
    public function join(Encounter $encounter, string $participantName, bool $isDoctor): string
    {
        if (! $encounter->isJoinable()) {
            throw new \RuntimeException('This consultation is not available to join.');
        }

        if (! $encounter->hasRoom()) {
            $room = $this->video->createRoom('encounter-' . $encounter->id);
            $encounter->update([
                'video_provider'  => 'daily',
                'video_room_name' => $room['name'],
            ]);
            $encounter->refresh();
            $roomUrl = $room['url'];
        } else {
            $roomUrl = "https://" . config('services.daily.subdomain', '') . ".daily.co/" . $encounter->video_room_name;
        }

        $token   = $this->video->createMeetingToken($encounter->video_room_name, $participantName, $isDoctor);
        $joinUrl = $this->video->joinUrl($roomUrl, $token);

        // Persist a shareable copy on the encounter so a refresh doesn't
        // need a fresh Daily API call for the *display* URL (the token
        // itself is still re-issued per join for security).
        $encounter->update($isDoctor
            ? ['video_doctor_url' => $roomUrl]
            : ['video_enrollee_url' => $roomUrl]
        );

        $encounter->markStarted();

        return $joinUrl;
    }

    /**
     * Doctor closes the consult: writes notes, follow-up advice, and any
     * prescriptions. As of Phase 3, this delegates to EmrService, which
     * is now the single canonical way any encounter - video, audio, or
     * physical - gets closed. Signature and behaviour for existing
     * telemedicine routes are unchanged.
     *
     * @param array<int, array{drug_name: string, dosage?: string, frequency?: string, duration?: string, instructions?: string}> $prescriptions
     */
    public function close(Encounter $encounter, ?string $notes, ?string $followUpAdvice, array $prescriptions, int $issuedByUserId): Encounter
    {
        return app(\App\Services\EMR\EmrService::class)->closeEncounter(
            $encounter,
            $notes,
            $followUpAdvice,
            $prescriptions,
            [], // diagnoses - not collected from the telemedicine close form yet, EMR encounters set these directly
            $issuedByUserId,
        );
    }
}
