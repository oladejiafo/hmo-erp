<?php

namespace App\Services\PaymentGateways;

/**
 * HONEST STUB, not a working implementation. You named Interswitch as
 * secondary with Flutterwave as default - I focused full effort on
 * Flutterwave since that's what actually gets called by default. This
 * class exists so PaymentGatewayService's interface-based design already
 * has a slot for Interswitch without a refactor later, but calling
 * transfer() or verifyTransfer() right now throws, on purpose, rather than
 * silently pretending to work.
 *
 * Interswitch's transfer API (Quickteller Payout / their B2B disbursement
 * product) has a different auth flow (OAuth2 client-credentials, not a
 * static bearer token) and a different payload shape - this needs its own
 * real implementation pass when you're ready to actually wire it in, not a
 * guess.
 */
class InterswitchGateway implements PaymentGatewayInterface
{
    public function name(): string
    {
        return 'interswitch';
    }

    public function transfer(GatewayTransferRequest $request): GatewayTransferResult
    {
        throw new \RuntimeException(
            'Interswitch gateway is not yet implemented. Flutterwave is the active default - set PAYMENT_GATEWAY_DEFAULT=flutterwave in .env, or implement this class before selecting Interswitch.'
        );
    }

    public function verifyTransfer(string $gatewayReference): GatewayTransferResult
    {
        throw new \RuntimeException('Interswitch gateway is not yet implemented.');
    }
}
