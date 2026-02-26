<?php
/**
 * FILE: app/Services/ClaimImportService.php
 *
 * Core import engine. Handles:
 *  1. parse()      — reads xlsx/csv into raw rows array
 *  2. autoMap()    — fuzzy-matches source column headers to system fields
 *  3. applyMap()   — transforms raw rows using confirmed mapping
 *  4. validate()   — validates each row (enrollee lookup, dupe check, plan limits)
 *  5. pushToQueue()— inserts approved rows into the claims table as 'pending'
 */
namespace App\Services;

use App\Models\ClaimImportBatch;
use App\Models\ClaimImportRow;
use App\Models\Claim;
use App\Models\Enrollee;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use League\Csv\Reader;

class ClaimImportService
{
    // ── System fields every import must map to ────────────────────────────────
    // required=true fields must be mapped before validation can proceed
    const SYSTEM_FIELDS = [
        ['key' => 'enrollee_id_raw',        'label' => 'Enrollee ID / Member No.',  'required' => true],
        ['key' => 'enrollee_name_raw',       'label' => 'Patient Name',              'required' => false],
        ['key' => 'service_date',            'label' => 'Service / Visit Date',      'required' => true],
        ['key' => 'service_type',            'label' => 'Service Type / Diagnosis',  'required' => false],
        ['key' => 'diagnosis_code',          'label' => 'Diagnosis Code (ICD)',      'required' => false],
        ['key' => 'diagnosis_description',   'label' => 'Diagnosis Description',     'required' => false],
        ['key' => 'amount_submitted',        'label' => 'Amount Submitted (₦)',      'required' => true],
        ['key' => 'discharge_date',          'label' => 'Discharge Date',            'required' => false],
        ['key' => 'hcp_invoice_ref',         'label' => "HCP's Invoice / Ref No.",  'required' => false],
        ['key' => 'notes',                   'label' => 'Notes / Remarks',           'required' => false],
    ];

    // Synonyms used for auto-mapping (fuzzy match against these)
    const FIELD_SYNONYMS = [
        'enrollee_id_raw'      => ['member','enrollee','patient id','hmo id','hmo no','member no','id no','enrollee number','member number','patient number','card no','card number'],
        'enrollee_name_raw'    => ['name','patient name','member name','enrollee name','full name','patient'],
        'service_date'         => ['date','visit date','service date','encounter date','treatment date','date of service','date of visit'],
        'service_type'         => ['service','service type','type','category','encounter type','visit type','procedure'],
        'diagnosis_code'       => ['icd','diagnosis code','icd code','icd10','dx code'],
        'diagnosis_description'=> ['diagnosis','diagnosis description','condition','presenting complaint','complaint'],
        'amount_submitted'     => ['amount','cost','total','charge','fee','amount charged','bill','amount billed','total amount','naira','ngn'],
        'discharge_date'       => ['discharge','discharge date','date discharged','out date'],
        'hcp_invoice_ref'      => ['invoice','invoice no','invoice number','ref','reference','hcp ref','provider ref','bill no'],
        'notes'                => ['note','notes','remark','remarks','comment','comments'],
    ];

    // ── 1. Parse uploaded file → array of [header => value] rows ─────────────
    public function parse(UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension());

