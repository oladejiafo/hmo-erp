<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every gateway call gets a row here - the raw request/response is kept
 * for reconciliation and debugging failed transfers. This is separate from
 * provider_payments.status (which just holds current state) so a payment
 * that got retried after a failure has a full history, not just the latest
 * attempt.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateway_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('payment_batches');
            $table->foreignId('provider_payment_id')->constrained('provider_payments');

            $table->string('gateway', 20);
            // flutterwave | interswitch

            $table->string('reference')->unique();
            // our own idempotency key, sent to the gateway

            $table->string('gateway_reference')->nullable();
            // the gateway's own transaction ID, once they assign one

            $table->string('status', 20)->default('initiated');
            // initiated | processing | success | failed

            $table->decimal('amount', 15, 2);
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('failure_reason')->nullable();

            $table->timestamp('initiated_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();

            $table->index(['batch_id', 'status']);
            $table->index('gateway_reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_gateway_transactions');
    }
};
