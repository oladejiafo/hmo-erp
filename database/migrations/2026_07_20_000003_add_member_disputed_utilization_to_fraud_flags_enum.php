<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `fraud_flags.flag_type` is a strict DB-level enum (verified against
 * database/migrations/..._create_fraud_flags_table.php), not a free string.
 * FraudFlagController/Model has no cast enforcing it in PHP — the constraint
 * lives entirely in the database. Inserting 'member_disputed_utilization'
 * without this migration would fail at the DB layer on MySQL/Postgres.
 *
 * DRIVER NOTE: .env.example defaults to sqlite, but your project history
 * (cPanel shared hosting deployments) strongly suggests production runs
 * MySQL. SQLite doesn't enforce enum constraints at all (stored as TEXT),
 * so this migration only does real work on mysql/pgsql and is a safe no-op
 * elsewhere. Confirm your actual production DB driver before running this
 * against prod — if it's something other than mysql/pgsql/sqlite, this
 * needs a fourth branch.
 */
return new class extends Migration
{
    private array $newEnumValues = [
        'duplicate_claim',
        'tariff_mismatch',
        'expired_plan',
        'over_benefit_limit',
        'frequency_anomaly',
        'cost_spike',
        'pattern_deviation',
        'provider_blacklisted',
        'invalid_diagnosis_code',
        'pre_auth_missing',
        'member_disputed_utilization', // [PHASE 1]
    ];

    private array $originalEnumValues = [
        'duplicate_claim',
        'tariff_mismatch',
        'expired_plan',
        'over_benefit_limit',
        'frequency_anomaly',
        'cost_spike',
        'pattern_deviation',
        'provider_blacklisted',
        'invalid_diagnosis_code',
        'pre_auth_missing',
    ];

    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            $list = "'" . implode("','", $this->newEnumValues) . "'";
            DB::statement("ALTER TABLE fraud_flags MODIFY COLUMN flag_type ENUM({$list}) NOT NULL");
        } elseif ($driver === 'pgsql') {
            $list = "'" . implode("','", $this->newEnumValues) . "'";
            DB::statement('ALTER TABLE fraud_flags DROP CONSTRAINT IF EXISTS fraud_flags_flag_type_check');
            DB::statement("ALTER TABLE fraud_flags ADD CONSTRAINT fraud_flags_flag_type_check CHECK (flag_type IN ({$list}))");
        }
        // sqlite: no-op, enum not enforced at the DB level there.
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            $list = "'" . implode("','", $this->originalEnumValues) . "'";
            DB::statement("ALTER TABLE fraud_flags MODIFY COLUMN flag_type ENUM({$list}) NOT NULL");
        } elseif ($driver === 'pgsql') {
            $list = "'" . implode("','", $this->originalEnumValues) . "'";
            DB::statement('ALTER TABLE fraud_flags DROP CONSTRAINT IF EXISTS fraud_flags_flag_type_check');
            DB::statement("ALTER TABLE fraud_flags ADD CONSTRAINT fraud_flags_flag_type_check CHECK (flag_type IN ({$list}))");
        }
    }
};
