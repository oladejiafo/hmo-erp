<?php
/**
 * FILE: database/migrations/2026_08_12_000004_add_history_index_to_encounters_table.php
 *
 * PHASE 3 - Mini EMR. The encounter history view (any HCP treating this
 * member can see their full clinical history) sorts by enrollee + date,
 * which the Phase 1 indexes don't cover well.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('encounters', function (Blueprint $table) {
            $table->index(['enrollee_id', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::table('encounters', function (Blueprint $table) {
            $table->dropIndex(['enrollee_id', 'scheduled_at']);
        });
    }
};
