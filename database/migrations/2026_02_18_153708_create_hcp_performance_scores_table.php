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
        Schema::create('hcp_performance_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers') // Make sure this table exists
                  ->cascadeOnDelete();
            $table->unsignedTinyInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->decimal('score', 5, 2)->default(100.00);
            $table->unsignedInteger('total_claims_submitted')->default(0);
            $table->unsignedInteger('total_claims_approved')->default(0);
            $table->unsignedInteger('total_fraud_flags')->default(0);
            $table->decimal('avg_resolution_days', 8, 2)->default(0);
            $table->json('score_breakdown')->nullable()->comment('JSON breakdown of scoring factors');
            $table->timestamps();

            $table->unique(['hcp_id', 'period_month', 'period_year'], 'unique_hcp_period_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hcp_performance_scores');
    }
};
