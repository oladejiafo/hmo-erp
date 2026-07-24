<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Corporate;
use App\Models\Plan;

/**
 * Backfills the retail starter plans (seeded in
 * 2026_07_28_000001_seed_retail_corporate_and_plans.php) with real
 * annual_premium + is_public/is_default now that those columns exist.
 * Separate migration rather than editing the already-applied Phase 9 one.
 */
return new class extends Migration
{
    public function up(): void
    {
        $retail = Corporate::where('code', 'RETAIL-001')->first();
        if (! $retail) {
            return;
        }

        $pricing = ['basic' => 45000, 'standard' => 85000, 'premium' => 160000];

        foreach ($pricing as $tier => $price) {
            Plan::where('corporate_id', $retail->id)
                ->where('tier', $tier)
                ->update([
                    'annual_premium' => $price,
                    'is_public' => true,
                    'is_default' => $tier === 'standard',
                ]);
        }
    }

    public function down(): void
    {
        // Nothing to revert - column removal handled by the parent migration's down().
    }
};
