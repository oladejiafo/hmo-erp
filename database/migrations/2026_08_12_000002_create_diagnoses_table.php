<?php
/**
 * FILE: database/migrations/2026_08_12_000002_create_diagnoses_table.php
 *
 * PHASE 3 - Mini EMR. One encounter can carry several diagnoses (one
 * primary, any number of secondary) - this is why it's its own table
 * rather than a column on encounters.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnoses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('encounter_id')->constrained('encounters')->cascadeOnDelete();
            $table->string('icd10_code', 10);
            $table->foreign('icd10_code')->references('code')->on('icd10_codes')->restrictOnDelete();
            $table->string('type', 20)->default('secondary'); // primary | secondary
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['encounter_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnoses');
    }
};
