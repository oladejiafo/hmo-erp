<?php
/**
 * NEW FILE - app/Http/Controllers/Portal/ProviderClaimImportController.php
 *
 * Deliberately NOT a rewrite of ClaimImportController. It's a thin,
 * ownership-scoped wrapper around the same ClaimImportService your staff
 * bulk-upload wizard already uses - same parse/autoMap/applyMap/
 * validateRows/pushToQueue engine, same ClaimImportBatch/ClaimImportRow
 * models, same 4-step flow (upload → map → review rows → push).
 *
 * The only two differences from the staff version:
 * 1. hcp_id is forced to the authenticated provider's own HCP - never
 *    accepted from the request. A provider can only ever upload their own
 *    facility's batch, verified the same way storeClaim()/storePreAuth()
 *    already enforce it.
 * 2. Every subsequent step (rows, updateRow, bulkApproveValid, push, show)
 *    checks $batch->hcp_id against the provider's own hcp_id before acting
 *    - a provider can't act on another facility's import batch even if
 *    they somehow get its batch ID.
 *
 * `push()` sends approved rows to the same auto-validation/review queue
 * staff-imported claims go through - it does NOT approve or pay anything.
 * A provider bulk-uploading 200 claims still can't self-approve a single
 * one of them; they're just skipping manual one-by-one entry.
 */

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\ClaimImportBatch;
use App\Models\ClaimImportRow;
use App\Services\ClaimImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProviderClaimImportController extends Controller
{
    public function __construct(private ClaimImportService $service) {}

    private function ownHcpOrFail(Request $request): ?int
    {
        return $request->user()->hcp?->id;
    }

    private function assertOwnsBatch(ClaimImportBatch $batch, int $hcpId): ?JsonResponse
    {
        if ($batch->hcp_id !== $hcpId) {
            return response()->json(['message' => 'Import batch not found'], 404);
        }
        return null;
    }

    // Step 1: Upload file + get column headers back for mapping UI
    public function upload(Request $request): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if (!$hcpId) {
            return response()->json(['message' => 'No provider record linked to this account'], 404);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
            'claim_period' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
        ]);

        $file = $request->file('file');
        $rawRows = $this->service->parse($file);

        if (empty($rawRows)) {
            return response()->json(['message' => 'File appears to be empty or unreadable.'], 422);
        }

        $sourceHeaders = array_keys($rawRows[0]);
        $autoMapping = $this->service->autoMap($sourceHeaders);

        $batchNumber = ClaimImportBatch::generateBatchNumber();
        $filePath = $this->service->storeFile($file, $batchNumber);

        $batch = ClaimImportBatch::create([
            'hcp_id' => $hcpId, // forced, never from input
            'uploaded_by' => Auth::id(),
            'batch_number' => $batchNumber,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_type' => strtolower($file->getClientOriginalExtension()),
            'claim_period' => $request->claim_period,
            'column_mapping' => $autoMapping,
            'total_rows' => count($rawRows),
            'status' => 'uploaded',
        ]);

        session(["import_rows_{$batch->id}" => $rawRows]);

        return response()->json([
            'batch_id' => $batch->id,
            'batch_number' => $batchNumber,
            'total_rows' => count($rawRows),
            'source_headers' => $sourceHeaders,
            'auto_mapping' => $autoMapping,
            'system_fields' => ClaimImportService::SYSTEM_FIELDS,
            'preview_rows' => array_slice($rawRows, 0, 5),
        ]);
    }

    // Step 2: Confirm mapping + trigger validation
    public function confirmMapping(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if ($fail = $this->assertOwnsBatch($batch, $hcpId)) return $fail;

        $request->validate(['mapping' => ['required', 'array']]);

        $mappedFields = array_filter($request->mapping);
        $required = array_column(array_filter(ClaimImportService::SYSTEM_FIELDS, fn($f) => $f['required']), 'key');
        $missing = array_diff($required, array_values($mappedFields));

        if (!empty($missing)) {
            $labels = array_column(array_filter(ClaimImportService::SYSTEM_FIELDS, fn($f) => in_array($f['key'], $missing)), 'label');
            return response()->json(['message' => 'Required fields not mapped: ' . implode(', ', $labels)], 422);
        }

        $rawRows = session("import_rows_{$batch->id}");
        if (!$rawRows) {
            return response()->json(['message' => 'Session expired. Please re-upload the file.'], 422);
        }

        $mappedRows = $this->service->applyMap($rawRows, $request->mapping);

        DB::transaction(function () use ($batch, $mappedRows, $request) {
            $batch->rows()->delete();
            foreach ($mappedRows as $row) {
                ClaimImportRow::create([
                    'import_batch_id' => $batch->id,
                    'row_number' => $row['row_number'],
                    'raw_data' => $row['raw_data'],
                    'enrollee_id_raw' => $row['enrollee_id_raw'] ?? null,
                    'enrollee_name_raw' => $row['enrollee_name_raw'] ?? null,
                    'service_date' => $row['service_date'] ?? null,
                    'discharge_date' => $row['discharge_date'] ?? null,
                    'diagnosis_code' => $row['diagnosis_code'] ?? null,
                    'diagnosis_description' => $row['diagnosis_description'] ?? null,
                    'service_type' => $row['service_type'] ?? null,
                    'amount_submitted' => $row['amount_submitted'] ?? null,
                    'hcp_invoice_ref' => $row['hcp_invoice_ref'] ?? null,
                    'notes' => $row['notes'] ?? null,
                    'status' => 'pending',
                ]);
            }
            $batch->update(['column_mapping' => $request->mapping, 'status' => 'mapped']);
        });

        $this->service->validateRows($batch);
        $batch->refresh();

        return response()->json([
            'message' => 'Mapping applied and rows validated.',
            'batch' => $this->batchSummary($batch),
            'valid_rows' => $batch->valid_rows,
            'error_rows' => $batch->error_rows,
            'duplicate_rows' => $batch->duplicate_rows,
        ]);
    }

    // Step 3: Review rows
    public function rows(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if ($fail = $this->assertOwnsBatch($batch, $hcpId)) return $fail;

        $rows = $batch->rows()
            ->with('enrollee:id,full_name,enrollee_id,status')
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy('row_number')
            ->paginate(50);

        return response()->json([
            'data' => $rows->items(),
            'meta' => ['current_page' => $rows->currentPage(), 'last_page' => $rows->lastPage(), 'total' => $rows->total()],
            'batch' => $this->batchSummary($batch),
        ]);
    }

    public function updateRow(Request $request, ClaimImportBatch $batch, ClaimImportRow $row): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if ($fail = $this->assertOwnsBatch($batch, $hcpId)) return $fail;

        $request->validate([
            'action' => ['required', 'in:approve,skip'],
        ]);

        if (!$row->isActionable()) {
            return response()->json(['message' => 'Row is not in an actionable state.'], 422);
        }

        $row->update(['status' => $request->action === 'approve' ? 'approved' : 'skipped']);
        $batch->recalcCounts();

        return response()->json(['message' => 'Row updated.', 'row' => $row->fresh()]);
    }

    public function bulkApproveValid(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if ($fail = $this->assertOwnsBatch($batch, $hcpId)) return $fail;

        $updated = $batch->rows()->where('status', 'valid')->update(['status' => 'approved']);
        $batch->recalcCounts();

        return response()->json(['message' => "{$updated} rows approved.", 'batch' => $this->batchSummary($batch)]);
    }

    // Step 4: Push to review queue - NOT the same as approving/paying claims
    public function push(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if ($fail = $this->assertOwnsBatch($batch, $hcpId)) return $fail;

        if (!in_array($batch->status, ['validated', 'reviewing'])) {
            return response()->json(['message' => 'Batch must be validated before pushing.'], 422);
        }
        if ($batch->approvedRows()->count() === 0) {
            return response()->json(['message' => 'No approved rows to push.'], 422);
        }

        $batch->update(['status' => 'reviewing']);
        $pushed = $this->service->pushToQueue($batch, $request->notes);

        return response()->json([
            'message' => "{$pushed} claims submitted for review.",
            'pushed_rows' => $pushed,
            'batch' => $this->batchSummary($batch->fresh()),
        ]);
    }

    // List own import batches
    public function index(Request $request): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if (!$hcpId) {
            return response()->json(['data' => []], 200);
        }

        $batches = ClaimImportBatch::where('hcp_id', $hcpId)
            ->with('uploadedBy:id,name')
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => collect($batches->items())->map(fn($b) => $this->batchSummary($b)),
            'meta' => ['current_page' => $batches->currentPage(), 'last_page' => $batches->lastPage(), 'total' => $batches->total()],
        ]);
    }

    public function show(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $hcpId = $this->ownHcpOrFail($request);
        if ($fail = $this->assertOwnsBatch($batch, $hcpId)) return $fail;

        return response()->json(['data' => $this->batchSummary($batch)]);
    }

    private function batchSummary(ClaimImportBatch $batch): array
    {
        return [
            'id' => $batch->id, 'batch_number' => $batch->batch_number,
            'status' => $batch->status, 'total_rows' => $batch->total_rows,
            'valid_rows' => $batch->valid_rows, 'error_rows' => $batch->error_rows,
            'duplicate_rows' => $batch->duplicate_rows, 'pushed_rows' => $batch->pushed_rows,
            'total_amount_valid' => $batch->total_amount_valid,
            'claim_period' => $batch->claim_period,
            'created_at' => $batch->created_at?->format('Y-m-d H:i'),
        ];
    }
}
