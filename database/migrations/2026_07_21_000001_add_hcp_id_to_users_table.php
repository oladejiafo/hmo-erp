<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Provider Portal — HCP user accounts.
 *
 * Mirrors the exact pattern already on `users` for corporate_id (see
 * 0001_01_01_000000_create_users_table.php): nullable FK, null on delete.
 * user_type is already a plain nullable string column (no DB enum
 * constraint), so 'hcp_user' as a new value needs no schema change there —
 * confirmed by reading the real migration. Only hcp_id is new.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('hcp_id')
                ->nullable()
                ->after('corporate_id')
                ->constrained('health_care_providers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['hcp_id']);
            $table->dropColumn('hcp_id');
        });
    }
};
