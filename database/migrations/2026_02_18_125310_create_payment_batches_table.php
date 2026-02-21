<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete();
            $table->string('batch_number', 50)->unique()->comment('e.g. BATCH-ABJ-2024-001');
            $table->string('description')->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->unsignedInteger('claim_count')->default(0);
            $table->unsignedInteger('provider_count')->default(0);
            $table->enum('status', [
                'draft',
                'submitted',
                'approved',
                'processing',
                'completed',
                'failed',
                'reversed',
            ])->default('draft');

            $table->foreignId('created_by')
                  ->constrained('users')
                  ->restrictOnDelete();
            $table->foreignId('approved_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('processed_at')->nullable();

            $table->string('bank_export_path')
                  ->nullable()
                  ->comment('Path to generated bank transfer file (CSV/NEFT format)');
            $table->string('bank_reference')
                  ->nullable()
                  ->comment('Reference returned by bank after payment initiation');

            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->index('branch_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_batches');
    }
};
