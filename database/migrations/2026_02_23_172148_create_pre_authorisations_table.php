<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE LOCATION: database/migrations/2025_01_01_000001_create_pre_authorisations_table.php
 *
 * Pre-Authorisation master table.
 *
 * Status lifecycle:
 *   pending → awaiting_md → awaiting_ceo → approved → used / expired
 *   pending → declined
 *   approved → revoked  (before claim is linked)
 *   emergency path: emergency_retrospective → approved / declined
 *
 * Approval tier (driven by estimated_amount):
 *   ≤ ₦500,000   standard   → Desk Officer → approved
 *   ≤ ₦2,000,000 md         → Desk Officer → awaiting_md → Medical Director → approved
 *   > ₦2,000,000 ceo        → Desk Officer → awaiting_md → awaiting_ceo → approved
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pre_authorisations', function (Blueprint $table) {

            // ── Primary Key ────────────────────────────────────────────────
            $table->id();

            // ── Reference Numbers ──────────────────────────────────────────
            // pa_number: sequential reference assigned immediately on creation  e.g. PA-2025-000042
            // pa_code:   alphanumeric code issued to the provider on final approval e.g. PA-2025-0000042
            //            NULL until approved.
            $table->string('pa_number', 30)->unique();
            $table->string('pa_code', 30)->nullable()->unique();

            // ── Branch & Organisation Scope ────────────────────────────────
            $table->unsignedBigInteger('branch_id');
            $table->foreign('branch_id')->references('id')->on('branches');

            // ── Patient ────────────────────────────────────────────────────
            $table->unsignedBigInteger('enrollee_id');
            $table->foreign('enrollee_id')->references('id')->on('enrollees');

            // Dependant (NULL = request is for the principal member)
            $table->unsignedBigInteger('dependent_id')->nullable();
            $table->foreign('dependent_id')->references('id')->on('dependents');

            // ── Healthcare Provider ────────────────────────────────────────
            $table->unsignedBigInteger('hcp_id');
            $table->foreign('hcp_id')->references('id')->on('hcps');

            $table->string('attending_doctor')->nullable();  // free-text name of attending physician

            // ── Clinical Information ───────────────────────────────────────
            $table->string('service_type');   // enum-like: inpatient_admission, surgical_procedure, etc.
            $table->json('diagnosis_codes')->nullable();     // array of ICD-10 codes
            $table->string('diagnosis_description');         // free-text mandatory description
            $table->text('clinical_notes')->nullable();      // extended clinical justification

            // Admission details (for inpatient, surgical, maternity, etc.)
            $table->date('admission_date')->nullable();
            $table->unsignedSmallInteger('expected_duration')->nullable(); // days

            // ── Urgency ────────────────────────────────────────────────────
            // standard  → respond within 15–30 min (NHIA)
            // urgent    → respond within 30–60 min
            // emergency → care proceeds immediately, retrospective review within 24 hrs
            $table->enum('urgency', ['standard', 'urgent', 'emergency'])->default('standard');

            // ── Financial ─────────────────────────────────────────────────
            $table->decimal('estimated_amount', 15, 2)->nullable();  // submitted by requester
            $table->decimal('approved_amount',  15, 2)->nullable();  // set by final approver; NULL = same as estimated
            $table->unsignedSmallInteger('validity_days')->default(30); // how long pa_code is valid after issue
            $table->timestamp('expires_at')->nullable();  // computed: final_approved_at + validity_days

            // ── Approval Tier ──────────────────────────────────────────────
            // Computed from estimated_amount and stored for easy filtering/reporting.
            $table->enum('approval_tier', ['standard', 'md', 'ceo'])->default('standard');

            // ── Status ─────────────────────────────────────────────────────
            $table->enum('status', [
                'pending',                  // submitted, awaiting Desk Officer
                'awaiting_md',              // Desk Officer approved, awaiting Medical Director
                'awaiting_ceo',             // MD approved, awaiting CEO
                'approved',                 // final approval given, pa_code generated
                'declined',                 // rejected at any stage
                'expired',                  // pa_code validity window has passed
                'used',                     // linked to a claim (claim_id is set)
                'revoked',                  // manually cancelled after approval
                'emergency_retrospective',  // emergency - care already given, retrospective review
            ])->default('pending');

            // ── Submission Channel ─────────────────────────────────────────
            $table->string('submission_channel')->default('hmo_portal'); // hmo_portal | provider_portal | phone

            // ── Submitter ─────────────────────────────────────────────────
            $table->unsignedBigInteger('submitted_by_id')->nullable();
            $table->foreign('submitted_by_id')->references('id')->on('users');

            // ── Desk Officer Approval Step ────────────────────────────────
            $table->unsignedBigInteger('desk_approved_by_id')->nullable();
            $table->foreign('desk_approved_by_id')->references('id')->on('users');
            $table->timestamp('desk_approved_at')->nullable();

            // ── Medical Director Approval Step ────────────────────────────
            $table->unsignedBigInteger('md_approved_by_id')->nullable();
            $table->foreign('md_approved_by_id')->references('id')->on('users');
            $table->timestamp('md_approved_at')->nullable();

            // ── CEO Approval Step ─────────────────────────────────────────
            $table->unsignedBigInteger('ceo_approved_by_id')->nullable();
            $table->foreign('ceo_approved_by_id')->references('id')->on('users');
            $table->timestamp('ceo_approved_at')->nullable();

            // ── Final Reviewer (last action taken) ────────────────────────
            $table->unsignedBigInteger('reviewed_by_id')->nullable();
            $table->foreign('reviewed_by_id')->references('id')->on('users');
            $table->timestamp('reviewed_at')->nullable();  // timestamp of final decision (approve/decline)

            // ── Decision Notes ─────────────────────────────────────────────
            $table->text('approval_note')->nullable();   // clinical conditions / instructions attached to approval
            $table->text('decline_reason')->nullable();  // mandatory if declined
            $table->text('revoke_reason')->nullable();   // mandatory if revoked

            // ── Linked Claim ───────────────────────────────────────────────
            // Set when a claim is submitted with this PA code.
            // NULL until then.
            $table->unsignedBigInteger('claim_id')->nullable();
            $table->foreign('claim_id')->references('id')->on('claims');

            // ── Soft Delete + Timestamps ──────────────────────────────────
            $table->timestamps();
            $table->softDeletes();

            // ── Indexes ────────────────────────────────────────────────────
            $table->index(['branch_id', 'status']);
            $table->index(['enrollee_id', 'status']);
            $table->index(['hcp_id', 'status']);
            $table->index(['status', 'urgency', 'created_at']); // queue ordering
            $table->index(['expires_at', 'status']);            // expiry job
            $table->index('pa_code');
            $table->index('pa_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pre_authorisations');
    }
};