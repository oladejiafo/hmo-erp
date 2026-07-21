<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Branch;
use App\Models\Corporate;
use App\Models\Plan;
use Illuminate\Support\Facades\DB;

/**
 * Retail / individual self-enrolment structural fix.
 *
 * Both `plans.corporate_id` and `enrollees.corporate_id` are required,
 * not nullable (verified real migrations) — there's no way to represent
 * "this person has no employer" in the current schema. Making either
 * column nullable is a much bigger, riskier change (every existing query
 * that joins/filters on corporate_id would need auditing). The safer,
 * additive fix: one reserved "Retail / Individual Members" Corporate row
 * that every self-enrolled individual attaches to — real HMOs commonly
 * group direct/individual policies into a "retail book of business"
 * administratively anyway, so this isn't a hack, it's a legitimate model
 * of how individual policies actually get organized.
 *
 * Idempotent — safe to run more than once, uses firstOrCreate throughout.
 */
return new class extends Migration
{
    public function up(): void
    {
        $hqBranch = Branch::where('type', 'HQ')->first() ?? Branch::first();

        if (! $hqBranch) {
            // No branches exist yet — nothing to attach the retail
            // corporate to. Skip silently; re-run this migration (or seed
            // manually) once at least one branch exists.
            return;
        }

        $retailCorporate = Corporate::firstOrCreate(
            ['code' => 'RETAIL-001'],
            [
                'branch_id' => $hqBranch->id,
                'name' => 'Individual / Retail Members',
                'rc_number' => 'N/A',
                'industry' => 'Individual',
                'status' => 'active',
                'contract_start_date' => now(),
                'contract_end_date' => now()->addYears(50),
                // 50 years = effectively no corporate-level contract
                // renewal cycle for this pseudo-corporate; individual
                // enrollees have their own real expiry_date on the
                // Enrollee record, that's what actually governs their
                // coverage, not this placeholder.
            ]
        );

        $starterPlans = [
            ['tier' => 'basic',     'plan_name' => 'Retail Basic',     'max_benefit_value' => 500000],
            ['tier' => 'standard',  'plan_name' => 'Retail Standard',  'max_benefit_value' => 1000000],
            ['tier' => 'premium',   'plan_name' => 'Retail Premium',   'max_benefit_value' => 2500000],
        ];

        foreach ($starterPlans as $planData) {
            Plan::firstOrCreate(
                ['corporate_id' => $retailCorporate->id, 'tier' => $planData['tier'], 'plan_type' => 'individual'],
                [
                    'created_by' => null,
                    'plan_name' => $planData['plan_name'],
                    'plan_code' => Plan::generateCode($retailCorporate->code, $planData['plan_name']),
                    'max_benefit_value' => $planData['max_benefit_value'],
                    'dental_covered' => $planData['tier'] !== 'basic',
                    'optical_covered' => $planData['tier'] !== 'basic',
                    'surgery_covered' => true,
                    'max_dependents' => 4,
                    'effective_date' => now(),
                    'status' => 'active',
                    'description' => 'Individual retail plan — self-enrolment.',
                ]
            );
        }
    }

    public function down(): void
    {
        $retailCorporate = Corporate::where('code', 'RETAIL-001')->first();
        if ($retailCorporate) {
            Plan::where('corporate_id', $retailCorporate->id)->delete();
            // Corporate row itself left in place — deleting it could
            // cascade/restrict against real enrollees who signed up
            // through it. Manual cleanup only, on purpose.
        }
    }
};
