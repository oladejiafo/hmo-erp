<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Same pattern as retail_enrollment_payments (Phase 9) — a dedicated
 * tracking row per checkout attempt, rather than overloading
 * corporate_invoices.payment_reference with pending/confirmed state.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('corporate_invoice_id')->constrained('corporate_invoices');
            $table->string('tx_ref')->unique();
            $table->string('gateway_reference')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('status', 20)->default('pending'); // pending | paid | failed
            $table->string('payment_link')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
    }
};
