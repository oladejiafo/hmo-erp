<?php
/**
 * FILE: app/Models/Encounter.php
 *
 * FIX (see inline note on the branch() method): originally used the
 * BelongsToBranch trait, which silently attaches a global scope filtering
 * every query by Auth::user()->branch_id (unless the user's branch.type
 * is literally 'HQ'). That's correct for branch-owned operational data
 * (claims, payments), but wrong here: an encounter belongs to the
 * enrollee, not to whichever branch the viewing user's login happens to
 * be tagged with. The real, intentional scope on every query in this
 * file is already enrollee_id - that's what actually controls visibility.
 * Stacking a second, silent branch filter on top caused encounters to
 * vanish from a member's own Telemedicine list whenever their user
 * record's branch_id didn't exactly match the branch the encounter was
 * created under, and would have done the same for
 * EmrService::enrolleeHistory() across facilities - which defeats the
 * actual purpose of Mini EMR (continuity of care across branches).
 */
namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Encounter extends Model
{
    use HasAuditLog;

    protected $fillable = [
        'branch_id', 'appointment_id', 'enrollee_id', 'dependent_id',
        'hcp_id', 'doctor_id', 'type', 'status',
        'chief_complaint', 'consultation_notes', 'follow_up_advice',
        'video_provider', 'video_room_name', 'video_enrollee_url', 'video_doctor_url',
        'scheduled_at', 'started_at', 'ended_at', 'duration_seconds', 'created_by',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at'   => 'datetime',
        'ended_at'     => 'datetime',
    ];

    // ── Relationships ────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function dependent(): BelongsTo
    {
        return $this->belongsTo(Dependent::class);
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    // PHASE 3 - Mini EMR
    public function diagnoses(): HasMany
    {
        return $this->hasMany(Diagnosis::class);
    }

    public function treatmentPlans(): HasMany
    {
        return $this->hasMany(TreatmentPlan::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── State helpers ───────────────────────────────────────────────────

    public function isJoinable(): bool
    {
        return in_array($this->status, ['scheduled', 'waiting', 'in_progress'], true);
    }

    public function hasRoom(): bool
    {
        return ! empty($this->video_room_name);
    }

    public function markStarted(): void
    {
        if ($this->status === 'scheduled' || $this->status === 'waiting') {
            $this->update([
                'status'     => 'in_progress',
                'started_at' => $this->started_at ?? now(),
            ]);
        }
    }

    public function complete(?string $notes, ?string $followUpAdvice): void
    {
        $endedAt = now();

        $this->update([
            'status'             => 'completed',
            'consultation_notes' => $notes,
            'follow_up_advice'   => $followUpAdvice,
            'ended_at'           => $endedAt,
            'duration_seconds'   => $this->started_at
                ? $endedAt->diffInSeconds($this->started_at)
                : null,
        ]);
    }
}
