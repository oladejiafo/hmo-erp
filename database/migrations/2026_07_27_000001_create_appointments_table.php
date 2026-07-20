<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Appointment booker. Deliberately a request/confirm model, not a real
 * slot-availability calendar — HealthCareProvider has no schedule/capacity
 * data anywhere in this codebase to book against. Enrollee picks a
 * preferred date/time and a reason, it goes to the facility as a request;
 * the facility (or HMO staff, until Provider Portal picks this up
 * natively) confirms or reschedules. Building a real calendar engine on
 * top of nothing is scope creep; this is the honest v1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('enrollee_id')->constrained('enrollees');
            $table->foreignId('dependent_id')->nullable()->constrained('dependents');
            $table->foreignId('hcp_id')->constrained('health_care_providers');

            $table->date('preferred_date');
            $table->string('preferred_time_slot', 20)->nullable();
            // 'morning' | 'afternoon' | 'evening' — not a precise time,
            // since there's no real slot system to book an exact time against

            $table->string('reason', 255);
            $table->text('notes')->nullable();

            $table->string('status', 20)->default('requested');
            // requested | confirmed | rescheduled | completed | cancelled | no_show

            $table->date('confirmed_date')->nullable();
            $table->string('confirmed_time', 10)->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users');
            $table->text('cancellation_reason')->nullable();

            $table->timestamps();

            $table->index(['hcp_id', 'status']);
            $table->index(['enrollee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
