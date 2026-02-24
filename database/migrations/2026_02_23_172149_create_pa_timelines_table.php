<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE LOCATION: database/migrations/2025_01_01_000002_create_pa_timelines_table.php
 *
 * Audit trail for every status transition and action on a PA request.
 * One row per event. Append-only — rows are never updated or deleted.
 *
 * Events logged:
 *   submitted                — PA created
 *   desk_approved            — Desk Officer gave first approval
 *   escalated_to_md          — Escalated to Medical Director (amount > ₦500k)
 *   md_approved              — Medical Director gave sign-off
 *   escalated_to_ceo         — Escalated to CEO (amount > ₦2M)
 *   ceo_approved             — CEO gave sign-off
 *   pa_issued                — Final approval, pa_code generated
 *   declined                 — PA declined at any stage
 *   revoked                  — Approved PA code manually cancelled
 *   code_validated           — /validate-code called (e.g. during claim submission)
 *   code_validation_failed   — Validation attempt failed (wrong enrollee/HCP/expired)
 *   used_on_claim            — Claim submitted with this PA code; claim_id linked
 *   expired                  — Scheduled job marked PA as expired
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pa_timelines', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('pre_authorisation_id');
            $table->foreign('pre_authorisation_id')
                  ->references('id')
                  ->on('pre_authorisations')
                  ->cascadeOnDelete();

            // Machine-readable event name
            $table->string('event', 60);

            // Human-readable label (for display without mapping in PHP)
            $table->string('event_label', 120)->nullable();

            // Actor (NULL for system-generated events like expiry)
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $table->string('actor_name')->nullable(); // cached for display after user deletion

            // Optional note attached to this event (approval note, decline reason, etc.)
            $table->text('note')->nullable();

            // Snapshot of the status AFTER this event
            $table->string('status_after', 40)->nullable();

            // Extra context (e.g. PA code issued, claim number linked)
            $table->json('meta')->nullable();

            // created_at only — no updated_at (append-only)
            $table->timestamp('created_at')->useCurrent();

            // Indexes
            $table->index(['pre_authorisation_id', 'created_at']);
            $table->index('event');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pa_timelines');
    }
};