<?php
/**
 * NEW FILE - app/Services/PaymentGatewayService.php
 *
 * Deliberately a NEW method, not a modification of
 * PaymentBatchService::approveBatch(). That method still works exactly as
 * it does today - synchronous, marks everything paid immediately, for when
 * staff want the manual bank-file path or the gateway is down. This is the
 * alternative path: real money movement via API, asynchronous, claims only
 * marked paid once the gateway actually confirms success.
 *
 * This is a real behavior change worth being explicit about: today,
 * clicking "Approve" marks a claim paid the instant a manager clicks a
 * button, before any money has moved - a genuine reconciliation risk if a
 * bank transfer later bounces. Going through the gateway path fixes that:
 * a claim only becomes 'paid' when Flutterwave confirms it, not when a
 * human clicks approve. That's a meaningful difference in what "paid"
 * means in your system, and worth discussing with whoever relies on that
 * status being accurate (finance reporting, HCP-facing payment status).
 */

namespace App\Services;

use App\Enums\PaymentBatchStatus;
use App\Models\LedgerEntry;
use App\Models\PaymentBatch;
use App\Models\PaymentGatewayTransaction;
use App\Models\ProviderPayment;
use App\Services\PaymentGateways\FlutterwaveGateway;
use App\Services\PaymentGateways\GatewayTransferRequest;
use App\Services\PaymentGateways\InterswitchGateway;
use App\Services\PaymentGateways\PaymentGatewayInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentGatewayService
{
    public function gateway(?string $name = null): PaymentGatewayInterface
    {
        $name = $name ?? config('services.payment_gateway.default', 'flutterwave');

        return match ($name) {
            'flutterwave' => app(FlutterwaveGateway::class),
            'interswitch' => app(InterswitchGateway::class),
            default => throw new \InvalidArgumentException("Unknown payment gateway: {$name}"),
        };
    }

    /**
     * Kick off real disbursement for a submitted batch. Per-payment
     * failures (missing bank code, gateway rejects one transfer) don't
     * abort the whole batch - every payment that CAN go out, does; the
     * ones that can't are reported back so staff can fix and retry
     * individually rather than the entire batch being blocked by one bad
     * bank detail.
     */
    public function disburseBatch(PaymentBatch $batch, ?string $gatewayName = null): array
    {
        if ($batch->status !== PaymentBatchStatus::SUBMITTED) {
            throw new \RuntimeException("Only submitted batches can be disbursed. Current status: {$batch->status->value}");
        }

        $gateway = $this->gateway($gatewayName);
        $initiated = [];
        $skipped = [];
        $immediateFailures = [];

        DB::transaction(function () use ($batch, $gateway, &$initiated, &$skipped, &$immediateFailures) {
            $batch->update([
                'status' => PaymentBatchStatus::PROCESSING->value,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);

            foreach ($batch->payments()->with(['hcp.activeBankDetail'])->get() as $payment) {
                $bankDetail = $payment->hcp->activeBankDetail ?? null;

                if (!$bankDetail || !$bankDetail->bank_code || !$bankDetail->account_number) {
                    $skipped[] = ['payment_id' => $payment->id, 'hcp_name' => $payment->hcp->name, 'reason' => 'Missing bank code or account number'];
                    continue;
                }

                $reference = "PGW-{$batch->batch_number}-{$payment->id}-" . now()->timestamp;

                $transferRequest = new GatewayTransferRequest(
                    reference: $reference,
                    amount: (float) $payment->amount,
                    accountNumber: $bankDetail->account_number,
                    bankCode: $bankDetail->bank_code,
                    accountName: $bankDetail->account_name,
                    narration: "HMO Payment - {$batch->batch_number} - {$payment->claim->claim_number}",
                );

                $result = $gateway->transfer($transferRequest);

                $transaction = PaymentGatewayTransaction::create([
                    'batch_id' => $batch->id,
                    'provider_payment_id' => $payment->id,
                    'gateway' => $gateway->name(),
                    'reference' => $reference,
                    'gateway_reference' => $result->gatewayReference,
                    'status' => $result->status,
                    'amount' => $payment->amount,
                    'request_payload' => (array) $transferRequest,
                    'response_payload' => $result->rawResponse,
                    'failure_reason' => $result->failureReason,
                    'initiated_at' => now(),
                    'confirmed_at' => $result->status === 'success' ? now() : null,
                ]);

                if ($result->status === 'failed') {
                    $payment->update(['status' => 'failed', 'failure_reason' => $result->failureReason]);
                    $immediateFailures[] = ['payment_id' => $payment->id, 'hcp_name' => $payment->hcp->name, 'reason' => $result->failureReason];
                } else {
                    // 'processing' - webhook confirms the rest. Payment
                    // status stays 'pending' until we know for sure; we
                    // don't have a DB value for "sent but unconfirmed"
                    // beyond the transaction row itself tracking that.
                    $initiated[] = ['payment_id' => $payment->id, 'hcp_name' => $payment->hcp->name, 'reference' => $reference];
                }
            }
        });

        Log::info('Batch disbursement initiated', [
            'batch_id' => $batch->id, 'initiated' => count($initiated),
            'skipped' => count($skipped), 'immediate_failures' => count($immediateFailures),
        ]);

        return compact('initiated', 'skipped', 'immediateFailures');
    }

    /**
     * Called by the webhook handler once Flutterwave confirms a transfer's
     * final status. This is where the claim actually gets marked paid -
     * not at disburseBatch() time.
     */
    public function confirmTransaction(PaymentGatewayTransaction $transaction, bool $success, ?string $failureReason = null): void
    {
        DB::transaction(function () use ($transaction, $success, $failureReason) {
            $transaction->update([
                'status' => $success ? 'success' : 'failed',
                'confirmed_at' => now(),
                'failure_reason' => $failureReason,
            ]);

            $payment = $transaction->providerPayment;

            if ($success) {
                $payment->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'payment_reference' => $transaction->gateway_reference,
                ]);

                $claim = $payment->claim;
                app(ClaimStateService::class)->markPaid($claim, $payment->amount);

                LedgerEntry::create([
                    'branch_id' => $payment->batch->branch_id,
                    'entry_type' => 'debit',
                    'category' => 'claim_payment',
                    'amount' => $payment->amount,
                    'reference_type' => ProviderPayment::class,
                    'reference_id' => $payment->id,
                    'description' => "Payment to HCP: {$payment->hcp->name} for claim {$claim->claim_number} (via {$transaction->gateway})",
                    'created_by' => $payment->batch->approved_by,
                ]);
            } else {
                $payment->update(['status' => 'failed', 'failure_reason' => $failureReason]);
            }

            $this->refreshBatchStatus($payment->batch);
        });
    }

    /**
     * Once every payment in a batch has settled (paid or failed, nothing
     * still processing), roll the batch itself to completed/failed.
     */
    private function refreshBatchStatus(PaymentBatch $batch): void
    {
        $payments = $batch->payments;
        $stillPending = $payments->whereIn('status', ['pending'])->count();

        if ($stillPending > 0) {
            return; // some transfers still in flight, leave batch as PROCESSING
        }

        $anyFailed = $payments->where('status', 'failed')->count() > 0;

        $batch->update([
            'status' => $anyFailed ? PaymentBatchStatus::FAILED->value : PaymentBatchStatus::COMPLETED->value,
            'processed_at' => now(),
        ]);
    }
}
