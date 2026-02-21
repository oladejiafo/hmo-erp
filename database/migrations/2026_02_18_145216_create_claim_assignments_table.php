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
        Schema::create('claim_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('assigned_to')
                  ->constrained('users')
                  ->restrictOnDelete();
            $table->foreignId('assigned_by')
                  ->constrained('users')
                  ->restrictOnDelete();
            $table->enum('assignment_type', ['officer', 'supervisor', 'finance'])
                  ->default('officer');
            $table->boolean('is_active')
                  ->default(true)
                  ->comment('Only one active assignment per claim at a time');
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('handover_note')->nullable();
            $table->timestamps();

            $table->index('claim_id');
            $table->index(['assigned_to', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claim_assignments');
    }
};
