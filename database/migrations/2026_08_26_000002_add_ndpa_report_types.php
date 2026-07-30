<?php
/**
 * FILE: database/migrations/2026_08_26_000002_add_ndpa_report_types.php
 *
 * Adds two report types to the existing generated_reports.report_type
 * enum: ndpa_data_processing_register and ndpa_consent_audit. Raw SQL
 * because MySQL enum modification needs doctrine/dbal for Laravel's
 * fluent ->change(), which isn't installed - adding that whole package
 * for one enum tweak isn't worth it. Guarded to only run on MySQL;
 * SQLite doesn't enforce this the same way (it's a CHECK constraint,
 * not a native enum) and isn't the target production environment here.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return; // enum constraint isn't structured the same way on other drivers - not needed for this app's production target
        }

        DB::statement("
            ALTER TABLE generated_reports
            MODIFY COLUMN report_type ENUM(
                'monthly_claims_returns',
                'capitation_payment_schedule',
                'quarterly_utilisation',
                'ffs_claims_register',
                'annual_report',
                'ffs_remittance_advice',
                'corporate_cost_report',
                'ndpa_data_processing_register',
                'ndpa_consent_audit'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE generated_reports
            MODIFY COLUMN report_type ENUM(
                'monthly_claims_returns',
                'capitation_payment_schedule',
                'quarterly_utilisation',
                'ffs_claims_register',
                'annual_report',
                'ffs_remittance_advice',
                'corporate_cost_report'
            ) NOT NULL
        ");
    }
};
