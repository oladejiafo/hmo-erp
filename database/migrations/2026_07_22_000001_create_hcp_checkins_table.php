<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Verification alerts — closes the last open FRD row on Provider Portal.
 *
 * Deliberately polling-based, not websocket-based. An enrollee taps
 * "I'm here" on arrival, it creates a row here, the provider dashboard
 * polls every ~15s and shows it. No Echo/Pusher/Reverb dependency — that's
 * real new infrastructure (a queue-backed broadcast driver, a websocket
 * server to run/host) and deserves its own scoped decision, not a quiet
 * addition here. If/when you want true push, this table doesn't change —
 * only the delivery mechanism does (broadcast an event on create instead
 * of polling), so this isn't wasted work either way.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hcp_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('hcp_id')->constrained('health_care_providers');
            $table->foreignId('enrollee_id')->constrained('enrollees');
            $table->foreignId('dependent_id')->nullable()->constrained('dependents');

            $table->string('status', 20)->default('pending');
            // pending | acknowledged | expired

            $table->foreignId('acknowledged_by')->nullable()->constrained('users');
            $table->timestamp('acknowledged_at')->nullable();

            $table->timestamps();

            $table->index(['hcp_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hcp_checkins');
    }
};
