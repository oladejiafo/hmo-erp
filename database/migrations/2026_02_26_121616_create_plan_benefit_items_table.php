<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE: database/migrations/2025_07_02_000002_create_plan_benefit_items_table.php
 *
 * Granular per-service benefit definitions for each plan.
 * These drive claim validation - if a service is not in the benefit items
 * or is marked 'not_covered', the claim is auto-rejected.
 *
 * Examples:
 *   plan_id=1, category=consultation,  benefit_name="GP Consultation",    coverage=covered,  per_visit_limit=5000
 *   plan_id=1, category=lab,           benefit_name="Full Blood Count",    coverage=covered,  annual_limit=50000
 *   plan_id=1, category=surgery,       benefit_name="Appendectomy",        coverage=limited,  per_visit_limit=200000, requires_preauth=true
 *   plan_id=1, category=dental,        benefit_name="Dental (General)",    coverage=not_covered
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_benefit_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('plan_id')
                  ->constrained('plans')
                  ->cascadeOnDelete();

            // ── Service classification ─────────────────────────────────────────
            $table->enum('benefit_category', [
                'consultation',         // GP / specialist visits
                'lab',                  // investigations
                'radiology',            // X-ray, MRI, CT
                'pharmacy',             // drugs
                'surgery',              // procedures
                'maternity',            // ANC, delivery
                'inpatient',            // admission / ward
                'emergency',            // A&E
                'dental',
                'optical',
                'physiotherapy',
                'mental_health',
                'immunisation',
                'family_planning',
                'chronic_disease',      // DM, HTN management
                'other',
            ]);

            $table->string('benefit_name');   // human-readable: "MRI Scan", "Normal Delivery"

            // ── Coverage decision ──────────────────────────────────────────────
            $table->enum('coverage_type', [
                'covered',          // fully covered up to limit
                'not_covered',      // excluded
                'limited',          // covered but capped
                'requires_preauth', // covered but PA mandatory
                'copay_applies',    // covered with patient co-pay
            ])->default('covered');

            // ── Financial limits ───────────────────────────────────────────────
            $table->decimal('annual_limit',    12, 2)->nullable();  // null = up to plan ceiling
            $table->decimal('per_visit_limit', 12, 2)->nullable();  // per-encounter cap
            $table->unsignedSmallInteger('annual_visit_limit')->nullable(); // max visits/year

            // ── Controls ──────────────────────────────────────────────────────
            $table->boolean('requires_preauth')->default(false);
            $table->unsignedSmallInteger('waiting_period_days')->default(0);

            $table->text('notes')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->timestamps();

            // ── Indexes ───────────────────────────────────────────────────────
            $table->index(['plan_id', 'benefit_category']);
            $table->unique(['plan_id', 'benefit_name']);  // no duplicate items per plan
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_benefit_items');
    }
};