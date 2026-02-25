<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE LOCATION: database/migrations/2025_01_01_000004_add_sla_columns_to_claims.php
 *
 * Adds SLA tracking columns to the claims table.
 *
 * SLA RULES (NHIS-aligned):
 *   outpatient  → 5  business days from submission
 *   inpatient   → 10 business days from submission
 *   emergency   → 2  business days from submission
 *   surgery     → 10 business days from submission
 *   maternity   → 10 business days from submission
 *   others      → 7  business days from submission
 *
 * A claim is "breached" when it remains unresolved past sla_due_at.
 * Resolution = any terminal status: approved | rejected | paid | reversed.
 *
 * Depends on: claims table (migration 010)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {

            // When this claim must reach a terminal status by
            $table->timestamp('sla_due_at')
                  ->nullable()
                  ->after('rejected_at')
                  ->comment('Deadline for claim resolution based on type. Set on submission.');

            // Set to true by a scheduler job when now() > sla_due_at and still open
            $table->boolean('sla_breached')
                  ->default(false)
                  ->after('sla_due_at')
                  ->comment('True once sla_due_at is passed and claim is still unresolved');

            // When breach was first detected (for audit/reporting)
            $table->timestamp('sla_breached_at')
                  ->nullable()
                  ->after('sla_breached');

            // Days SLA target for this claim type (denormalised for fast reporting)
            $table->unsignedTinyInteger('sla_target_days')
                  ->default(7)
                  ->after('sla_breached_at')
                  ->comment('Business days allowed. Computed from claim_type at submission.');

            $table->index(['sla_breached', 'sla_due_at']);
            $table->index('sla_due_at');
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex(['sla_breached', 'sla_due_at']);
            $table->dropIndex(['claims_sla_due_at_index']);
            $table->dropColumn(['sla_due_at', 'sla_breached', 'sla_breached_at', 'sla_target_days']);
        });
    }
};