<?php
/**
 * FILE: app/Models/PlanBenefitItem.php
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanBenefitItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'plan_id',
        'benefit_category',
        'benefit_name',
        'coverage_type',
        'annual_limit',
        'per_visit_limit',
        'annual_visit_limit',
        'requires_preauth',
        'waiting_period_days',
        'notes',
        'sort_order',
    ];

    protected $casts = [
        'annual_limit'       => 'decimal:2',
        'per_visit_limit'    => 'decimal:2',
        'requires_preauth'   => 'boolean',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isCovered(): bool
    {
        return $this->coverage_type !== 'not_covered';
    }

    public function getCoverageLabelAttribute(): string
    {
        return match ($this->coverage_type) {
            'covered'          => 'Covered',
            'not_covered'      => 'Not Covered',
            'limited'          => 'Limited',
            'requires_preauth' => 'Requires Pre-Auth',
            'copay_applies'    => 'Co-Pay Applies',
            default            => ucfirst($this->coverage_type),
        };
    }

    public function getCategoryLabelAttribute(): string
    {
        return match ($this->benefit_category) {
            'consultation'   => 'Consultation',
            'lab'            => 'Laboratory',
            'radiology'      => 'Radiology',
            'pharmacy'       => 'Pharmacy / Drugs',
            'surgery'        => 'Surgery',
            'maternity'      => 'Maternity',
            'inpatient'      => 'Inpatient / Admission',
            'emergency'      => 'Emergency',
            'dental'         => 'Dental',
            'optical'        => 'Optical',
            'physiotherapy'  => 'Physiotherapy',
            'mental_health'  => 'Mental Health',
            'immunisation'   => 'Immunisation',
            'family_planning'=> 'Family Planning',
            'chronic_disease'=> 'Chronic Disease',
            default          => ucfirst($this->benefit_category),
        };
    }
}