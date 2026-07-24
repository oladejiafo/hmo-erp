<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Plan;

/**
 * plans.corporate_id was required NOT NULL, no way to represent a true
 * HMO-wide base plan. This makes it nullable: corporate_id = NULL means
 * an HMO-owned base plan, available as the fallback for any corporate or
 * individual with no plan of their own. The Retail pseudo-corporate
 * (Phase 9) is untouched, it still owns its own retail-tier plans, this
 * is a separate additional concept for corporates who never defined a
 * plan of their own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropForeign(['corporate_id']);
        });
        Schema::table('plans', function (Blueprint $table) {
            $table->foreignId('corporate_id')->nullable()->change();
            $table->foreign('corporate_id')->references('id')->on('corporates')->cascadeOnDelete();
        });

        if (! Plan::whereNull('corporate_id')->exists()) {
            Plan::create([
                'corporate_id' => null,
                'created_by' => null,
                'plan_name' => 'HMO Standard Plan',
                'plan_code' => 'BASE-STD-001',
                'plan_type' => 'individual',
                'tier' => 'standard',
                'max_benefit_value' => 1000000,
                'annual_premium' => 85000,
                'dental_covered' => true,
                'optical_covered' => true,
                'surgery_covered' => true,
                'max_dependents' => 4,
                'is_public' => true,
                'is_default' => true,
                'effective_date' => now(),
                'status' => 'active',
                'description' => 'Default HMO-wide plan, the fallback for any corporate or individual with no plan of their own.',
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropForeign(['corporate_id']);
        });
        DB::table('plans')->whereNull('corporate_id')->delete();
        Schema::table('plans', function (Blueprint $table) {
            $table->foreignId('corporate_id')->nullable(false)->change();
            $table->foreign('corporate_id')->references('id')->on('corporates')->cascadeOnDelete();
        });
    }
};
