<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracks inbound payment collection for a self-enrolment — money coming
 * FROM a new signup, not money going OUT to a provider. Deliberately a
 * separate table from `payment_gateway_transactions` (Phase 4), which is
 * scoped to `provider_payment_id` and models an entirely different flow
 * (batch disbursement to hospitals). Reusing that table would mean either
 * a nullable provider_payment_id everywhere or overloading its meaning —
 * a new table with its own name is more honest about what it actually is.
 *
 * The enrollee row is created in `inactive` status BEFORE payment starts
 * (see RetailEnrollmentController::register()) — this table links to it
 * from the start, not after payment succeeds, so there's always a
 * traceable record even for abandoned/failed checkouts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('retail_enrollment_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollee_id')->constrained('enrollees');
            $table->foreignId('plan_id')->constrained('plans');

            $table->string('tx_ref')->unique();
            // our reference, sent to Flutterwave, returned in the webhook

            $table->string('gateway_reference')->nullable();
            // Flutterwave's own transaction id, once assigned

            $table->decimal('amount', 12, 2);
            $table->string('status', 20)->default('pending');
            // pending | paid | failed | abandoned

            $table->string('payment_link')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('retail_enrollment_payments');
    }
};
