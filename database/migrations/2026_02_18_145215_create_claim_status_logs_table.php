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
        Schema::create('claim_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained()
                  ->nullOnDelete()
                  ->comment('Null for system-initiated transitions (auto-validation)');
            $table->string('from_status', 30);
            $table->string('to_status', 30);
            $table->text('note')->nullable()->comment('Officer note attached to this transition');
            $table->string('triggered_by', 50)
                  ->default('user')
                  ->comment('user | system | fraud_engine | scheduler');
            $table->timestamp('created_at')->useCurrent();

            $table->index('claim_id');
            $table->index(['claim_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claim_status_logs');
    }
};
