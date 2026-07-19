<?php

namespace App\Services\PaymentGateways;

/**
 * One contract, two implementations (Flutterwave default, Interswitch
 * secondary, per your decision). PaymentGatewayService picks which one to
 * call - nothing else in the codebase should reference FlutterwaveGateway
 * or InterswitchGateway directly, so swapping providers later, or adding a
 * third, never touches PaymentBatchService or the controller.
 */

interface PaymentGatewayInterface
{
    /**
     * Initiate a single transfer. Returns a result object regardless of
     * whether the transfer is immediately confirmed or still pending -
     * gateways that respond asynchronously (webhook-confirmed) return
     * 'processing', not 'success', from this call.
     */
    public function transfer(GatewayTransferRequest $request): GatewayTransferResult;

    /**
     * Verify a transfer's current status directly with the gateway -
     * used as a fallback if a webhook never arrives (network issue,
     * webhook endpoint down at the time, etc).
     */
    public function verifyTransfer(string $gatewayReference): GatewayTransferResult;

    public function name(): string;
}
