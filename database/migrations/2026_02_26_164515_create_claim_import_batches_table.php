<?php
/**
 * FILE: database/migrations/2025_07_03_000001_create_claim_import_batches_table.php
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('claim_import_batches', function (Blueprint $table) {
            $table->id();

            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->cascadeOnDelete();

            $table->foreignId('uploaded_by')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('reviewed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('batch_number')->unique();        // IMP-2025-001234
            $table->string('original_filename');
            $table->string('file_path');
            $table->enum('file_type', ['xlsx', 'csv']);

            // Period this batch covers
            $table->string('claim_period');                  // "2025-06" (YYYY-MM)

            // Column mapping used (stored as JSON for reference / audit)
            $table->json('column_mapping');                  // { "their_col": "our_field", ... }

            // Row counts
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('valid_rows')->default(0);
            $table->unsignedInteger('error_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('pushed_rows')->default(0);   // rows pushed to claims

            $table->enum('status', [
                'uploaded',     // file received, not yet parsed
                'mapped',       // columns mapped, ready to validate
                'validated',    // row validation complete
                'reviewing',    // staff reviewing flagged rows
                'pushed',       // all approved rows pushed to claims
                'cancelled',
            ])->default('uploaded');

            $table->decimal('total_amount_submitted', 14, 2)->default(0);
            $table->decimal('total_amount_valid',     14, 2)->default(0);

            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['hcp_id', 'status']);
            $table->index('claim_period');
        });
    }

    public function down(): void { Schema::dropIfExists('claim_import_batches'); }
};
