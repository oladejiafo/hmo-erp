<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE: database/migrations/2025_07_02_000001_create_plans_table.php
 *
 * Plans are the benefit packages sold to corporates.
 * Each corporate can have multiple plans (Executive, Senior Staff, Junior Staff, etc.)
 * Every enrollee must be assigned to exactly one plan under their corporate.
 *
 * Nigerian HMO context:
 *  - NHIA-regulated plans must specify a minimum benefit package
 *  - Plans drive: claim validation limits, capitation rates, dependent allowances
 *  - Pre-auth thresholds are often plan-level (e.g. surgery > ₦50k requires PA on Basic plan)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();

            // ── Ownership ─────────────────────────────────────────────────────
            $table->foreignId('corporate_id')
                  ->constrained('corporates')
                  ->cascadeOnDelete();

            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // ── Identity ──────────────────────────────────────────────────────
            $table->string('plan_name');                        // "Executive", "Senior Staff"
            $table->string('plan_code')->unique();              // e.g. "DANG-EXEC-001"
            $table->enum('plan_type', [
                'individual', 'family', 'group',
            ])->default('individual');

            $table->enum('tier', [
                'basic', 'standard', 'premium', 'executive',
            ])->default('standard');

            // ── Benefit Limits (Naira) ────────────────────────────────────────
            $table->decimal('max_benefit_value', 12, 2)->default(0);  // annual ceiling
            $table->decimal('inpatient_limit',   12, 2)->nullable();  // subset of annual
            $table->decimal('outpatient_limit',  12, 2)->nullable();  // subset of annual
            $table->decimal('surgery_limit',     12, 2)->nullable();
            $table->decimal('maternity_limit',   12, 2)->nullable();
            $table->decimal('dental_limit',      12, 2)->nullable();
            $table->decimal('optical_limit',     12, 2)->nullable();
            $table->decimal('drug_limit',        12, 2)->nullable();

            // ── Coverage Flags ─────────────────────────────────────────────────
            $table->boolean('dental_covered')    ->default(false);
            $table->boolean('optical_covered')   ->default(false);
            $table->boolean('maternity_covered') ->default(false);
            $table->boolean('surgery_covered')   ->default(true);
            $table->boolean('physiotherapy_covered')->default(false);
            $table->boolean('mental_health_covered')->default(false);

            // ── Drug Coverage ──────────────────────────────────────────────────
            $table->enum('drug_coverage', [
                'none', 'formulary', 'all',
            ])->default('formulary');   // formulary = approved drug list only

            // ── Dependent Rules ────────────────────────────────────────────────
            $table->unsignedTinyInteger('max_dependents')->nullable(); // null = unlimited
            // Nigerian standard: spouse + 4 children for most plans

            // ── Financial Controls ─────────────────────────────────────────────
            $table->decimal('copay_amount',     8, 2)->default(0);     // flat co-pay per visit
            $table->decimal('copay_percentage', 5, 2)->default(0);     // % co-pay alternative
            $table->unsignedSmallInteger('waiting_period_days')->default(0);  // days from enrollment

            // ── Pre-Auth Thresholds ────────────────────────────────────────────
            // Claims above these amounts require PA regardless of service type
            $table->decimal('preauth_threshold_inpatient',  12, 2)->nullable();
            $table->decimal('preauth_threshold_surgery',    12, 2)->nullable();
            $table->decimal('preauth_threshold_drugs',      12, 2)->nullable();

            // ── Validity ──────────────────────────────────────────────────────
            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'discontinued'])->default('active');

            // ── Meta ──────────────────────────────────────────────────────────
            $table->text('description')->nullable();
            $table->text('notes')->nullable();             // internal admin notes
            $table->unsignedInteger('enrollee_count')->default(0); // denormalised for perf

            $table->timestamps();
            $table->softDeletes();

            // ── Indexes ───────────────────────────────────────────────────────
            $table->index(['corporate_id', 'status']);
            $table->index('tier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};