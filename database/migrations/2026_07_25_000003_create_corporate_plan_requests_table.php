<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Plan customization + budgeting" self-service builder. Deliberately a
 * REQUEST, not direct creation of a live `Plan` row. Plan changes carry
 * real actuarial/financial exposure for the HMO (premium, benefit ceilings,
 * pre-auth thresholds) — the same reason `Plan::create()` sits behind
 * `plans.create` staff permission today. HR gets a builder that computes a
 * live estimate as they toggle benefits, submits it, and staff reviews and
 * either converts it into a real `Plan` (via the existing
 * `CorporatePlanController::store()`) or rejects with a reason.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('corporate_plan_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('corporate_id')->constrained('corporates');
            $table->foreignId('requested_by_user_id')->constrained('users');

            $table->string('plan_name');
            $table->string('tier', 20)->default('standard');
            // matches plans.tier: basic | standard | premium | executive

            $table->unsignedInteger('expected_employee_count')->default(1);
            $table->decimal('budget_cap', 15, 2)->nullable();
            // what HR is willing/able to spend annually — not a system limit,
            // just their target, shown alongside the estimate so they can
            // adjust benefit selections to fit it

            $table->json('selected_benefits');
            // dental_covered, optical_covered, maternity_covered, etc —
            // same flag names as the `plans` table so a straight mapping
            // exists when staff convert this into a real Plan

            $table->decimal('estimated_annual_premium', 15, 2)->nullable();
            $table->decimal('estimated_max_benefit_value', 15, 2)->nullable();

            $table->string('status', 20)->default('draft');
            // draft | submitted | approved | rejected

            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->foreignId('resulting_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            // set once staff approves and creates the real Plan — links the
            // request to what it became, for HR to see it wasn't lost

            $table->timestamps();

            $table->index(['corporate_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corporate_plan_requests');
    }
};
