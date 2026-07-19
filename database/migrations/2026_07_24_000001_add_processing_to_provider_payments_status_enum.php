<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `provider_payments.status` is a strict DB enum: pending, paid, failed,
 * reversed (verified real migration). A live gateway transfer is
 * asynchronous - Flutterwave accepts the transfer request, then confirms
 * success/failure later via webhook. There's no state in the current enum
 * for "we sent the money request, waiting to hear back." Adding
 * 'processing'.
 *
 * Same MySQL/Postgres/sqlite-safe pattern as the fraud_flags enum fix from
 * Phase 1 - no-op on sqlite since it doesn't enforce enum constraints.
 */
return new class extends Migration
{
    private array $newValues = ['pending', 'processing', 'paid', 'failed', 'reversed'];
    private array $originalValues = ['pending', 'paid', 'failed', 'reversed'];

    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            $list = "'" . implode("','", $this->newValues) . "'";
            DB::statement("ALTER TABLE provider_payments MODIFY COLUMN status ENUM({$list}) NOT NULL DEFAULT 'pending'");
        } elseif ($driver === 'pgsql') {
            $list = "'" . implode("','", $this->newValues) . "'";
            DB::statement('ALTER TABLE provider_payments DROP CONSTRAINT IF EXISTS provider_payments_status_check');
            DB::statement("ALTER TABLE provider_payments ADD CONSTRAINT provider_payments_status_check CHECK (status IN ({$list}))");
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            $list = "'" . implode("','", $this->originalValues) . "'";
            DB::statement("ALTER TABLE provider_payments MODIFY COLUMN status ENUM({$list}) NOT NULL DEFAULT 'pending'");
        } elseif ($driver === 'pgsql') {
            $list = "'" . implode("','", $this->originalValues) . "'";
            DB::statement('ALTER TABLE provider_payments DROP CONSTRAINT IF EXISTS provider_payments_status_check');
            DB::statement("ALTER TABLE provider_payments ADD CONSTRAINT provider_payments_status_check CHECK (status IN ({$list}))");
        }
    }
};
