<?php

namespace App\Services\PaymentGateways;

/**
 * Plain data carriers, not Eloquent models - these cross a network
 * boundary (to the gateway and back), so keeping them dumb and explicit
 * makes it obvious exactly what data leaves this application.
 */
class GatewayTransferRequest
{
    public function __construct(
        public string $reference,      // our idempotency key
        public float $amount,
        public string $accountNumber,
        public string $bankCode,
        public string $accountName,
        public string $narration,
        public string $currency = 'NGN',
    ) {}
}

class GatewayTransferResult
{
    public function __construct(
        public bool $success,
        public string $status,             // 'processing' | 'success' | 'failed'
        public ?string $gatewayReference = null,
        public ?string $failureReason = null,
        public array $rawResponse = [],
    ) {}
}
