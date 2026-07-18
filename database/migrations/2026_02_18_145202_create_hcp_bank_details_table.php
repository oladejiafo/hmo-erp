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
            
            // NEW: Who added this record (maker)
            $table->foreignId('added_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            
            $table->string('bank_name', 100);
            
            // NEW: Bank code (for payment processing)
            $table->string('bank_code', 20)->nullable();
            
            $table->string('account_name', 150);
            $table->string('account_number', 20);
            
            // NEW: Account type (savings/current/etc)
            $table->string('account_type', 20)->nullable()->default('savings');
            
            $table->string('sort_code', 10)->nullable();
            
            // CHANGED: Renamed from is_active to is_verified, default false
            $table->boolean('is_verified')->default(false);
            
            $table->foreignId('verified_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
    
            // UPDATED: Index on hcp_id and is_verified instead of is_active
            $table->index(['hcp_id', 'is_verified']);
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
