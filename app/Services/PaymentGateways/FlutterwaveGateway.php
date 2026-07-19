<?php

namespace App\Services\PaymentGateways;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Flutterwave's real v3 Transfers API - https://developer.flutterwave.com/docs/transfers
 * POST /transfers to initiate, GET /transfers/{id} or
 * /transfers/verify_by_reference to check status, webhook confirms async.
 *
 * NOT TESTED against a live Flutterwave account - I don't have one to test
 * against. The request/response shape below matches their public API docs
 * exactly, but "matches the docs" and "works against your actual account
 * settings" aren't the same guarantee. Test with a small real transfer in
 * their sandbox before trusting this with a real payroll-sized batch.
 */
class FlutterwaveGateway implements PaymentGatewayInterface
{
    private string $secretKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.flutterwave.secret_key');
        $this->baseUrl = config('services.flutterwave.base_url', 'https://api.flutterwave.com/v3');
    }

    public function name(): string
    {
        return 'flutterwave';
    }

    public function transfer(GatewayTransferRequest $request): GatewayTransferResult
    {
        $payload = [
            'account_bank' => $request->bankCode,
            'account_number' => $request->accountNumber,
            'amount' => $request->amount,
            'narration' => $request->narration,
            'currency' => $request->currency,
            'reference' => $request->reference,
            'callback_url' => config('services.flutterwave.webhook_url'),
            'debit_currency' => $request->currency,
        ];

        try {
            $response = Http::withToken($this->secretKey)
                ->timeout(30)
                ->post("{$this->baseUrl}/transfers", $payload);

            $body = $response->json();

            if (! $response->successful() || ($body['status'] ?? null) !== 'success') {
                return new GatewayTransferResult(
                    success: false,
                    status: 'failed',
                    failureReason: $body['message'] ?? 'Transfer request rejected by gateway',
                    rawResponse: $body ?? [],
                );
            }

            // Flutterwave returns the transfer as NEW/PENDING immediately -
            // final success/failure comes via webhook.
            $gatewayStatus = strtoupper($body['data']['status'] ?? 'PENDING');

            return new GatewayTransferResult(
                success: true,
                status: in_array($gatewayStatus, ['NEW', 'PENDING']) ? 'processing' : strtolower($gatewayStatus),
                gatewayReference: (string) ($body['data']['id'] ?? ''),
                rawResponse: $body,
            );
        } catch (\Exception $e) {
            Log::error('Flutterwave transfer request failed', ['reference' => $request->reference, 'error' => $e->getMessage()]);

            return new GatewayTransferResult(
                success: false,
                status: 'failed',
                failureReason: 'Network/connection error: ' . $e->getMessage(),
            );
        }
    }

    public function verifyTransfer(string $gatewayReference): GatewayTransferResult
    {
        try {
            $response = Http::withToken($this->secretKey)
                ->timeout(30)
                ->get("{$this->baseUrl}/transfers/{$gatewayReference}");

            $body = $response->json();
            $status = strtoupper($body['data']['status'] ?? 'PENDING');

            return new GatewayTransferResult(
                success: $status === 'SUCCESSFUL',
                status: match ($status) {
                    'SUCCESSFUL' => 'success',
                    'FAILED' => 'failed',
                    default => 'processing',
                },
                gatewayReference: $gatewayReference,
                failureReason: $status === 'FAILED' ? ($body['data']['complete_message'] ?? 'Transfer failed') : null,
                rawResponse: $body ?? [],
            );
        } catch (\Exception $e) {
            Log::error('Flutterwave transfer verification failed', ['gateway_reference' => $gatewayReference, 'error' => $e->getMessage()]);

            return new GatewayTransferResult(success: false, status: 'processing', failureReason: $e->getMessage());
        }
    }

    /**
     * Verifies the webhook signature Flutterwave sends in the
     * 'verif-hash' header, matched against your configured hash secret
     * (set separately from the secret key in the Flutterwave dashboard).
     */
    public static function verifyWebhookSignature(string $signatureHeader): bool
    {
        $expected = config('services.flutterwave.webhook_hash');
        return $expected && hash_equals($expected, $signatureHeader ?? '');
    }
}
