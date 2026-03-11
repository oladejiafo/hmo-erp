<?php

namespace App\Services;

use App\Enums\ClaimStatus;
use App\Enums\PaymentBatchStatus;
use App\Models\Claim;
use App\Models\LedgerEntry;
use App\Models\PaymentBatch;
use App\Models\ProviderPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class PaymentBatchService
{
    /**
     * Create a payment batch from all approved, unpaid claims in the branch.
     * Groups claims by HCP so each provider gets one remittance.
     */
    public function createFromApprovedClaims(int $branchId, ?array $claimIds = null, ?int $userId = null): PaymentBatch
    {
        return DB::transaction(function () use ($branchId, $claimIds, $userId) {
            // Get approved claims not yet in a batch
            $query = Claim::withoutGlobalScopes()
                ->where('branch_id', $branchId)
                ->where('status', ClaimStatus::APPROVED->value)
                ->whereDoesntHave('payment')
                ->with('hcp:id,name');

            if ($claimIds) {
                $query->whereIn('id', $claimIds);
            }

            $claims = $query->get();

            if ($claims->isEmpty()) {
                throw new \RuntimeException('No approved claims available for batching.');
            }

            $batchNumber = PaymentBatch::generateUniqueId('BATCH', 'batch_number', 4, 'NG');

            $batch = PaymentBatch::create([
                'branch_id'      => $branchId,
                'batch_number'   => $batchNumber,
                'description'    => "Payment batch for " . $claims->count() . " approved claims",
                'total_amount'   => $claims->sum('total_amount_approved'),
                'claim_count'    => $claims->count(),
                'provider_count' => $claims->pluck('hcp_id')->unique()->count(),
                'status'         => PaymentBatchStatus::DRAFT->value,
                // 'created_by'     => Auth::id(),
                'created_by'     => $userId ?? Auth::id(),
            ]);

            // Create provider payment record per claim
            foreach ($claims as $claim) {
                ProviderPayment::create([
                    'batch_id'   => $batch->id,
                    'hcp_id'     => $claim->hcp_id,
                    'claim_id'   => $claim->id,
                    'amount'     => $claim->total_amount_approved,
                    'status'     => 'pending',
                ]);
            }

            return $batch;
        });
    }

    /**
     * Approve a batch and mark all constituent claims as paid.
     * Creates ledger entries for each payment.
     */
    public function approveBatch(PaymentBatch $batch): PaymentBatch
    {
        if ($batch->status !== PaymentBatchStatus::SUBMITTED) {
            throw new \RuntimeException("Only submitted batches can be approved. Current status: {$batch->status->value}");
        }

        return DB::transaction(function () use ($batch) {
            $batch->update([
                'status'       => PaymentBatchStatus::APPROVED->value,
                'approved_by'  => Auth::id(),
                'approved_at'  => now(),
            ]);

            // Process each payment in the batch
            foreach ($batch->payments as $payment) {
                $payment->update([
                    'status'    => 'paid',
                    'paid_at'   => now(),
                    'payment_reference' => $batch->batch_number . '-' . $payment->hcp_id,
                ]);

                // Move claim to paid status
                $claim = $payment->claim;
                app(ClaimStateService::class)->markPaid($claim, $payment->amount);

                // Create ledger debit entry
                LedgerEntry::create([
                    'branch_id'      => $batch->branch_id,
                    'entry_type'     => 'debit',
                    'category'       => 'claim_payment',
                    'amount'         => $payment->amount,
                    'reference_type' => ProviderPayment::class,
                    'reference_id'   => $payment->id,
                    'description'    => "Payment to HCP: {$payment->hcp->name} for claim {$claim->claim_number}",
                    'created_by'     => Auth::id(),
                ]);
            }

            $batch->update([
                'status'       => PaymentBatchStatus::COMPLETED->value,
                'processed_at' => now(),
            ]);

            return $batch->fresh();
        });
    }

    /**
     * Generate a bank export CSV (NEFT format for Nigerian banks).
     */
    public function generateBankExport(PaymentBatch $batch): string
    {
        $filename = "bank-exports/batch-{$batch->batch_number}.csv";
        $lines    = ["Beneficiary Name,Account Number,Bank,Sort Code,Amount,Narration"];

        foreach ($batch->payments as $payment) {
            $hcp         = $payment->hcp;
            $bankDetail  = $hcp->activeBankDetail;

            if (! $bankDetail) {
                continue; // Skip HCPs with no bank details — log separately
            }

            $lines[] = implode(',', [
                "\"{$bankDetail->account_name}\"",
                $bankDetail->account_number,
                "\"{$bankDetail->bank_name}\"",
                $bankDetail->sort_code ?? '',
                number_format($payment->amount, 2, '.', ''),
                "\"HMO Payment - {$batch->batch_number}\"",
            ]);
        }

        $csv = implode("\n", $lines);

        Storage::disk(config('hmo.storage_disk', 'local'))->put($filename, $csv);

        $batch->update(['bank_export_path' => $filename]);

        return $filename;
    }
}