<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE LOCATION: database/migrations/2025_01_01_000005_create_user_notifications_table.php
 *
 * In-app notification centre for HMO staff.
 * Uses a custom table (user_notifications) to avoid collision with
 * Laravel's built-in `notifications` table from Notifiable trait.
 *
 * Notification types in this system:
 *   sla_breach          - claim passed SLA deadline unresolved
 *   pa_pending          - pre-auth waiting for tier approval
 *   pa_expiring         - approved PA expiring within 48 hrs
 *   fraud_flag          - new high-risk claim flagged
 *   batch_ready         - payment batch ready for approval
 *   capitation_due      - capitation run due for the period
 *   plan_expiring       - corporate plan expiring within 30 days
 *   contract_expiring   - HCP contract expiring within 30 days
 *   compliance_due      - regulatory filing due within 7 days
 *   compliance_overdue  - regulatory filing past deadline
 *   system              - general system-level messages
 *
 * Depends on: users, branches
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();

            // Recipient
            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete();

            $table->foreignId('branch_id')
                  ->nullable()
                  ->constrained()
                  ->nullOnDelete();

            // Notification content
            $table->enum('type', [
                'sla_breach',
                'pa_pending',
                'pa_expiring',
                'fraud_flag',
                'batch_ready',
                'capitation_due',
                'plan_expiring',
                'contract_expiring',
                'compliance_due',
                'compliance_overdue',
                'system',
            ])->index();

            $table->enum('severity', ['info', 'warning', 'critical'])
                  ->default('info')
                  ->index();

            $table->string('title');
            $table->text('body');

            // Deep-link - where clicking the notification should navigate
            $table->string('action_url')->nullable()
                  ->comment('Frontend path e.g. /claims/123 or /pre-auth/456');

            // Polymorphic reference to the thing that triggered this notification
            $table->string('notifiable_type')->nullable()
                  ->comment('e.g. App\Models\Claim');
            $table->unsignedBigInteger('notifiable_id')->nullable()
                  ->comment('ID of the related model');

            // Read state
            $table->timestamp('read_at')->nullable();

            $table->timestamps();

            // Indexes for the notification centre query patterns
            $table->index(['user_id', 'read_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
    }
};