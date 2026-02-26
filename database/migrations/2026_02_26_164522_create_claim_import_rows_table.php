<?php
/**
 * FILE: database/migrations/2025_07_03_000002_create_claim_import_rows_table.php
 *
 * One row per line in the uploaded file.
 * Rows with status='approved' get pushed to the main claims table.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('claim_import_rows', function (Blueprint $table) {
            $table->id();

            $table->foreignId('import_batch_id')
                  ->constrained('claim_import_batches')
                  ->cascadeOnDelete();

            // The resolved FK — null until validation succeeds
            $table->foreignId('enrollee_id')
                  ->nullable()
                  ->constrained('enrollees')
                  ->nullOnDelete();

            $table->foreignId('claim_id')
                  ->nullable()      // set after push to claims
                  ->constrained('claims')
                  ->nullOnDelete();

            $table->unsignedInteger('row_number');    // line number in original file

            // Raw data as-received (before mapping)
            $table->json('raw_data');

            // Mapped / parsed fields
            $table->string('enrollee_id_raw')->nullable();   // e.g. "HMO-000123"
            $table->string('enrollee_name_raw')->nullable();
            $table->string('diagnosis_code')->nullable();
            $table->string('diagnosis_description')->nullable();
            $table->string('service_type')->nullable();
            $table->date('service_date')->nullable();
            $table->date('discharge_date')->nullable();
            $table->decimal('amount_submitted', 12, 2)->nullable();
            $table->string('hcp_invoice_ref')->nullable();   // HCP's own reference
            $table->text('notes')->nullable();

            // Validation outcome
            $table->enum('status', [
                'pending',      // not yet validated
                'valid',        // passed all checks
                'error',        // has validation errors
                'duplicate',    // matches an existing claim
                'skipped',      // staff chose to skip
                'approved',     // staff approved (valid or overridden)
                'pushed',       // inserted into claims table
            ])->default('pending');

            $table->json('validation_errors')->nullable();   // [{ field, message }, ...]
            $table->boolean('staff_override')->default(false);
            $table->text('override_reason')->nullable();

            $table->timestamps();

            $table->index(['import_batch_id', 'status']);
            $table->index('enrollee_id');
        });
    }

    public function down(): void { Schema::dropIfExists('claim_import_rows'); }
};