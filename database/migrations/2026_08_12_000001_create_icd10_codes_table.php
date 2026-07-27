<?php
/**
 * FILE: database/migrations/2026_08_12_000001_create_icd10_codes_table.php
 *
 * PHASE 3 - Mini EMR.
 * A reference table, not tenant/branch data - one shared list for the
 * whole system. Ships empty; run `php artisan icd10:import path/to/file.csv`
 * once after migrating (see app/Console/Commands/ImportIcd10Codes.php).
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('icd10_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // e.g. "E11.9"
            $table->string('description', 500);
            $table->string('category', 150)->nullable(); // e.g. "Endocrine, nutritional and metabolic diseases"
            $table->boolean('billable')->default(true);
            $table->timestamps();

            $table->index('category');
            $table->fullText(['code', 'description']); // MySQL/Postgres full-text search for the typeahead
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('icd10_codes');
    }
};
