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
        Schema::create('corporate_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('corporate_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->string('plan_name', 100)->comment('e.g. Gold, Silver, Executive Care');
            $table->string('plan_code', 30)->unique();
            $table->decimal('annual_premium', 15, 2)->default(0);
            $table->decimal('max_benefit_value', 15, 2)
                  ->default(0)
                  ->comment('Maximum NGN benefit per enrollee per year');
            $table->unsignedInteger('employee_count')->default(0);
            $table->json('covered_services')
                  ->nullable()
                  ->comment('JSON array of covered service categories');
            $table->unsignedTinyInteger('max_dependents')
                  ->default(4)
                  ->comment('Max number of dependents per principal enrollee');
            $table->enum('status', ['active', 'expired', 'suspended'])->default('active');
            $table->date('effective_from');
            $table->date('effective_to');
            $table->timestamps();

            $table->index(['corporate_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('corporate_plans');
    }
};
