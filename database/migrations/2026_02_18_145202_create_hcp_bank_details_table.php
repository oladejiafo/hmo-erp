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
        Schema::create('hcp_bank_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->cascadeOnDelete();
            $table->string('bank_name', 100);
            $table->string('account_name', 150);
            $table->string('account_number', 20);
            $table->string('sort_code', 10)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('verified_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['hcp_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hcp_bank_details');
    }
};
