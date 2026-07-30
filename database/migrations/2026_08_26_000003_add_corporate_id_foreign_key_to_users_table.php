<?php
/**
 * FILE: database/migrations/2026_08_26_000003_add_corporate_id_foreign_key_to_users_table.php
 *
 * FIX: the base users migration (0001_01_01_000000_create_users_table.php)
 * declared a foreign key from users.corporate_id to corporates.id, but
 * the corporates table isn't created until
 * 2026_02_18_125045_create_corporates_table.php - much later in
 * migration order. SQLite doesn't enforce foreign keys by default, so
 * this never surfaced there. Real MySQL does enforce it, and
 * `php artisan migrate` on a genuinely fresh MySQL database fails
 * immediately on the very second migration, before anything else can
 * even run. Found this while testing an unrelated migration against a
 * real MySQL instance rather than SQLite.
 *
 * This migration adds the constraint here instead, safely after
 * corporates exists. Idempotent-safe: only adds the constraint if it
 * isn't already there (in case this ever runs against a database where
 * it was somehow added another way).
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
        ->where('TABLE_NAME', 'users')
        ->where('CONSTRAINT_NAME', 'users_corporate_id_foreign')
        ->exists();

    if ($constraintExists) {
        return;
    }

    // ADD THIS: Check if there's any invalid data
    DB::table('users')
        ->whereNotNull('corporate_id')
        ->whereNotExists(function ($query) {
            $query->select(DB::raw(1))
                  ->from('corporates')
                  ->whereRaw('corporates.id = users.corporate_id');
        })
        ->update(['corporate_id' => null]);

    // ADD THIS: Verify column types match
    $usersColumnType = DB::select("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'corporate_id'", [DB::getDatabaseName()]);
    $corporatesColumnType = DB::select("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'corporates' AND COLUMN_NAME = 'id'", [DB::getDatabaseName()]);

    // If types don't match, change users.corporate_id to match
    if (!empty($usersColumnType) && !empty($corporatesColumnType) && $usersColumnType[0]->DATA_TYPE !== $corporatesColumnType[0]->DATA_TYPE) {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('corporate_id')->nullable()->change();
        });
    }

    // Now add the foreign key
    Schema::table('users', function (Blueprint $table) {
        $table->foreign('corporate_id')->references('id')->on('corporates')->nullOnDelete();
    });
}

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['corporate_id']);
        });
    }
};
