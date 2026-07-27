<?php
/**
 * FILE: database/migrations/2026_08_05_000001_add_consultation_type_to_appointments_table.php
 *
 * PHASE 1 - Telemedicine.
 * Every appointment now declares HOW it happens, not just when.
 * 'in_person' keeps all existing behaviour untouched (default, so no
 * backfill needed for existing rows).
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('consultation_type', 20)
                ->default('in_person')
                ->after('reason');
            // in_person | video | audio
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('consultation_type');
        });
    }
};