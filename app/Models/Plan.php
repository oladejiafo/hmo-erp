<?php
/**
 * FILE: app/Models/Plan.php
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Plan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'corporate_id',
        'created_by',
        'plan_name',
        'plan_code',
        'plan_type',
        'tier',
        'max_benefit_value',
        'inpatient_limit',
        'outpatient_limit',
        'surgery_limit',
        'maternity_limit',
        'dental_limit',
        'optical_limit',
        'drug_limit',
        'dental_covered',
        'optical_covered',
        'maternity_covered',
        'surgery_covered',
        'physiotherapy_covered',
        'mental_health_covered',
        'drug_coverage',
        'max_dependents',
        'copay_amount',
        'copay_percentage',
        'waiting_period_days',
        'preauth_threshold_inpatient',
        'preauth_threshold_surgery',
        'preauth_threshold_drugs',
        'effective_date',
        'expiry_date',
        'status',
        'description',
        'notes',
        'enrollee_count',
    ];

    protected $casts = [
        'max_benefit_value'            => 'decimal:2',
        'inpatient_limit'              => 'decimal:2',
        'outpatient_limit'             => 'decimal:2',
        'surgery_limit'                => 'decimal:2',
        'maternity_limit'              => 'decimal:2',
        'dental_limit'                 => 'decimal:2',
        'optical_limit'                => 'decimal:2',
        'drug_limit'                   => 'decimal:2',
        'dental_covered'               => 'boolean',
        'optical_covered'              => 'boolean',
        'maternity_covered'            => 'boolean',
        'surgery_covered'              => 'boolean',
        'physiotherapy_covered'        => 'boolean',
        'mental_health_covered'        => 'boolean',
        'copay_amount'                 => 'decimal:2',
        'copay_percentage'             => 'decimal:2',
        'preauth_threshold_inpatient'  => 'decimal:2',
        'preauth_threshold_surgery'    => 'decimal:2',
        'preauth_threshold_drugs'      => 'decimal:2',
        'effective_date'               => 'date',
        'expiry_date'                  => 'date',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function corporate(): BelongsTo
    {
        return $this->belongsTo(Corporate::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function enrollees(): HasMany
    {
        return $this->hasMany(Enrollee::class);
    }

    public function benefitItems(): HasMany
    {
        return $this->hasMany(PlanBenefitItem::class)->orderBy('sort_order')->orderBy('benefit_category');
    }

        public function scopeBaseHmoPlans($query)
    {
        return $query->whereNull('corporate_id');
    }

    public static function baseDefault(): ?self
    {
        return static::whereNull('corporate_id')
            ->where('is_default', true)
            ->where('status', 'active')
            ->first();
    }

    public function isBasePlan(): bool
    {
        return $this->corporate_id === null;
    }
    
    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForCorporate($query, int $corporateId)
    {
        return $query->where('corporate_id', $corporateId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Auto-generate a plan code if not provided.
     * e.g. "DANG-EXEC-001"
     */
    public static function generateCode(string $corporateCode, string $planName): string
    {
        $prefix = strtoupper(substr($corporateCode, 0, 4));
        $name   = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $planName), 0, 4));
        $suffix = str_pad(mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
        return "{$prefix}-{$name}-{$suffix}";
    }

    /**
     * Whether a given claim amount requires pre-auth for inpatient admissions.
     */
    public function requiresPreAuthForInpatient(float $amount): bool
    {
        if ($this->preauth_threshold_inpatient === null) return false;
        return $amount >= $this->preauth_threshold_inpatient;
    }

    public function requiresPreAuthForSurgery(float $amount): bool
    {
        if ($this->preauth_threshold_surgery === null) return false;
        return $amount >= $this->preauth_threshold_surgery;
    }

    /**
     * Whether a service category is covered by this plan at all.
     */
    public function isCategoryAllowed(string $category): bool
    {
        return match ($category) {
            'dental'          => $this->dental_covered,
            'optical'         => $this->optical_covered,
            'maternity'       => $this->maternity_covered,
            'surgery'         => $this->surgery_covered,
            'physiotherapy'   => $this->physiotherapy_covered,
            'mental_health'   => $this->mental_health_covered,
            default           => true,
        };
    }

    public function syncEnrolleeCount(): void
    {
        $this->update([
            'enrollee_count' => $this->enrollees()->count(),
        ]);
    }

    public function getStatusLabelAttribute(): string
    {
        return ucfirst($this->status);
    }

    public function getTierLabelAttribute(): string
    {
        return ucfirst($this->tier);
    }
}