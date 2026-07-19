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
        Schema::create('claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete();
            $table->string('claim_number', 40)->unique()->comment('e.g. CLM-ABJ-2024-000001');
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->restrictOnDelete();
            $table->foreignId('enrollee_id')
                  ->constrained()
                  ->restrictOnDelete();

            // The enrollee may be a principal or dependent - we track separately
            $table->unsignedBigInteger('dependent_id')
                  ->nullable()
                  ->comment('If claim is for a dependent, set this. enrollee_id remains the principal.');
            $table->foreign('dependent_id')
                  ->references('id')
                  ->on('dependents')
                  ->nullOnDelete();

            $table->date('service_date')->comment('Date service was rendered');
            $table->date('submission_date')->comment('Date HCP submitted the claim');
            $table->date('admission_date')->nullable()->comment('For inpatient claims');
            $table->date('discharge_date')->nullable()->comment('For inpatient claims');

            $table->json('diagnosis_codes')
                  ->nullable()
                  ->comment('ICD-10 codes array e.g. ["J06.9","Z00.0"]');
            $table->string('diagnosis_description')->nullable();

            $table->decimal('total_amount_claimed', 15, 2)->default(0);
            $table->decimal('total_amount_approved', 15, 2)
                  ->default(0)
                  ->comment('Set after officer review - may differ from claimed');
            $table->decimal('total_amount_paid', 15, 2)
                  ->default(0)
                  ->comment('Actual amount disbursed after batch processing');

            $table->enum('status', [
                'submitted',
                'auto_validating',
                'auto_validated',
                'flagged',
                'under_review',
                'supervisor_review',
                'approved',
                'rejected',
                'paid',
                'reversed',
            ])->default('submitted');

            $table->enum('claim_type', [
                'outpatient',
                'inpatient',
                'dental',
                'optical',
                'maternity',
                'emergency',
                'surgery',
                'laboratory',
                'radiology',
                'drug_refill',
            ])->default('outpatient');

            $table->decimal('risk_score', 5, 2)
                  ->default(0.00)
                  ->comment('0-100, calculated by FraudScoringService. >=70 auto-escalates.');

            $table->boolean('is_pre_authorized')
                  ->default(false)
                  ->comment('Pre-authorization was granted before treatment');
            $table->string('pre_auth_code', 50)->nullable();

            $table->text('reviewer_notes')->nullable();
            $table->text('rejection_reason')->nullable();

            $table->string('source')->default('manual');
            $table->foreignId('import_batch_id')->nullable()->constrained('claim_import_batches')->nullOnDelete();
            $table->string('hcp_invoice_ref')->nullable()->index();

            $table->timestamp('auto_validated_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('branch_id');
            $table->index('hcp_id');
            $table->index('enrollee_id');
            $table->index('status');
            $table->index('claim_type');
            $table->index('service_date');
            $table->index('submission_date');
            $table->index('risk_score');
            $table->index(['hcp_id', 'enrollee_id', 'service_date'], 'idx_duplicate_check');
        });

        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claims');
    }
};
