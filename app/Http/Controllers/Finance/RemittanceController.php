<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\ProviderPayment;
use App\Services\RemittanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class RemittanceController extends Controller
{
    public function __construct(protected RemittanceService $remittanceService) {}

    /**
     * Generate (or re-generate) a PDF remittance advice for a provider payment.
     * Returns a download URL so the frontend can open/download it.
     */
    public function generate(ProviderPayment $payment): JsonResponse
    {
        try {
            $path = $this->remittanceService->generate($payment);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to generate remittance advice: ' . $e->getMessage(),
            ], 500);
        }
    
        return response()->json([
            'message'      => 'Remittance advice generated successfully.',
            'download_url' => asset('storage/' . $path),
            'filename'     => basename($path),
        ]);
    }

    /**
     * Stream the remittance PDF directly to the browser for download.
     * If the file was already generated and saved, serve it from disk.
     * Otherwise, generate it on the fly.
     */
    public function download(ProviderPayment $payment): \Illuminate\Http\Response
    {
        $filename = "remittance-{$payment->id}.pdf";

        // Serve from disk if already generated
        if ($payment->remittance_path) {
            $disk = Storage::disk(config('hmo.storage_disk', 'local'));

            if ($disk->exists($payment->remittance_path)) {
                return response($disk->get($payment->remittance_path), 200, [
                    'Content-Type'        => 'application/pdf',
                    'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                ]);
            }
        }

        // Regenerate on the fly if not on disk
        $pdf = $this->remittanceService->stream($payment);

        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}