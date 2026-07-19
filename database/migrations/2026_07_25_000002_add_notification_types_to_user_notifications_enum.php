<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * CORRECTION — Phase 3's NotificationService patch (PHASE3_NOTIFICATIONSERVICE_PATCH.md)
 * added methods that create notifications with type values
 * 'claim_decision', 'payment_made', 'pa_decision', 'ticket_reply'.
 *
 * `user_notifications.type` is a strict DB enum with a fixed, documented
 * list (verified real migration) that doesn't include any of those four
 * values — same class of bug as the fraud_flags.flag_type fix from Phase 1.
 * If you already applied the Phase 3 NotificationService patch and tried
 * to trigger any of those four methods, it would have failed with a DB
 * constraint error. If you haven't applied it yet, apply this migration
 * FIRST, before that patch, so the values it needs already exist.
 *
 * This phase adds two more new types on top (utilization_alert, broadcast)
 * for Corporate Portal's real-time alerts and announcement broadcast — bundled
 * into the same corrective migration rather than issuing two separate enum
 * migrations back to back.
 */
return new class extends Migration
{
    private array $newValues = [
        'sla_breach', 'pa_pending', 'pa_expiring', 'fraud_flag', 'batch_ready',
        'capitation_due', 'plan_expiring', 'contract_expiring', 'compliance_due',
        'compliance_overdue', 'system',
        // Phase 3 additions
        'claim_decision', 'payment_made', 'pa_decision', 'ticket_reply',
        // Phase 5 additions
        'utilization_alert', 'broadcast',
    ];

    private array $originalValues = [
        'sla_breach', 'pa_pending', 'pa_expiring', 'fraud_flag', 'batch_ready',
        'capitation_due', 'plan_expiring', 'contract_expiring', 'compliance_due',
        'compliance_overdue', 'system',
    ];

    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            $list = "'" . implode("','", $this->newValues) . "'";
            DB::statement("ALTER TABLE user_notifications MODIFY COLUMN type ENUM({$list}) NOT NULL");
        } elseif ($driver === 'pgsql') {
            $list = "'" . implode("','", $this->newValues) . "'";
            DB::statement('ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check');
            DB::statement("ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check CHECK (type IN ({$list}))");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            $list = "'" . implode("','", $this->originalValues) . "'";
            DB::statement("ALTER TABLE user_notifications MODIFY COLUMN type ENUM({$list}) NOT NULL");
        } elseif ($driver === 'pgsql') {
            $list = "'" . implode("','", $this->originalValues) . "'";
            DB::statement('ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check');
            DB::statement("ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check CHECK (type IN ({$list}))");
        }
    }
};
