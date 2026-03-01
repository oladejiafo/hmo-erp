<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;
use App\Models\SystemSetting;

/**
 * FILE LOCATION: app/Models/PreAuthorisation.php
 *
 * @property int         $id
 * @property string      $pa_number
 * @property string|null $pa_code
 * @property int         $branch_id
 * @property int         $enrollee_id
 * @property int|null    $dependent_id
 * @property int         $hcp_id
 * @property string|null $attending_doctor
 * @property string      $service_type
 * @property array|null  $diagnosis_codes
 * @property string      $diagnosis_description
 * @property string|null $clinical_notes
 * @property string|null $admission_date
 * @property int|null    $expected_duration
 * @property string      $urgency
 * @property float|null  $estimated_amount
 * @property float|null  $approved_amount
 * @property int         $validity_days
 * @property Carbon|null $expires_at
 * @property string      $approval_tier
 * @property string      $status
 * @property string      $submission_channel
 * @property int|null    $submitted_by_id
 * @property int|null    $desk_approved_by_id
 * @property Carbon|null $desk_approved_at
 * @property int|null    $md_approved_by_id
 * @property Carbon|null $md_approved_at
 * @property int|null    $ceo_approved_by_id
 * @property Carbon|null $ceo_approved_at
 * @property int|null    $reviewed_by_id
 * @property Carbon|null $reviewed_at
 * @property string|null $approval_note
 * @property string|null $decline_reason
 * @property string|null $revoke_reason
 * @property int|null    $claim_id
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property Carbon|null $deleted_at
 */
class PreAuthorisation extends Model
{
    use SoftDeletes;

    protected $table = 'pre_authorisations';

    protected $fillable = [
        'pa_number',
        'pa_code',
        'branch_id',
        'enrollee_id',
        'dependent_id',
        'hcp_id',
        'attending_doctor',
        'service_type',
        'diagnosis_codes',
        'diagnosis_description',
        'clinical_notes',
        'admission_date',
        'expected_duration',
        'urgency',
        'estimated_amount',
        'approved_amount',
        'validity_days',
        'expires_at',
        'approval_tier',
        'status',
        'submission_channel',
        'submitted_by_id',
        'desk_approved_by_id',
        'desk_approved_at',
        'md_approved_by_id',
        'md_approved_at',
        'ceo_approved_by_id',
        'ceo_approved_at',
        'reviewed_by_id',
        'reviewed_at',
        'approval_note',
        'decline_reason',
        'revoke_reason',
        'claim_id',
    ];

    protected $casts = [
        'diagnosis_codes'    => 'array',
        'estimated_amount'   => 'float',
        'approved_amount'    => 'float',
        'expires_at'         => 'datetime',
        'desk_approved_at'   => 'datetime',
        'md_approved_at'     => 'datetime',
        'ceo_approved_at'    => 'datetime',
        'reviewed_at'        => 'datetime',
    ];

    // // ── TAT Thresholds (minutes) ───────────────────────────────────────────
    // const TAT_THRESHOLDS = [
    //     'standard'  => ['warn' => 15,  'limit' => 30],
    //     'urgent'    => ['warn' => 30,  'limit' => 60],
    //     'emergency' => ['warn' => 720, 'limit' => 1440], // 12h warn, 24h limit
    // ];

    // // ── Approval Amount Thresholds ────────────────────────────────────────
    // const TIER_MD_THRESHOLD  = 500_000;
    // const TIER_CEO_THRESHOLD = 2_000_000;

    public static function getTatThresholds(): array
    {
        return [
            'standard' => [
                'warn'  => SystemSetting::get('pre_auth.standard_warn_minutes',  15),
                'limit' => SystemSetting::get('pre_auth.standard_limit_minutes', 30),
            ],
            'urgent' => [
                'warn'  => SystemSetting::get('pre_auth.urgent_warn_minutes',  30),
                'limit' => SystemSetting::get('pre_auth.urgent_limit_minutes', 60),
            ],
            'emergency' => [
                'warn'  => SystemSetting::get('pre_auth.emergency_warn_minutes',  720),
                'limit' => SystemSetting::get('pre_auth.emergency_limit_minutes', 1440),
            ],
        ];
    }

    public static function getTierMdThreshold(): int
    {
        return SystemSetting::get('financial.pa_md_threshold', 500000);
    }

    public static function getTierCeoThreshold(): int
    {
        return SystemSetting::get('financial.pa_ceo_threshold', 2000000);
    }


    // ── Active statuses (TAT clock running) ───────────────────────────────
    const ACTIVE_STATUSES = [
        'pending',
        'awaiting_md',
        'awaiting_ceo',
        'emergency_retrospective',
    ];

