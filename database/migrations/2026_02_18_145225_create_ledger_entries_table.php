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
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete();
            $table->enum('entry_type', ['debit', 'credit']);
            $table->enum('category', [
                'premium_received',
                'claim_payment',
                'capitation_payment',
                'refund',
                'penalty',
                'adjustment',
                'administrative_fee',
            ]);
            $table->decimal('amount', 15, 2);
            $table->decimal('running_balance', 15, 2)
                  ->default(0)
                  ->comment('Running branch balance after this entry');
            $table->string('reference_type', 100)
                  ->nullable()
                  ->comment('e.g. App\\Models\\PaymentBatch');
            $table->unsignedBigInteger('reference_id')
                  ->nullable()
                  ->comment('ID of the related model record');
            $table->string('description');
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['branch_id', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
            $table->index('category');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ledger_entries');
    }
};
