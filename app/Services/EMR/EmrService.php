<?php
/**
 * FILE: app/Services/EMR/EmrService.php
 *
 * PHASE 3 - Mini EMR.
 *
 * This absorbs the "close an encounter" logic that used to live only in
 * TelemedicineService::close(). Reasoning: an Encounter is the same
 * record whether it came from a video call or a walk-in physical visit,
 * so closing one shouldn't be two different code paths. TelemedicineService
 * now delegates here (see the diff in that file) - existing telemedicine
 * routes and behaviour are unchanged, just internally reuse this.
 */
namespace App\Services\EMR;

use App\Models\Diagnosis;
use App\Models\Doctor;
use App\Models\Encounter;
use App\Models\HealthCareProvider;
use App\Models\Prescription;
use App\Models\TreatmentPlan;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;

class EmrService
{
    public function __construct(
        protected NotificationService $notifications,
    ) {}

    /**
     * A walk-in / in-clinic visit, started by front-desk or the doctor
     * directly - no appointment exists yet, unlike telemedicine which
     * always comes from a booking. Status starts 'in_progress' since the
     * member is physically already there.
     */
    public function createAdHocEncounter(
        HealthCareProvider $hcp,
        int $enrolleeId,
        ?int $dependentId,
        ?Doctor $doctor,
        ?string $chiefComplaint,
        int $createdByUserId,
    ): Encounter {
        return Encounter::create([
            'branch_id'       => $hcp->branch_id,
            'enrollee_id'     => $enrolleeId,
            'dependent_id'    => $dependentId,
            'hcp_id'          => $hcp->id,
            'doctor_id'       => $doctor?->id,
            'type'            => 'physical',
            'status'          => 'in_progress',
            'chief_complaint' => $chiefComplaint,
            'scheduled_at'    => now(),
            'started_at'      => now(),
            'created_by'      => $createdByUserId,
        ]);
    }

    public function addDiagnosis(Encounter $encounter, string $icd10Code, string $type = 'secondary', ?string $notes = null): Diagnosis
    {
        // Only one primary diagnosis per encounter - demote any existing one.
        if ($type === 'primary') {
            $encounter->diagnoses()->where('type', 'primary')->update(['type' => 'secondary']);
        }

        return Diagnosis::create([
            'branch_id'    => $encounter->branch_id,
            'encounter_id' => $encounter->id,
            'icd10_code'   => strtoupper($icd10Code),
            'type'         => $type,
            'notes'        => $notes,
        ]);
    }

    public function removeDiagnosis(Diagnosis $diagnosis): void
    {
        $diagnosis->delete();
    }

    public function saveTreatmentPlan(
        Encounter $encounter,
        string $planText,
        ?string $targetOutcomes,
        ?string $reviewDate,
        int $createdByUserId,
    ): TreatmentPlan {
        return TreatmentPlan::create([
            'branch_id'       => $encounter->branch_id,
            'encounter_id'    => $encounter->id,
            'plan_text'       => $planText,
            'target_outcomes' => $targetOutcomes,
            'review_date'     => $reviewDate,
            'status'          => 'active',
            'created_by'      => $createdByUserId,
        ]);
    }

    /**
     * The one canonical way to close any encounter - video, audio, or
     * physical. Writes notes, follow-up advice, diagnoses, and
     * prescriptions in a single transaction, then notifies the member.
     *
     * @param array<int, array{drug_name: string, dosage?: string, frequency?: string, duration?: string, instructions?: string}> $prescriptions
     * @param array<int, array{icd10_code: string, type?: string, notes?: string}> $diagnoses
     */
    public function closeEncounter(
        Encounter $encounter,
        ?string $notes,
        ?string $followUpAdvice,
        array $prescriptions = [],
        array $diagnoses = [],
        int $issuedByUserId = 0,
    ): Encounter {
        DB::transaction(function () use ($encounter, $notes, $followUpAdvice, $prescriptions, $diagnoses, $issuedByUserId) {
            $encounter->complete($notes, $followUpAdvice);

            foreach ($diagnoses as $dx) {
                if (empty($dx['icd10_code'])) {
                    continue;
                }
                $this->addDiagnosis($encounter, $dx['icd10_code'], $dx['type'] ?? 'secondary', $dx['notes'] ?? null);
            }

            foreach ($prescriptions as $rx) {
                if (empty($rx['drug_name'])) {
                    continue;
                }
                Prescription::create([
                    'branch_id'    => $encounter->branch_id,
                    'encounter_id' => $encounter->id,
                    'enrollee_id'  => $encounter->enrollee_id,
                    'drug_name'    => $rx['drug_name'],
                    'dosage'       => $rx['dosage'] ?? null,
                    'frequency'    => $rx['frequency'] ?? null,
                    'duration'     => $rx['duration'] ?? null,
                    'instructions' => $rx['instructions'] ?? null,
                    'status'       => 'active',
                    'issued_by'    => $issuedByUserId,
                    'issued_at'    => now(),
                ]);
            }

            if ($encounter->appointment_id) {
                $encounter->appointment()->update(['status' => 'completed']);
            }
        });

        $encounter->refresh();

        if ($encounter->enrollee?->user) {
            $this->notifications->systemNotify(
                $encounter->enrollee->user->id,
                $encounter->branch_id,
                [
                    'type'       => 'emr',
                    'severity'   => 'info',
                    'title'      => 'Your consultation notes are ready',
                    'body'       => 'Your doctor added follow-up advice' . ($prescriptions ? ' and a prescription.' : '.'),
                    'action_url' => $encounter->type === 'physical' ? '/enrollee/claims' : '/enrollee/telemedicine',
                ]
            );
        }

        return $encounter;
    }

    /**
     * Full chronological clinical history for one member - across every
     * encounter type, every HCP they've ever seen. This is what makes it
     * an EMR rather than a telemedicine log: continuity of care regardless
     * of which doctor or facility the member goes to next.
     */
    public function enrolleeHistory(int $enrolleeId)
    {
        return Encounter::where('enrollee_id', $enrolleeId)
            ->whereIn('status', ['completed', 'in_progress'])
            ->with([
                'hcp:id,name',
                'doctor:id,name,specialty',
                'diagnoses.icd10:code,description',
                'treatmentPlans',
                'prescriptions',
            ])
            ->orderByDesc('scheduled_at')
            ->get();
    }
}
