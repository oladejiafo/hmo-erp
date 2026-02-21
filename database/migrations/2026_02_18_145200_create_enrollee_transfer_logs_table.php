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
        Schema::create('enrollee_transfer_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollee_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('from_branch_id')
                  ->constrained('branches')
                  ->restrictOnDelete();
            $table->foreignId('to_branch_id')
                  ->constrained('branches')
                  ->restrictOnDelete();
            $table->text('reason');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('requested_by')
                  ->constrained('users')
                  ->restrictOnDelete();
            $table->foreignId('approved_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index('enrollee_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollee_transfer_logs');
    }
};
