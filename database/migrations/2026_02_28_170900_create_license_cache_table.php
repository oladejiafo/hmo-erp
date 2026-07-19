<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ERP - license_cache table.
 *
 * Stores the last valid signed token received from the licensing server.
 * Single-row table (only row has id = 1).
 *
 * Why a table and not just cache/file?
 *   - Survives cache flushes (php artisan cache:clear should not kill the license)
 *   - Survives deployments and container restarts
 *   - Gives a clear audit record of when the license was last verified
 *
 * FILE: database/migrations/2025_03_01_000010_create_license_cache_table.php
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('license_cache', function (Blueprint $table) {
            $table->id();

            // The raw signed token as returned by the licensing server
            $table->text('signed_token')->nullable();

            // Decoded payload fields - stored for quick reads without re-parsing
            $table->string('license_key', 64)->nullable();
            $table->string('client_name')->nullable();
            $table->string('plan', 20)->nullable();

            // Status as resolved by the licensing server
            // One of: valid | grace | restricted
            $table->string('status', 20)->nullable()->default('unlicensed');

            // When this cached token expires (after which a fresh check-in is needed)
            $table->timestamp('valid_until')->nullable();

            // When the actual license expires (may be null for lifetime)
            $table->date('license_expires_at')->nullable();

            // Grace period end (null unless in grace)
            $table->date('grace_ends_at')->nullable();

            // Days of grace remaining (0 when expired/restricted)
            $table->unsignedSmallInteger('grace_days_remaining')->nullable();

            // How often the ERP should check in (as instructed by the server)
            $table->unsignedSmallInteger('checkin_interval_hours')->default(24);

            // Number of consecutive failed check-ins (resets to 0 on success)
            $table->unsignedSmallInteger('consecutive_failures')->default(0);

            // When we first noticed check-ins failing (grace starts here)
            $table->timestamp('first_failure_at')->nullable();

            // Last time we successfully contacted the licensing server
            $table->timestamp('last_successful_checkin')->nullable();

            // Last time we attempted a check-in (successful or not)
            $table->timestamp('last_attempt_at')->nullable();

            // If an emergency offline token has been pasted in
            $table->text('emergency_token')->nullable();
            $table->timestamp('emergency_token_valid_until')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('license_cache');
    }
};