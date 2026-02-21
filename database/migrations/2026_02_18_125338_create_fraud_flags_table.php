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
        Schema::create('fraud_flags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('hcp_id')
                  ->nullable()
                  ->constrained('health_care_providers')
                  ->nullOnDelete();
            $table->foreignId('enrollee_id')
                  ->nullable()
                  ->constrained()
                  ->nullOnDelete();
            $table->enum('flag_type', [
                'duplicate_claim',
                'tariff_mismatch',
                'expired_plan',
                'over_benefit_limit',
                'frequency_anomaly',       // Too many claims in short period
                'cost_spike',              // Claim item price >> agreed tariff
                'pattern_deviation',       // Statistical anomaly vs HCP/enrollee baseline
                'provider_blacklisted',
                'invalid_diagnosis_code',
                'pre_auth_missing',
            ]);
            $table->decimal('flag_score', 5, 2)
                  ->default(0)
                  ->comment('Score contribution of this specific flag (0-100)');
            $table->json('details')
                  ->nullable()
                  ->comment('Machine-readable details: what was compared, what was found');
            $table->text('description')
                  ->comment('Human-readable explanation of this flag');
            $table->enum('status', ['open', 'reviewed', 'dismissed', 'confirmed', 'escalated'])
                  ->default('open');
            $table->foreignId('reviewed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_note')->nullable();
            $table->timestamps();

            $table->index('claim_id');
            $table->index('flag_type');
            $table->index('status');
            $table->index('hcp_id');
            $table->index('enrollee_id');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fraud_flags');
    }
};