    // ─────────────────────────────────────────────────────────────────────
    // RELATIONSHIPS
    // ─────────────────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
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
        return $this->belongsTo(HCP::class, 'hcp_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by_id');
    }

    public function deskApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'desk_approved_by_id');
    }

    public function mdApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'md_approved_by_id');
    }

    public function ceoApprovedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ceo_approved_by_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(PATimeline::class, 'pre_authorisation_id')->orderBy('created_at');
    }

    // ─────────────────────────────────────────────────────────────────────
    // SCOPES
    // ─────────────────────────────────────────────────────────────────────

    /** PAs currently requiring a human decision */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', self::ACTIVE_STATUSES);
    }

    /** PAs past their NHIA TAT threshold */
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where(function ($q) {
            // Standard: older than 30 minutes
            $q->where('urgency', 'standard')
              ->where('created_at', '<', now()->subMinutes(30));
        })->orWhere(function ($q) {
            // Urgent: older than 60 minutes
            $q->where('urgency', 'urgent')
              ->where('created_at', '<', now()->subMinutes(60));
        })->orWhere(function ($q) {
            // Emergency retrospective: older than 24 hours
            $q->where('urgency', 'emergency')
            //   ->where('created_at', '<', now()->subHours(24));
              ->where('created_at', '<', now()->subHours(
                SystemSetting::get('operational.pa_retrospective_emergency_hours', 24)
              ));
            
        })->whereIn('status', self::ACTIVE_STATUSES);
    }

    /** Approved PAs whose validity window has elapsed */
    public function scopeExpirable(Builder $query): Builder
    {
        return $query->where('status', 'approved')
                     ->whereNotNull('expires_at')
                     ->where('expires_at', '<', now());
    }

    /** Filter by branch */
    public function scopeForBranch(Builder $query, int $branchId): Builder
    {
        return $query->where('branch_id', $branchId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // COMPUTED / HELPER ATTRIBUTES
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Minutes elapsed since PA was submitted.
     * Used by the frontend TAT clock.
     */
    public function getAgeMinutesAttribute(): int
    {
        return (int) $this->created_at->diffInMinutes(now());
    }

    /**
     * Minutes from submission to final review decision.
     * NULL while still active.
     */
    public function getResponseMinutesAttribute(): ?int
    {
        if (! $this->reviewed_at) {
            return null;
        }
        return (int) $this->created_at->diffInMinutes($this->reviewed_at);
    }

    /**
     * TAT status for this PA: 'safe' | 'warning' | 'danger'
     */
    public function getTatStatusAttribute(): string
    {
        if (! in_array($this->status, self::ACTIVE_STATUSES)) {
            return 'resolved';
        }
        // $thresholds = self::TAT_THRESHOLDS[$this->urgency] ?? self::TAT_THRESHOLDS['standard'];
        $all = static::getTatThresholds();
        $thresholds = $all[$this->urgency] ?? $all['standard'];

        $age        = $this->age_minutes;

        if ($age >= $thresholds['limit']) return 'danger';
        if ($age >= $thresholds['warn'])  return 'warning';
        return 'safe';
    }

    /**
     * Whether this PA is past its NHIA TAT limit.
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->tat_status === 'danger';
    }

    /**
     * Human-readable label for the service type.
     */
    public function getServiceTypeLabelAttribute(): string
    {
        return match ($this->service_type) {
            'inpatient_admission'  => 'Inpatient Admission / Hospitalisation',
            'surgical_procedure'   => 'Surgical Procedure',
            'mri_ct_scan'          => 'MRI / CT Scan',
            'specialist_referral'  => 'Specialist Consultation (Referred)',
            'physiotherapy'        => 'Physiotherapy (Course)',
            'chemotherapy'         => 'Chemotherapy / Oncology',
            'dialysis'             => 'Renal Dialysis',
            'maternity_admission'  => 'Maternity Admission / Delivery',
            'major_investigation'  => 'Major Diagnostic Investigation',
            'prosthetics'          => 'Prosthetics / Orthopaedic Implants',
            'chronic_drugs'        => 'Chronic Medication (New Registration)',
            'dental_major'         => 'Major Dental (Extraction, Root Canal)',
            'optical'              => 'Optical / Spectacles',
            'other'                => 'Other',
            default                => ucwords(str_replace('_', ' ', $this->service_type)),
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // BUSINESS LOGIC HELPERS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Determine the required approval tier from an amount.
     */
    public static function tierFromAmount(?float $amount): string
    {
        if (! $amount || $amount <= 0)                  return 'standard';
        // if ($amount > self::TIER_CEO_THRESHOLD)         return 'ceo';
        if ($amount >= static::getTierCeoThreshold())   return 'ceo';
        if ($amount >= static::getTierMdThreshold())       return 'md';
        return 'standard';
    }

    /**
     * Generate a unique, sequential PA number.
     * Format: PA-YYYY-NNNNNNN  (e.g. PA-2025-0000042)
     * Thread-safe: uses DB-level lock.
     */
    public static function generatePANumber(): string
    {
        $year  = now()->year;
        $count = static::withTrashed()->whereYear('created_at', $year)->lockForUpdate()->count();
        $seq   = str_pad($count + 1, 7, '0', STR_PAD_LEFT);
        return "PA-{$year}-{$seq}";
    }

    /**
     * Generate a PA approval code (same format, different namespace).
     * Called only at final approval.
     */
    public static function generatePACode(): string
    {
        $year  = now()->year;
        $count = static::withTrashed()
                        ->whereYear('created_at', $year)
                        ->whereNotNull('pa_code')
                        ->lockForUpdate()
                        ->count();
        $seq = str_pad($count + 1, 7, '0', STR_PAD_LEFT);
        return "PA-{$year}-{$seq}";
    }

    /**
     * Append an event to this PA's timeline.
     */
    public function logEvent(
        string  $event,
        ?string $eventLabel = null,
        ?int    $actorId    = null,
        ?string $actorName  = null,
        ?string $note       = null,
        ?array  $meta       = null
    ): PATimeline {
        return $this->timeline()->create([
            'event'        => $event,
            'event_label'  => $eventLabel ?? ucwords(str_replace('_', ' ', $event)),
            'actor_id'     => $actorId,
            'actor_name'   => $actorName,
            'note'         => $note,
            'status_after' => $this->status,
            'meta'         => $meta,
        ]);
    }
}