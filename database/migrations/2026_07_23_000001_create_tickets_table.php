<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ticketing / SLA-backed client service - generalizes the enrollee-only
 * `complaints` table (verified real schema: enrollee_id, ticket_number,
 * subject, description, category, hcp_name, status, resolution_note,
 * resolved_at, resolved_by - no branch scope, no SLA, no assignment, no
 * corporate/provider support).
 *
 * The old `complaints` table is left untouched - historical data stays
 * readable, nothing migrates automatically. This is the new table
 * EnrolleePortalController's complaints()/submitComplaint() get repointed
 * to (see PHASE3 patch docs), and it's also usable by corporate and
 * provider portals, which `complaints` never was.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->string('ticket_number', 50)->unique();

            $table->string('subject');
            $table->text('description');
            $table->string('category')->nullable();
            $table->string('priority', 10)->default('medium');
            // low | medium | high | urgent

            $table->string('status', 20)->default('open');
            // open | in_progress | resolved | closed

            $table->string('source', 20);
            // enrollee_portal | corporate_portal | provider_portal | hmo_staff

            // Who raised it - always a users row, regardless of portal.
            $table->foreignId('raised_by_user_id')->constrained('users');

            // Context FKs - whichever applies, for filtering/reporting.
            // Nullable because an hmo_staff-raised ticket might not tie to any of these.
            $table->foreignId('enrollee_id')->nullable()->constrained('enrollees')->nullOnDelete();
            $table->foreignId('corporate_id')->nullable()->constrained('corporates')->nullOnDelete();
            $table->foreignId('hcp_id')->nullable()->constrained('health_care_providers')->nullOnDelete();
            $table->string('hcp_name')->nullable(); // free-text fallback, mirrors old complaints.hcp_name

            // SLA clock - see App\Traits\HasSlaClock
            $table->unsignedSmallInteger('sla_target_hours')->default(48);

            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();

            $table->text('resolution_note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'status']);
            $table->index(['assigned_to', 'status']);
            $table->index('enrollee_id');
            $table->index('corporate_id');
            $table->index('hcp_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
