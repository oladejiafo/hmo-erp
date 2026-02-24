<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE LOCATION: database/migrations/2025_01_01_000003_create_capitation_tables.php
 *
 * Creates and enhances tables for the Capitation module:
 *
 *   1. hcp_capitation_rates  — agreed monthly rate per HCP (set once, used each run)
 *   2. capitation_runs       — one record per monthly run (the "batch header")
 *   3. Alter capitation_records — add run_id, reconciliation columns
 *   4. Alter payment_batches  — add batch_type (claims | capitation)
 *
 * Capitation lifecycle:
 *   HQ/Finance generates a run for a period (e.g. June 2025)
 *     → system snapshots headcount per HCP (principals + dependants)
 *     → applies agreed rate_per_member from hcp_capitation_rates
 *     → creates one capitation_record per HCP (line items)
 *   Finance reviews and approves the run
 *     → system creates a payment_batch (type='capitation') with the total
 *     → payment_batch flows through existing approval/export process
 *
 * Depends on: branches, health_care_providers, users, payment_batches
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. hcp_capitation_rates ───────────────────────────────────────────
        // Stores the agreed monthly capitation rate per HCP.
        // A rate is valid between effective_from and effective_to.
        // Only one active rate per HCP at any time (enforced in controller).
        Schema::create('hcp_capitation_rates', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('hcp_id');
            $table->foreign('hcp_id')->references('id')->on('health_care_providers')->cascadeOnDelete();

            $table->foreignId('branch_id')->constrained()->restrictOnDelete();

            // Rate per enrolled principal member (₦ per month)
            $table->decimal('rate_per_principal', 12, 2)
                  ->comment('Monthly capitation per primary enrollee (₦)');

            // Dependant rate — often same as principal, sometimes lower
            $table->decimal('rate_per_dependent', 12, 2)
                  ->comment('Monthly capitation per dependant (₦)');

            // HCP tier at time of rate agreement (snapshot — HCP tier can change)
            $table->enum('tier', ['primary', 'secondary', 'tertiary'])->default('primary');

            // Validity window for this rate
            $table->date('effective_from');
            $table->date('effective_to')->nullable(); // NULL = open-ended (current rate)

            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Indexes
            $table->index(['hcp_id', 'is_active']);
            $table->index(['branch_id', 'is_active']);
            $table->index('effective_from');
        });


        // ── 2. capitation_runs ────────────────────────────────────────────────
        // One row = one monthly capitation run for a branch.
        // It groups all capitation_records for that period.
        Schema::create('capitation_runs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('branch_id')->constrained()->restrictOnDelete();

            // Period this run covers (e.g. month=6, year=2025 → June 2025)
            $table->unsignedTinyInteger('period_month');
            $table->unsignedSmallInteger('period_year');

            // Lifecycle: draft → approved → paid
            $table->enum('status', ['draft', 'approved', 'paid'])->default('draft');

            // Summary totals (denormalised for quick display without joining records)
            $table->unsignedInteger('total_hcp_count')->default(0)
                  ->comment('Number of HCPs included in this run');
            $table->unsignedInteger('total_principal_count')->default(0)
                  ->comment('Total active principal enrollees across all HCPs');
            $table->unsignedInteger('total_dependent_count')->default(0)
                  ->comment('Total active dependants across all HCPs');
            $table->unsignedInteger('total_member_count')->default(0)
                  ->comment('Principals + Dependants');
            $table->decimal('total_amount', 15, 2)->default(0)
                  ->comment('Sum of all capitation_records for this run');

            // Reconciliation vs previous month
            $table->integer('member_variance')->default(0)
                  ->comment('total_member_count minus previous month count (signed)');

            // Who generated and approved
            $table->foreignId('generated_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();

            // Linked payment batch (set when approved → paid)
            $table->unsignedBigInteger('payment_batch_id')->nullable();
            $table->foreign('payment_batch_id')->references('id')->on('payment_batches')->nullOnDelete();

            $table->text('notes')->nullable();
            $table->timestamps();

            // Only one run per branch per period
            $table->unique(['branch_id', 'period_month', 'period_year'], 'unique_branch_capitation_period');
            $table->index(['branch_id', 'status']);
            $table->index(['period_year', 'period_month']);
        });


        // ── 3. Enhance capitation_records ─────────────────────────────────────
        // Add run_id (groups records to a run) and reconciliation columns.
        // The original table only had: hcp_id, branch_id, period_month/year,
        // enrolled_member_count, rate_per_member, total_amount, status, payment_batch_id.
        Schema::table('capitation_records', function (Blueprint $table) {

            // Group records to a run
            $table->unsignedBigInteger('run_id')->nullable()->after('id');
            $table->foreign('run_id')->references('id')->on('capitation_runs')->cascadeOnDelete();

            // Break member count into principals vs dependants
            $table->unsignedInteger('principal_count')->default(0)->after('enrolled_member_count')
                  ->comment('Active principal enrollees mapped to this HCP');
            $table->unsignedInteger('dependent_count')->default(0)->after('principal_count')
                  ->comment('Active dependants of those principals');

            // Reconciliation — previous month's headcount for this HCP
            $table->unsignedInteger('previous_member_count')->default(0)->after('dependent_count')
                  ->comment('Total members (principals+dependants) from the prior month run');
            $table->integer('member_variance')->default(0)->after('previous_member_count')
                  ->comment('enrolled_member_count minus previous_member_count (signed)');

            // Separate rates for principals and dependants (was a single rate_per_member)
            $table->decimal('rate_per_dependent', 12, 2)->nullable()->after('rate_per_member')
                  ->comment('Rate applied to dependants for this record');

            // Manual adjustment (e.g. to correct for mid-month transfers)
            $table->decimal('adjustment_amount', 12, 2)->default(0)->after('total_amount');
            $table->text('adjustment_note')->nullable()->after('adjustment_amount');

            $table->text('notes')->nullable()->after('adjustment_note');

            // Snapshot of HCP name/tier (in case HCP is later edited/deleted)
            $table->string('hcp_name_snapshot')->nullable();
            $table->string('hcp_tier_snapshot')->nullable();

            // Add index on run_id
            $table->index('run_id');
        });


        // ── 4. Add batch_type to payment_batches ──────────────────────────────
        // Distinguishes claim payment batches from capitation payment batches.
        Schema::table('payment_batches', function (Blueprint $table) {
            $table->enum('batch_type', ['claims', 'capitation'])
                  ->default('claims')
                  ->after('batch_number')
                  ->comment('Determines whether this batch pays claims or HCP capitation fees');

            // Add index for filtering by type in the Finance page
            $table->index('batch_type');

            // Link batch back to capitation run (NULL for claims batches)
            $table->unsignedBigInteger('capitation_run_id')->nullable()->after('batch_type');
            $table->foreign('capitation_run_id')->references('id')->on('capitation_runs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        // Reverse in dependency order
        Schema::table('payment_batches', function (Blueprint $table) {
            $table->dropForeign(['capitation_run_id']);
            $table->dropIndex(['batch_type']);
            $table->dropColumn(['batch_type', 'capitation_run_id']);
        });

        Schema::table('capitation_records', function (Blueprint $table) {
            $table->dropForeign(['run_id']);
            $table->dropColumn([
                'run_id', 'principal_count', 'dependent_count',
                'previous_member_count', 'member_variance',
                'rate_per_dependent', 'adjustment_amount', 'adjustment_note',
                'notes', 'hcp_name_snapshot', 'hcp_tier_snapshot',
            ]);
        });

        Schema::dropIfExists('capitation_runs');
        Schema::dropIfExists('hcp_capitation_rates');
    }
};