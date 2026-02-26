<?php
/**
 * FILE: app/Http/Controllers/Claims/ClaimImportController.php
 */
namespace App\Http\Controllers\Claims;

use App\Http\Controllers\Controller;
use App\Models\ClaimImportBatch;
use App\Models\ClaimImportRow;
use App\Services\ClaimImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ClaimImportController extends Controller
{
    public function __construct(private ClaimImportService $service) {}

    // Step 1: Upload file + get column headers back for mapping UI
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'         => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
            'hcp_id'       => ['required', 'exists:health_care_providers,id'],
            'claim_period' => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
        ]);

        $file = $request->file('file');
        $rawRows = $this->service->parse($file);

        if (empty($rawRows)) {
            return response()->json(['message' => 'File appears to be empty or unreadable.'], 422);
        }

        $sourceHeaders = array_keys($rawRows[0]);
        $autoMapping   = $this->service->autoMap($sourceHeaders);

        // Create a pending batch (no rows yet — committed on Step 3)
        $batchNumber = ClaimImportBatch::generateBatchNumber();
        $filePath    = $this->service->storeFile($file, $batchNumber);

        $batch = ClaimImportBatch::create([
            'hcp_id'            => $request->hcp_id,
            'uploaded_by'       => Auth::id(),
            'batch_number'      => $batchNumber,
            'original_filename' => $file->getClientOriginalName(),
            'file_path'         => $filePath,
            'file_type'         => strtolower($file->getClientOriginalExtension()),
            'claim_period'      => $request->claim_period,
            'column_mapping'    => $autoMapping,
            'total_rows'        => count($rawRows),
            'status'            => 'uploaded',
        ]);

        // Cache raw rows in session for Step 2/3 (avoids re-parsing)
        session(["import_rows_{$batch->id}" => $rawRows]);

        return response()->json([
            'batch_id'       => $batch->id,
            'batch_number'   => $batchNumber,
            'total_rows'     => count($rawRows),
            'source_headers' => $sourceHeaders,
            'auto_mapping'   => $autoMapping,   // { "Their Col" => "system_field" | null }
            'system_fields'  => ClaimImportService::SYSTEM_FIELDS,
            'preview_rows'   => array_slice($rawRows, 0, 5),  // first 5 rows for preview
        ]);
    }

    // Step 2: Confirm mapping + trigger validation
    public function confirmMapping(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $request->validate([
            'mapping' => ['required', 'array'],  // { "Their Col" => "system_field" | null }
        ]);

        // Verify at least the 3 required fields are mapped
        $mappedFields = array_filter($request->mapping);
        $required     = array_column(array_filter(ClaimImportService::SYSTEM_FIELDS, fn($f) => $f['required']), 'key');
        $missing      = array_diff($required, array_values($mappedFields));

        if (!empty($missing)) {
            $labels = array_column(array_filter(ClaimImportService::SYSTEM_FIELDS, fn($f) => in_array($f['key'], $missing)), 'label');
            return response()->json(['message' => 'Required fields not mapped: ' . implode(', ', $labels)], 422);
        }

        $rawRows = session("import_rows_{$batch->id}");
        if (!$rawRows) {
            return response()->json(['message' => 'Session expired. Please re-upload the file.'], 422);
        }

        // Apply mapping + insert staging rows
        $mappedRows = $this->service->applyMap($rawRows, $request->mapping);

        DB::transaction(function () use ($batch, $mappedRows, $request) {
            $batch->rows()->delete(); // clear any previous attempt
            foreach ($mappedRows as $row) {
                ClaimImportRow::create([
                    'import_batch_id'      => $batch->id,
                    'row_number'           => $row['row_number'],
                    'raw_data'             => $row['raw_data'],
                    'enrollee_id_raw'      => $row['enrollee_id_raw']      ?? null,
                    'enrollee_name_raw'    => $row['enrollee_name_raw']    ?? null,
                    'service_date'         => $this->parseDate($row['service_date'] ?? null),
                    'discharge_date'       => $this->parseDate($row['discharge_date'] ?? null),
                    'diagnosis_code'       => $row['diagnosis_code']        ?? null,
                    'diagnosis_description'=> $row['diagnosis_description'] ?? null,
                    'service_type'         => $row['service_type']          ?? null,
                    'amount_submitted'     => $this->parseAmount($row['amount_submitted'] ?? null),
                    'hcp_invoice_ref'      => $row['hcp_invoice_ref']       ?? null,
                    'notes'                => $row['notes']                 ?? null,
                    'status'               => 'pending',
                ]);
            }
            $batch->update([
                'column_mapping' => $request->mapping,
                'status'         => 'mapped',
            ]);
        });

        // Run validation (synchronous — fast enough for typical batch sizes)
        $this->service->validateRows($batch);
        $batch->refresh();

        return response()->json([
            'message'     => 'Mapping applied and rows validated.',
            'batch'       => $this->batchSummary($batch),
            'valid_rows'  => $batch->valid_rows,
            'error_rows'  => $batch->error_rows,
            'duplicate_rows' => $batch->duplicate_rows,
        ]);
    }

    // Step 3: Review — get paginated rows with their validation status
    public function rows(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        $rows = $batch->rows()
            ->with('enrollee:id,full_name,enrollee_id,status')
            ->when($request->status, fn($q,$s) => $q->where('status',$s))
            ->orderBy('row_number')
            ->paginate(50);

        return response()->json([
            'data' => $rows->items(),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page'    => $rows->lastPage(),
                'total'        => $rows->total(),
            ],
            'batch' => $this->batchSummary($batch),
        ]);
    }

    // Step 3 action: approve / skip a single row (or override an error)
    public function updateRow(Request $request, ClaimImportBatch $batch, ClaimImportRow $row): JsonResponse
    {
        $request->validate([
            'action'          => ['required', 'in:approve,skip'],
            'override_reason' => ['required_if:action,approve', 'nullable', 'string'],
        ]);

        if (!$row->isActionable()) {
            return response()->json(['message' => 'Row is not in an actionable state.'], 422);
        }

        $row->update([
            'status'          => $request->action === 'approve' ? 'approved' : 'skipped',
            'staff_override'  => $row->status === 'error' && $request->action === 'approve',
            'override_reason' => $request->override_reason,
        ]);

        $batch->recalcCounts();

        return response()->json(['message' => 'Row updated.', 'row' => $row->fresh()]);
    }

    // Bulk action: approve all valid rows at once
    public function bulkApproveValid(ClaimImportBatch $batch): JsonResponse
    {
        $updated = $batch->rows()->where('status', 'valid')->update(['status' => 'approved']);
        $batch->recalcCounts();
        return response()->json(['message' => "{$updated} rows approved.", 'batch' => $this->batchSummary($batch)]);
    }

    // Step 4: Push approved rows to claims queue
    public function push(Request $request, ClaimImportBatch $batch): JsonResponse
    {
        if (!in_array($batch->status, ['validated', 'reviewing'])) {
            return response()->json(['message' => 'Batch must be validated before pushing.'], 422);
        }
        if ($batch->approvedRows()->count() === 0) {
            return response()->json(['message' => 'No approved rows to push.'], 422);
        }

        $batch->update(['status' => 'reviewing']);
        $pushed = $this->service->pushToQueue($batch, $request->notes);

        return response()->json([
            'message'     => "{$pushed} claims pushed to the review queue.",
            'pushed_rows' => $pushed,
            'batch'       => $this->batchSummary($batch->fresh()),
        ]);
    }

    // List all import batches
    public function index(Request $request): JsonResponse
    {
        $batches = ClaimImportBatch::with('hcp:id,name,hcp_code', 'uploadedBy:id,name')
            ->when($request->hcp_id,  fn($q,$v) => $q->where('hcp_id',$v))
            ->when($request->status,  fn($q,$v) => $q->where('status',$v))
            ->when($request->period,  fn($q,$v) => $q->where('claim_period',$v))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $batches->items(),
            'meta' => ['current_page'=>$batches->currentPage(),'last_page'=>$batches->lastPage(),'total'=>$batches->total()],
        ]);
    }

    public function show(ClaimImportBatch $batch): JsonResponse
    {
        $batch->load('hcp:id,name,hcp_code','uploadedBy:id,name','reviewedBy:id,name');
        return response()->json(['data' => $batch->append(['batch_summary'])]);
    }

    private function batchSummary(ClaimImportBatch $batch): array
    {
        return [
            'id'=>$batch->id,'batch_number'=>$batch->batch_number,
            'status'=>$batch->status,'total_rows'=>$batch->total_rows,
            'valid_rows'=>$batch->valid_rows,'error_rows'=>$batch->error_rows,
            'duplicate_rows'=>$batch->duplicate_rows,'pushed_rows'=>$batch->pushed_rows,
            'total_amount_valid'=>$batch->total_amount_valid,
        ];
    }

    private function parseDate(?string $val): ?string
    {
        if (!$val) return null;
        foreach (['Y-m-d','d/m/Y','m/d/Y','d-m-Y','d M Y','j M Y'] as $fmt) {
            try { return \Carbon\Carbon::createFromFormat($fmt, trim($val))->format('Y-m-d'); } catch (\Exception) {}
        }
        // Excel serial number
        if (is_numeric($val)) {
            try { return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$val)->format('Y-m-d'); } catch (\Exception) {}
        }
        return null;
    }

    private function parseAmount(?string $val): ?float
    {
        if ($val === null || $val === '') return null;
        $cleaned = preg_replace('/[^0-9.]/', '', str_replace(',', '', $val));
        return is_numeric($cleaned) ? (float)$cleaned : null;
    }
}