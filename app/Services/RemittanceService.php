<?php

namespace App\Services;

use App\Models\ProviderPayment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class RemittanceService
{
    /**
     * Generate a PDF remittance advice for a single provider payment.
     *
     * The PDF tells the HCP:
     *   - Which claims are being paid
     *   - The gross claim amount vs approved amount
     *   - Any deductions (e.g. capitation adjustments)
     *   - Net amount being transferred
     *   - Bank details on record
     *
     * Returns the storage path of the generated PDF.
     */
    public function generate(ProviderPayment $payment): string
    {
        // Eager load everything the template needs
        $payment->load([
            'hcp.activeBankDetail',
            'claim.items',
            'claim.enrollee:id,enrollee_id,first_name,last_name',
            'batch:id,batch_number,processed_at,approved_at',
        ]);

        $data = [
            'payment'        => $payment,
            'hcp'            => $payment->hcp,
            'bank'           => $payment->hcp?->activeBankDetail,
            'claim'          => $payment->claim,
            'batch'          => $payment->batch,
            'generated_at'   => now()->format('d M Y H:i'),
            'reference'      => $payment->payment_reference ?? $payment->batch?->batch_number . '-' . $payment->hcp_id,
            'company_name'   => config('hmo.name', 'HMO ERP System'),
        ];

        $pdf = Pdf::loadView('pdf.remittance', $data)
            ->setPaper('A4', 'portrait')
            ->setOptions([
                'defaultFont' => 'sans-serif',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => false,
            ]);

        $filename = $this->buildFilename($payment);
        $path     = "remittances/{$filename}";

        Storage::disk(config('hmo.storage_disk', 'local'))->put($path, $pdf->output());

        // Record the path on the payment record for future downloads
        $payment->update(['remittance_path' => $path]);

        return $path;
    }

    /**
     * Generate remittance for every payment in a completed batch.
     * Returns array of [payment_id => path].
     */
    public function generateBatch(int $batchId): array
    {
        $payments = ProviderPayment::where('batch_id', $batchId)
            ->where('status', 'paid')
            ->get();

        $paths = [];

        foreach ($payments as $payment) {
            try {
                $paths[$payment->id] = $this->generate($payment);
            } catch (\Throwable $e) {
                Log::error("Remittance generation failed for payment #{$payment->id}: " . $e->getMessage());
                $paths[$payment->id] = null;
            }
        }

        return $paths;
    }

    /**
     * Return raw PDF bytes for streaming/download without saving to disk.
     */
    public function stream(ProviderPayment $payment): string
    {
        $payment->load([
            'hcp.activeBankDetail',
            'claim.items',
            'batch',
        ]);

        return Pdf::loadView('pdf.remittance', ['payment' => $payment])
            ->setPaper('A4', 'portrait')
            ->output();
    }

    protected function buildFilename(ProviderPayment $payment): string
    {
        $batchNum = $payment->batch?->batch_number ?? 'MANUAL';
        $hcpCode  = $payment->hcp?->hcp_code ?? $payment->hcp_id;
        $date     = now()->format('Ymd');

        return "remittance-{$batchNum}-{$hcpCode}-{$date}.pdf";
    }
}