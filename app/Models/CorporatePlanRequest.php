<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CorporatePlanRequest extends Model
{
    protected $fillable = [
        'corporate_id', 'requested_by_user_id', 'plan_name', 'tier',
        'expected_employee_count', 'budget_cap', 'selected_benefits',
        'estimated_annual_premium', 'estimated_max_benefit_value',
        'status', 'reviewed_by', 'reviewed_at', 'reviewer_notes', 'resulting_plan_id',
    ];

    protected $casts = [
        'selected_benefits' => 'array',
        'budget_cap' => 'decimal:2',
        'estimated_annual_premium' => 'decimal:2',
        'estimated_max_benefit_value' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    /**
     * ESTIMATE ONLY, clearly not actuarial pricing. There's no rating
     * engine in this codebase to hook into — this is a per-employee base
     * rate by tier, adjusted by a flat percentage per selected benefit,
     * so HR gets a rough, directional number while building their request,
     * not a real quote. Staff set the real premium when they convert this
     * into an actual Plan. Tune the constants below once you have real
     * pricing data to calibrate against — right now they're reasonable
     * placeholders, not derived from anything.
     */
    public static function estimate(string $tier, int $employeeCount, array $selectedBenefits): array
    {
        $baseRatePerEmployee = match ($tier) {
            'basic' => 45000,
            'standard' => 75000,
            'premium' => 130000,
            'executive' => 220000,
            default => 75000,
        };

        $benefitLoadingPercent = 0;
        $loadings = [
            'dental_covered' => 5, 'optical_covered' => 5, 'maternity_covered' => 12,
            'surgery_covered' => 10, 'physiotherapy_covered' => 6, 'mental_health_covered' => 8,
        ];
        foreach ($loadings as $key => $percent) {
            if (!empty($selectedBenefits[$key])) {
                $benefitLoadingPercent += $percent;
            }
        }

        $perEmployeePremium = $baseRatePerEmployee * (1 + $benefitLoadingPercent / 100);
        $annualPremium = round($perEmployeePremium * $employeeCount, 2);

        $maxBenefitValue = match ($tier) {
            'basic' => 500000,
            'standard' => 1000000,
            'premium' => 2500000,
            'executive' => 5000000,
            default => 1000000,
        };

        return [
            'estimated_annual_premium' => $annualPremium,
            'estimated_max_benefit_value' => $maxBenefitValue,
            'per_employee_premium' => round($perEmployeePremium, 2),
        ];
    }

    public function corporate(): BelongsTo
    {
        return $this->belongsTo(Corporate::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function resultingPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'resulting_plan_id');
    }
}
