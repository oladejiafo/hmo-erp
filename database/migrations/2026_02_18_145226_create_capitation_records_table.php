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
        Schema::create('capitation_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->restrictOnDelete();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete();
            $table->unsignedTinyInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->unsignedInteger('enrolled_member_count')
                  ->comment('Number of members enrolled under this HCP for the period');
            $table->decimal('rate_per_member', 15, 2)
                  ->comment('Monthly capitation rate per enrolled member (NGN)');
            $table->decimal('total_amount', 15, 2);
            $table->enum('status', ['pending', 'approved', 'paid'])->default('pending');
            $table->foreignId('payment_batch_id')
                  ->nullable()
                  ->constrained('payment_batches')
                  ->nullOnDelete();
            $table->timestamps();

            $table->unique(['hcp_id', 'period_month', 'period_year'], 'unique_hcp_capitation_period');
            $table->index(['branch_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('capitation_records');
    }
};
