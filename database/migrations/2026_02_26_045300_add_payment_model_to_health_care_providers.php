<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: add_payment_model_to_health_care_providers
 *
 * Adds payment_model to health_care_providers so each HCP can be
 * classified as:
 *   - capitation   : paid via monthly capitation run (default, existing behaviour)
 *   - fee_for_service : paid exclusively via claim batches, excluded from capitation runs
 *   - hybrid       : both; receives capitation AND has FFS claims batched separately
 *
 * Also adds ffs_tariff_enforced flag - when true, claims from this HCP
 * are validated strictly against the agreed tariff schedule (no tolerance buffer).
 *
 * Run: php artisan migrate
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('health_care_providers', function (Blueprint $table) {

            // ── Core FFS field ────────────────────────────────────────────
            $table->enum('payment_model', ['capitation', 'fee_for_service', 'hybrid'])
                  ->default('capitation')
                  ->after('tier')
                  ->comment('capitation = monthly headcount run | fee_for_service = claim batches only | hybrid = both');

            // ── Tariff enforcement flag ───────────────────────────────────
            $table->boolean('ffs_tariff_enforced')
                  ->default(true)
                  ->after('payment_model')
                  ->comment('When true, FFS claims validated strictly against agreed tariff (zero tolerance)');

            // ── Optional: FFS contract reference ─────────────────────────
            $table->string('ffs_contract_ref', 100)
                  ->nullable()
                  ->after('ffs_tariff_enforced')
                  ->comment('Reference number of the signed FFS agreement');

            $table->date('ffs_contract_start')
                  ->nullable()
                  ->after('ffs_contract_ref');

            $table->date('ffs_contract_end')
                  ->nullable()
                  ->after('ffs_contract_start');
        });

        // ── Index for fast capitation-run queries ─────────────────────────
        // The generate-run query filters: WHERE payment_model IN ('capitation','hybrid')
        Schema::table('health_care_providers', function (Blueprint $table) {
            $table->index(['payment_model', 'status'], 'hcps_payment_model_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('health_care_providers', function (Blueprint $table) {
            $table->dropIndex('hcps_payment_model_status_idx');
            $table->dropColumn([
                'payment_model',
                'ffs_tariff_enforced',
                'ffs_contract_ref',
                'ffs_contract_start',
                'ffs_contract_end',
            ]);
        });
    }
};