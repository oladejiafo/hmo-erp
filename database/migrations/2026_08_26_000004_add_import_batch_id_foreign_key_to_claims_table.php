<?php
/**
 * FILE: database/migrations/2026_08_26_000004_add_import_batch_id_foreign_key_to_claims_table.php
 *
 * Same bug, same fix, as 2026_08_26_000003 for users.corporate_id - see
 * that migration's docblock for the full explanation. Found via a static
 * scan of every migration's foreign key declaration against when its
 * referenced table actually gets created, after finding the users/
 * corporates instance by testing against real MySQL.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        $constraintExists = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'claims')
            ->where('CONSTRAINT_NAME', 'claims_import_batch_id_foreign')
            ->exists();

        if ($constraintExists) {
            return;
        }

        Schema::table('claims', function (Blueprint $table) {
            $table->foreign('import_batch_id')->references('id')->on('claim_import_batches')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('claims', function (Blueprint $table) {
            $table->dropForeign(['import_batch_id']);
        });
    }
};
