<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ── CRITICAL FIX, found while building Provider Portal, not related to it ──
 *
 * `App\Models\User::enrollee()` does `belongsTo(Enrollee::class, 'enrollee_id')`,
 * and `AuthController::me()` - the endpoint called on every page load via
 * `fetchUser()` - does `$request->user()->load('branch', 'corporate', 'enrollee')`.
 *
 * There is no `users.enrollee_id` column anywhere in your migrations. I
 * checked every migration file, not just the base users table one. Unless
 * this column was added manually on production outside of migrations
 * (plausible given your cPanel/no-SSH deployment history on other
 * products), `/auth/me` should throw a SQL error for every single login,
 * not just enrollee ones - because `load()` runs regardless of user_type.
 *
 * This migration is guarded with hasColumn() so it's safe to run whether or
 * not that manual fix already exists on production - it won't double-add
 * the column or error if it's already there.
 *
 * I'm not 100% certain this is live-broken vs already patched out-of-band -
 * you're in the best position to just try logging in as an enrollee_user on
 * your dev environment and see. But the code as written, against the
 * migrations as written, doesn't line up, and it was too significant to
 * silently skip past while building something else.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'enrollee_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('enrollee_id')
                    ->nullable()
                    ->after('corporate_id')
                    ->constrained('enrollees')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'enrollee_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['enrollee_id']);
                $table->dropColumn('enrollee_id');
            });
        }
    }
};
