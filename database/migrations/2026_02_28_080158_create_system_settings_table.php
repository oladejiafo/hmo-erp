<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Creates the system_settings table - a typed key-value store for all
 * configurable parameters that were previously hard-coded or env-only.
 *
 * Groups:
 *   hmo_info    - Organisation identity (name, code, address, currency …)
 *   financial   - VAT rate, claim thresholds, PA tiers, SLA targets …
 *   fraud       - Risk score weights and detection thresholds
 *   pre_auth    - PA amount tiers, TAT limits
 *   sla         - Per-claim-type processing targets (days)
 *   operational - Token lifetime, max dependents, dashboard cache, etc.
 *   notifications - Alert trigger thresholds
 *
 * FILE LOCATION: database/migrations/2025_02_01_000001_create_system_settings_table.php
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();

            // Dot-notation key, e.g. "fraud.auto_quarantine_threshold"
            $table->string('key', 120)->unique();

            // Human-readable label shown in the admin UI
            $table->string('label', 200);

            // Short description for tooltip / help text
            $table->string('description', 500)->nullable();

            // Logical group for the settings page tabs
            $table->string('group', 60)->index();

            // Data type: string | integer | decimal | boolean | json
            $table->string('type', 20)->default('string');

            // The stored value (always as string; cast on read by the model)
            $table->text('value')->nullable();

            // Default value - used to reset, and shown as placeholder
            $table->text('default_value')->nullable();

            // Optional: min/max for numeric fields (stored as JSON: {"min":0,"max":100})
            $table->json('validation_rules')->nullable();

            // Unit label shown next to the input, e.g. "NGN", "days", "%", "hours"
            $table->string('unit', 30)->nullable();

            // Hide from UI (internal / system-only settings)
            $table->boolean('is_hidden')->default(false);

            // Read-only in UI (set via env only, shown for reference)
            $table->boolean('is_readonly')->default(false);

            // Display order within the group
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Who last changed this setting
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};