        if ($ext === 'csv') {
            return $this->parseCsv($file->getRealPath());
        }
        return $this->parseXlsx($file->getRealPath());
    }

    private function parseXlsx(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet       = $spreadsheet->getActiveSheet();
        $rows        = $sheet->toArray(null, true, true, false);

        if (empty($rows)) return [];

        $headers = array_map(fn($h) => trim((string) $h), array_shift($rows));
        $result  = [];

        foreach ($rows as $row) {
            // Skip entirely empty rows
            if (empty(array_filter($row, fn($v) => $v !== null && $v !== ''))) continue;
            $result[] = array_combine($headers, array_map(fn($v) => $v ?? '', $row));
        }
        return $result;
    }

    private function parseCsv(string $path): array
    {
        $csv     = Reader::createFromPath($path, 'r');
        $csv->setHeaderOffset(0);
        return iterator_to_array($csv->getRecords(), false);
    }

    // ── 2. Auto-map source headers → system fields ────────────────────────────
    // Returns: [ 'Their Column Name' => 'system_field_key' | null ]
    public function autoMap(array $sourceHeaders): array
    {
        $mapping = [];
        foreach ($sourceHeaders as $header) {
            $mapping[$header] = $this->bestMatch($header);
        }
        return $mapping;
    }

    private function bestMatch(string $header): ?string
    {
        $normalised = strtolower(trim(preg_replace('/[^a-z0-9 ]/i', ' ', $header)));

        foreach (self::FIELD_SYNONYMS as $fieldKey => $synonyms) {
            foreach ($synonyms as $synonym) {
                if ($normalised === $synonym) return $fieldKey;
            }
        }
        // Partial match — source header contains a synonym
        foreach (self::FIELD_SYNONYMS as $fieldKey => $synonyms) {
            foreach ($synonyms as $synonym) {
                if (str_contains($normalised, $synonym) || str_contains($synonym, $normalised)) {
                    return $fieldKey;
                }
            }
        }
        // Levenshtein fallback for close spellings
        foreach (self::FIELD_SYNONYMS as $fieldKey => $synonyms) {
            foreach ($synonyms as $synonym) {
                if (levenshtein($normalised, $synonym) <= 2) return $fieldKey;
            }
        }
        return null;
    }

    // ── 3. Apply confirmed mapping → transform raw rows ───────────────────────
    public function applyMap(array $rawRows, array $mapping): array
    {
        // Invert: system_field => source_column
        $inverted = array_filter(array_flip($mapping));

        return array_map(function ($row, $idx) use ($inverted) {
            $mapped = ['row_number' => $idx + 2, 'raw_data' => $row]; // +2: 1-indexed + header
            foreach ($inverted as $fieldKey => $sourceCol) {
                $mapped[$fieldKey] = isset($row[$sourceCol]) ? trim((string) $row[$sourceCol]) : null;
            }
            return $mapped;
        }, $rawRows, array_keys($rawRows));
    }

    // ── 4. Validate mapped rows ───────────────────────────────────────────────
    public function validateRows(ClaimImportBatch $batch): void
    {
        $rows = $batch->rows()->where('status', 'pending')->get();

        foreach ($rows as $row) {
            $errors = [];
            $resolvedEnrolleeId = null;

            // --- Enrollee lookup ---
            if (empty($row->enrollee_id_raw)) {
                $errors[] = ['field' => 'enrollee_id_raw', 'message' => 'Enrollee ID is required'];
            } else {
                $enrollee = Enrollee::where('enrollee_id', $row->enrollee_id_raw)
                    ->orWhere('hmo_number', $row->enrollee_id_raw)
                    ->first();

                if (!$enrollee) {
                    $errors[] = ['field' => 'enrollee_id_raw', 'message' => "Enrollee '{$row->enrollee_id_raw}' not found in system"];
                } elseif ($enrollee->corporate_id && $enrollee->corporate_id !== $batch->hcp->id) {
                    // cross-HCP check optional — skip if not applicable
                } else {
                    $resolvedEnrolleeId = $enrollee->id;

                    // Plan status check
                    if ($enrollee->is_expired) {
                        $errors[] = ['field' => 'enrollee_id_raw', 'message' => "Enrollee's plan expired on {$enrollee->expiry_date?->format('d M Y')}"];
                    }

                    // Benefit limit check
                    if ($row->amount_submitted && $enrollee->plan) {
                        $remaining = $enrollee->remainingBenefit();
                        if ($row->amount_submitted > $remaining) {
                            $errors[] = ['field' => 'amount_submitted', 'message' => "Amount ₦" . number_format($row->amount_submitted, 2) . " exceeds remaining benefit ₦" . number_format($remaining, 2)];
                        }
                    }
                }
            }

            // --- Service date ---
            if (empty($row->service_date)) {
                $errors[] = ['field' => 'service_date', 'message' => 'Service date is required'];
            } elseif ($row->service_date > now()->toDateString()) {
                $errors[] = ['field' => 'service_date', 'message' => 'Service date cannot be in the future'];
            }

            // --- Amount ---
            if (empty($row->amount_submitted) || $row->amount_submitted <= 0) {
                $errors[] = ['field' => 'amount_submitted', 'message' => 'Amount must be greater than zero'];
            }

            // --- Duplicate check ---
            $isDuplicate = false;
            if ($resolvedEnrolleeId && $row->service_date && $row->amount_submitted) {
                $isDuplicate = Claim::where('enrollee_id', $resolvedEnrolleeId)
                    ->whereDate('service_date', $row->service_date)
                    ->where('amount_claimed', $row->amount_submitted)
                    ->exists();

                if (!$isDuplicate && $row->hcp_invoice_ref) {
                    $isDuplicate = Claim::where('hcp_invoice_ref', $row->hcp_invoice_ref)->exists();
                }
            }

            $status = $isDuplicate ? 'duplicate' : (empty($errors) ? 'valid' : 'error');

            $row->update([
                'enrollee_id'       => $resolvedEnrolleeId,
                'status'            => $status,
                'validation_errors' => empty($errors) ? null : $errors,
            ]);
        }

        $batch->update(['status' => 'validated']);
        $batch->recalcCounts();
    }

    // ── 5. Push approved rows → claims table ──────────────────────────────────
    public function pushToQueue(ClaimImportBatch $batch, ?string $notes = null): int
    {
        $approvedRows = $batch->rows()->where('status', 'approved')->get();
        $pushed       = 0;

        DB::transaction(function () use ($batch, $approvedRows, &$pushed) {
            foreach ($approvedRows as $row) {
                $claim = Claim::create([
                    'hcp_id'               => $batch->hcp_id,
                    'enrollee_id'          => $row->enrollee_id,
                    'service_date'         => $row->service_date,
                    'discharge_date'       => $row->discharge_date,
                    'diagnosis_code'       => $row->diagnosis_code,
                    'diagnosis_description'=> $row->diagnosis_description,
                    'service_type'         => $row->service_type,
                    'amount_claimed'       => $row->amount_submitted,
                    'hcp_invoice_ref'      => $row->hcp_invoice_ref,
                    'notes'                => $row->notes,
                    'status'               => 'pending',
                    'source'               => 'bulk_import',
                    'import_batch_id'      => $batch->id,
                ]);

                $row->update(['status' => 'pushed', 'claim_id' => $claim->id]);
                $pushed++;
            }

            // Auto-approve rows that had staff override
            $batch->rows()->where('status', 'approved')->where('staff_override', true)->each(function ($row) {
                $row->claim?->update(['notes' => trim(($row->claim->notes ?? '') . ' [Staff override on import: ' . $row->override_reason . ']')]);
            });

            $batch->update([
                'status'      => 'pushed',
                'reviewed_at' => now(),
                'pushed_rows' => $pushed,
            ]);
            $batch->recalcCounts();
        });

        return $pushed;
    }

    // ── Store uploaded file ───────────────────────────────────────────────────
    public function storeFile(UploadedFile $file, string $batchNumber): string
    {
        $filename = $batchNumber . '.' . $file->getClientOriginalExtension();
        return $file->storeAs('claim-imports/' . now()->format('Y/m'), $filename, 'local');
    }
}