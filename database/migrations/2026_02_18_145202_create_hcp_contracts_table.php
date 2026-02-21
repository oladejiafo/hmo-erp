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
        Schema::create('hcp_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->cascadeOnDelete();
            $table->string('contract_number', 50)->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('document_path')
                  ->nullable()
                  ->comment('Signed contract PDF path in storage');
            $table->enum('status', ['draft', 'active', 'expired', 'terminated'])
                  ->default('draft');
            $table->text('terms_summary')->nullable();
            $table->decimal('capitation_rate', 15, 2)
                  ->default(0)
                  ->comment('Monthly capitation per enrolled member, 0 if fee-for-service');
            $table->enum('payment_model', ['fee_for_service', 'capitation', 'hybrid'])
                  ->default('fee_for_service');
            $table->foreignId('signed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();

            $table->index(['hcp_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hcp_contracts');
    }
};
