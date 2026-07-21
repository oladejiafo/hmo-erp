<?php
/**
 * NEW FILE - app/Http/Controllers/Finance/PaymentGatewayWebhookController.php
 *
 * Public route (no auth:sanctum) - Flutterwave calls this directly, it has
 * no session or API token. Security comes entirely from the 'verif-hash'
 * header check, matched against a secret you set in both your .env and
 * the Flutterwave dashboard's webhook settings. Never trust this payload
 * without that check passing first.
 */

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\PaymentGatewayTransaction;
use App\Services\PaymentGatewayService;
use App\Services\PaymentGateways\FlutterwaveGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentGatewayWebhookController extends Controller
{
    public function __construct(
        private PaymentGatewayService $gatewayService,
        private \App\Http\Controllers\RetailEnrollmentController $retailController,
    ) {}

    public function flutterwave(Request $request): JsonResponse
    {
        $signature = $request->header('verif-hash');

        if (! FlutterwaveGateway::verifyWebhookSignature($signature)) {
            Log::warning('Flutterwave webhook rejected - signature mismatch', ['ip' => $request->ip()]);
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();
        $event = $payload['event'] ?? null;

        // Only transfer events matter here - Flutterwave's webhook
        // endpoint is shared across products (payments, transfers) if you
        // use the same URL for both. Ignore anything that isn't a transfer
        // event rather than erroring on it.
        if (! str_starts_with((string) $event, 'transfer.')) {
            return response()->json(['message' => 'Ignored - not a transfer event']);
        }

        $data = $payload['data'] ?? [];
        $gatewayReference = (string) ($data['id'] ?? '');
        $status = strtoupper($data['status'] ?? '');

        if (! $gatewayReference) {
            Log::warning('Flutterwave webhook missing transfer id', ['payload' => $payload]);
            return response()->json(['message' => 'Missing transfer reference'], 422);
        }

        $transaction = PaymentGatewayTransaction::where('gateway_reference', $gatewayReference)->first();

        if (! $transaction) {
            // Could be a transfer initiated outside this system, or the
            // webhook arriving before our own transfer() response was
            // saved (race condition on a slow request). Log and 200 back
            // so Flutterwave doesn't keep retrying forever - verifyTransfer()
            // as a reconciliation sweep is the fallback for genuine misses.
            Log::warning('Flutterwave webhook - no matching transaction found', ['gateway_reference' => $gatewayReference]);
            return response()->json(['message' => 'No matching transaction']);
        }

        // Idempotency - webhooks can and do arrive more than once.
        if (in_array($transaction->status, ['success', 'failed'])) {
            return response()->json(['message' => 'Already processed']);
        }

        $success = $status === 'SUCCESSFUL';
        $failureReason = $success ? null : ($data['complete_message'] ?? 'Transfer failed');

        $this->gatewayService->confirmTransaction($transaction, $success, $failureReason);

        return response()->json(['message' => 'Processed']);
    }

    /**
     * [RETAIL] Confirms an inbound retail enrolment payment. Same
     * signature-verification requirement as the transfer webhook. Per
     * Flutterwave's own guidance, this webhook is a TRIGGER to verify, not
     * proof by itself, it still calls verifyCharge() server-to-server
     * before activating anything.
     */
    public function flutterwaveCharge(Request $request): JsonResponse
    {
        $signature = $request->header('verif-hash');

        if (! FlutterwaveGateway::verifyWebhookSignature($signature)) {
            Log::warning('Flutterwave charge webhook rejected - signature mismatch', ['ip' => $request->ip()]);
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();
        $event = $payload['event'] ?? null;

        if ($event !== 'charge.completed') {
            return response()->json(['message' => 'Ignored - not a charge.completed event']);
        }

        $data = $payload['data'] ?? [];
        $txRef = $data['tx_ref'] ?? null;
        $transactionId = (string) ($data['id'] ?? '');
        $status = strtolower($data['status'] ?? '');

        if (! $txRef || ! $transactionId) {
            Log::warning('Flutterwave charge webhook missing tx_ref or id', ['payload' => $payload]);
            return response()->json(['message' => 'Missing reference'], 422);
        }

        $payment = \App\Models\RetailEnrollmentPayment::where('tx_ref', $txRef)->first();

        if (! $payment) {
            Log::warning('Flutterwave charge webhook - no matching retail payment found', ['tx_ref' => $txRef]);
            return response()->json(['message' => 'No matching payment']);
        }

        if ($payment->status === 'paid') {
            return response()->json(['message' => 'Already processed']);
        }

        if ($status !== 'successful') {
            $payment->update(['status' => 'failed']);
            return response()->json(['message' => 'Charge was not successful']);
        }

        $gateway = app(FlutterwaveGateway::class);
        $verification = $gateway->verifyCharge($transactionId);

        if (! $verification['success'] || $verification['tx_ref'] !== $payment->tx_ref) {
            Log::warning('Flutterwave charge webhook verification failed', ['tx_ref' => $txRef, 'transaction_id' => $transactionId]);
            return response()->json(['message' => 'Verification failed']);
        }

        if ((float) $verification['amount'] < (float) $payment->amount) {
            Log::warning('Flutterwave charge webhook amount mismatch', ['tx_ref' => $txRef, 'expected' => $payment->amount, 'received' => $verification['amount']]);
            return response()->json(['message' => 'Amount mismatch']);
        }

        $this->retailController->confirmPayment($payment, $transactionId);

        return response()->json(['message' => 'Processed']);
    }
}
