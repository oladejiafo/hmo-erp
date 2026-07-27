<?php
/**
 * FILE: database/migrations/2026_08_05_000002_create_encounters_table.php
 *
 * PHASE 1 - Telemedicine (with minimal EMR backbone).
 *
 * An encounter is a single clinical visit - video, audio, or (later,
 * Phase 3) physical. It's deliberately the same table both use, so Phase 3
 * Mini EMR extends this table (adds diagnoses/ICD-10, treatment plans)
 * instead of building a parallel structure. Building it twice was the
 * thing worth avoiding.
 *
 * One encounter per confirmed appointment. The video room itself is NOT
 * created here - that happens lazily on first join (see
 * TelemedicineService::ensureRoom), so we don't burn Daily.co API calls
 * on appointments that get cancelled before the visit.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encounters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('appointment_id')->nullable()->unique()->constrained('appointments')->nullOnDelete();
            $table->foreignId('enrollee_id')->constrained('enrollees');
            $table->foreignId('dependent_id')->nullable()->constrained('dependents');
            $table->foreignId('hcp_id')->constrained('health_care_providers');
            $table->foreignId('doctor_id')->nullable()->constrained('doctors');

            $table->string('type', 20)->default('video');
            // video | audio | physical (physical unused until Phase 3)

            $table->string('status', 20)->default('scheduled');
            // scheduled | waiting | in_progress | completed | cancelled | no_show

            $table->text('chief_complaint')->nullable();
            $table->text('consultation_notes')->nullable();
            $table->text('follow_up_advice')->nullable();

            // ── Video session (Daily.co) - populated on first join ─────────
            $table->string('video_provider', 20)->nullable()->default('daily');
            $table->string('video_room_name')->nullable()->unique();
            $table->string('video_enrollee_url', 500)->nullable();
            $table->string('video_doctor_url', 500)->nullable();

            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['enrollee_id', 'status']);
            $table->index(['hcp_id', 'status']);
            $table->index(['doctor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encounters');
    }
};