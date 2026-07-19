<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * CORRECTION — found while building Corporate Portal, not related to it.
 *
 * `enrollees.plan_id` is still FK'd to `corporate_plans` (verified real
 * migration). But `Corporate::plans()`/`activePlans()` and every actual
 * plan-management screen (`CorporatePlanController`) were already migrated
 * to use the richer `Plan` model instead — someone did that migration and
 * left the old relation methods commented out right above the new ones.
 * `enrollees.plan_id`'s foreign key constraint just never got updated to
 * match.
 *
 * Practical effect: `Enrollee::plan()` (`belongsTo(Plan::class)`) queries
 * the `plans` table using an ID that's constrained to only ever reference
 * `corporate_plans`. Any enrollee whose plan_id doesn't happen to
 * coincidentally exist as a row in BOTH tables is either failing to save
 * (constraint violation) or displaying the wrong plan everywhere
 * (dashboard, ID card, benefits, claims) if the IDs collide by chance.
 *
 * This migration:
 * 1. Nulls out any plan_id that doesn't exist in `plans` (defensive —
 *    can't point a new constraint at data that would violate it)
 * 2. Drops the old FK to `corporate_plans`
 * 3. Adds the correct FK to `plans`
 *
 * READ STEP 1'S OUTPUT before running this on production. If it nulls out
 * a meaningful number of enrollees' plans, that's real data that needs a
 * manual audit/backfill — this migration can't guess what the correct
 * `plans` row for each orphaned enrollee should be, only make the schema
 * consistent going forward.
 */
return new class extends Migration
{
    public function up(): void
    {
        $orphaned = DB::table('enrollees')
            ->whereNotNull('plan_id')
            ->whereNotIn('plan_id', function ($query) {
                $query->select('id')->from('plans');
            })
            ->count();

        if ($orphaned > 0) {
            \Illuminate\Support\Facades\Log::warning(
                "[plan_id FK fix] {$orphaned} enrollee(s) have a plan_id not present in the plans table. Nulling before adding the correct constraint — these need manual review to reassign the correct plan."
            );

            DB::table('enrollees')
                ->whereNotNull('plan_id')
                ->whereNotIn('plan_id', function ($query) {
                    $query->select('id')->from('plans');
                })
                ->update(['plan_id' => null]);
        }

        Schema::table('enrollees', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
        });

        Schema::table('enrollees', function (Blueprint $table) {
            $table->foreign('plan_id')->references('id')->on('plans')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('enrollees', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
        });

        Schema::table('enrollees', function (Blueprint $table) {
            $table->foreign('plan_id')->references('id')->on('corporate_plans')->nullOnDelete();
        });
    }
};
