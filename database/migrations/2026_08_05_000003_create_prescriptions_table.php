<?php
/**
 * FILE: database/migrations/2026_08_05_000003_create_prescriptions_table.php
 *
 * PHASE 1 - Telemedicine. A doctor closes an encounter with zero or more
 * prescriptions. drug_name is free text for now - Phase 4 (PBM) adds a
 * formulary table and this table gets a nullable formulary_drug_id FK
 * added via a later migration, without breaking anything written here.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('encounter_id')->constrained('encounters')->cascadeOnDelete();
            $table->foreignId('enrollee_id')->constrained('enrollees'); // denormalized for fast portal queries

            $table->string('drug_name');
            $table->string('dosage', 100)->nullable();
            $table->string('frequency', 100)->nullable();
            $table->string('duration', 100)->nullable();
            $table->text('instructions')->nullable();

            $table->string('status', 20)->default('active');
            // active | dispensed | cancelled  (dispensed is set by Phase 4 PBM)

            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('issued_at')->nullable();
            $table->timestamps();

            $table->index(['enrollee_id', 'status']);
            $table->index('encounter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};