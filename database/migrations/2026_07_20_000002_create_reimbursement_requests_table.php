<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 - Fraud/trust loop.
 *
 * Out-of-pocket reimbursement requests. An enrollee pays a provider directly
 * (or the HMO's payment-to-hospital left a gap) and requests money back.
 * Deliberately modeled close to how `claims` works (branch scope, audit log,
 * generated reference number) so staff review it the same way they review claims -
 * no new mental model for your ops team.
 *
 * ASSUMPTION FLAGGED: BelongsToBranch / HasAuditLog / GeneratesUniqueId traits
 * are used here exactly as they're used on Claim/Enrollee. I have not seen the
 * trait source. If GeneratesUniqueId expects a specific column name or a
 * declared prefix constant on the model, that needs matching once I see it -
 * the model file below declares $referenceColumn as a guess for that contract.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reimbursement_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->string('reimbursement_number')->unique();

            $table->foreignId('enrollee_id')->constrained('enrollees');
            $table->foreignId('dependent_id')->nullable()->constrained('dependents');
            $table->foreignId('claim_id')->nullable()->constrained('claims');
            // claim_id nullable: some reimbursements have no prior claim record,
            // e.g. enrollee paid out of pocket at a non-network provider.

            $table->decimal('amount_requested', 12, 2);
            $table->decimal('amount_approved', 12, 2)->nullable();

            $table->text('reason');
            $table->string('receipt_path')->nullable();
            // Phase 1: single receipt upload. If multi-receipt turns out to be
            // needed, mirror the ClaimDocument pattern (separate table) later
            // rather than cramming multiple paths into one column.

            $table->string('status', 20)->default('pending');
            // pending | under_review | approved | rejected | paid

            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_notes')->nullable();

            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reimbursement_requests');
    }
};
