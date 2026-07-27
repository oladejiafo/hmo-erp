<?php
/**
 * FILE: database/migrations/2026_08_12_000003_create_treatment_plans_table.php
 *
 * PHASE 3 - Mini EMR.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treatment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('encounter_id')->constrained('encounters')->cascadeOnDelete();
            $table->text('plan_text');
            $table->text('target_outcomes')->nullable();
            $table->date('review_date')->nullable();
            $table->string('status', 20)->default('active'); // active | completed | discontinued
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('encounter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treatment_plans');
    }
};
