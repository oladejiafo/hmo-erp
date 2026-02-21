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
        Schema::create('provider_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')
                  ->constrained('payment_batches')
                  ->cascadeOnDelete();
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->restrictOnDelete();
            $table->foreignId('claim_id')
                  ->constrained()
                  ->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['pending', 'paid', 'failed', 'reversed'])
                  ->default('pending');
            $table->string('payment_reference', 100)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('remittance_path')
                  ->nullable()
                  ->comment('Path to generated remittance advice PDF for this payment');
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->index(['batch_id', 'status']);
            $table->index(['hcp_id', 'status']);
            $table->index('claim_id');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provider_payments');
    }
};
