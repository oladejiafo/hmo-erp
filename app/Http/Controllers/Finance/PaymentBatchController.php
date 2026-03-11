<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentBatchResource;
use App\Models\PaymentBatch;
use App\Services\PaymentBatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class PaymentBatchController extends Controller
{
    public function __construct(protected PaymentBatchService $batchService) {}

    public function index(Request $request): JsonResponse
    {
        $batches = PaymentBatch::query()
            ->with(['createdBy:id,name', 'approvedBy:id,name'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => PaymentBatchResource::collection($batches),
        ]);
    }

    /**
     * Create a new batch from all approved, unbatched claims.
     * Optionally accepts specific claim IDs in request body.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'claim_ids' => ['nullable', 'array'],
            'claim_ids.*' => ['integer', 'exists:claims,id'],
        ]);

        try {
            $batch = $this->batchService->createFromApprovedClaims(
                /** @disregard P1013 */
                Auth::user()->branch_id,
                $request->claim_ids,
                Auth::id()   
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Payment batch {$batch->batch_number} created with {$batch->claim_count} claims.",
            'data'    => new PaymentBatchResource($batch->load(['payments.hcp'])),
        ], 201);
    }

    public function show(PaymentBatch $batch): JsonResponse
    {
        $batch->load([
            'payments.hcp:id,name,hcp_code',
            'payments.claim:id,claim_number,total_amount_approved',
            'createdBy:id,name',
            'approvedBy:id,name',
        ]);

        return response()->json(['data' => new PaymentBatchResource($batch)]);
    }

    public function submit(PaymentBatch $batch): JsonResponse
    {
        if (! $batch->status->isEditable()) {
            return response()->json(['message' => 'Only draft batches can be submitted.'], 422);
        }

        $batch->update(['status' => 'submitted']);

        return response()->json([
            'message' => "Batch {$batch->batch_number} submitted for approval.",
            'data'    => new PaymentBatchResource($batch->fresh()),
        ]);
    }

    public function approve(Request $request, PaymentBatch $batch): JsonResponse
    {
        try {
            $batch = $this->batchService->approveBatch($batch);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Batch {$batch->batch_number} approved. {$batch->claim_count} claims marked paid.",
            'data'    => new PaymentBatchResource($batch),
        ]);
    }

    public function exportBankFile(PaymentBatch $batch): JsonResponse
    {
        $path = $this->batchService->generateBankExport($batch);
        
        $disk = config('hmo.storage_disk', 'local');
        $downloadUrl = null;
        
        if (in_array($disk, ['public', 'local'])) {
            $downloadUrl = asset('storage/' . $path);
        } else {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $storage */
            $storage = Storage::disk($disk);
            $downloadUrl = $storage->url($path);
        }
    
        return response()->json([
            'message'      => 'Bank export file generated.',
            'download_url' => $downloadUrl,
            'filename'     => basename($path),
        ]);
    }
}