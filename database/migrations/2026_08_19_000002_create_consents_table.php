<?php
/**
 * FILE: database/migrations/2026_08_19_000002_create_consents_table.php
 *
 * PHASE 6 - Compliance. Replaces the single consent_given_at/consent_version
 * pair on enrollees (still there, still written at signup, not removed)
 * with real per-purpose, revocable, versioned consent.
 *
 * DESIGN: append-only log, not a single row updated in place. Every grant
 * or revoke writes a NEW row. This is deliberate - a regulator or an
 * enrollee asking "when did I consent to X, and did I ever revoke it"
 * needs the full history, not just today's answer. "Current status" for
 * a purpose is just the latest row for that enrollee + purpose.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('enrollee_id')->constrained('enrollees')->cascadeOnDelete();

            $table->string('purpose', 40);
            // data_processing | marketing | employer_data_sharing | research_analytics

            $table->boolean('granted');
            $table->string('version', 20); // which privacy notice / consent text version this decision was made against

            $table->timestamp('decided_at');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            $table->timestamps();

            $table->index(['enrollee_id', 'purpose', 'decided_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consents');
    }
};
