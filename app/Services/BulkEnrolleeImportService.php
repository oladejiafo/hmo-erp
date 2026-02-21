<?php

namespace App\Services;

use App\Models\Corporate;
use App\Models\Enrollee;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\HeadingRowImport;

class BulkEnrolleeImportService
{
    protected array $requiredHeaders = [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'staff_id',
    ];

    /**
     * Import enrollees from CSV/Excel for a given corporate.
     * Returns a summary of what happened.
     */
    public function import(UploadedFile $file, Corporate $corporate): array
    {
        $rows = $this->readFile($file);

        $result = [
            'total'        => count($rows),
            'imported'     => 0,
            'skipped'      => 0,
            'errors'       => 0,
            'error_details' => [],
        ];

        // Get the active plan for this corporate (first active plan)
        $plan = $corporate->activePlans()->first();

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // +2 because row 1 is headers

            $row = array_map('trim', $row);

            $validation = $this->validateRow($row, $rowNumber);

            if ($validation->fails()) {
                $result['errors']++;
                $result['skipped']++;
                $result['error_details'][] = [
                    'row'    => $rowNumber,
                    'data'   => $row,
                    'errors' => $validation->errors()->all(),
                ];
                continue;
            }

            // Check duplicate by staff_id within this corporate
            if (! empty($row['staff_id'])) {
                $exists = Enrollee::withoutGlobalScopes()
                    ->where('corporate_id', $corporate->id)
                    ->where('staff_id', $row['staff_id'])
                    ->exists();

                if ($exists) {
                    $result['skipped']++;
                    $result['error_details'][] = [
                        'row'    => $rowNumber,
                        'data'   => $row,
                        'errors' => ["Staff ID [{$row['staff_id']}] already enrolled for this corporate."],
                    ];
                    continue;
                }
            }

            try {
                DB::transaction(function () use ($row, $corporate, $plan) {
                    $enrolleeId = Enrollee::generateUniqueId(
                        config('hmo.enrollee_id_prefix', 'HMO'),
                        'enrollee_id',
                        6
                    );

                    Enrollee::create([
                        'branch_id'          => $corporate->branch_id,
                        'corporate_id'       => $corporate->id,
                        'plan_id'            => $plan?->id,
                        'enrollee_id'        => $enrolleeId,
                        'first_name'         => $row['first_name'],
                        'last_name'          => $row['last_name'],
                        'middle_name'        => $row['middle_name'] ?? null,
                        'date_of_birth'      => $row['date_of_birth'],
                        'gender'             => strtoupper(substr($row['gender'], 0, 1)), // M or F
                        'phone'              => $row['phone'] ?? null,
                        'email'              => $row['email'] ?? null,
                        'staff_id'           => $row['staff_id'] ?? null,
                        'status'             => 'active',
                        'enrollment_date'    => now()->toDateString(),
                        'expiry_date'        => $corporate->contract_end_date?->toDateString() ?? now()->addYear()->toDateString(),
                        'benefit_balance'    => $plan?->max_benefit_value ?? 0,
                    ]);
                });

                $result['imported']++;

            } catch (\Throwable $e) {
                $result['errors']++;
                $result['skipped']++;
                $result['error_details'][] = [
                    'row'    => $rowNumber,
                    'data'   => $row,
                    'errors' => ['System error: ' . $e->getMessage()],
                ];
            }
        }

        return $result;
    }

    protected function readFile(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'csv') {
            $rows = [];
            $handle = fopen($file->getRealPath(), 'r');
            $headers = fgetcsv($handle); // Read header row
            $headers = array_map(fn ($h) => strtolower(str_replace(' ', '_', trim($h))), $headers);

            while (($data = fgetcsv($handle)) !== false) {
                if (count($data) === count($headers)) {
                    $rows[] = array_combine($headers, $data);
                }
            }
            fclose($handle);
            return $rows;
        }

        // Excel: use Maatwebsite
        $rawRows = Excel::toArray(new HeadingRowImport(), $file)[0] ?? [];
        // HeadingRowImport normalizes headers to snake_case
        return $rawRows;
    }

    protected function validateRow(array $row, int $rowNumber): \Illuminate\Validation\Validator
    {
        return Validator::make($row, [
            'first_name'    => ['required', 'string', 'max:80'],
            'last_name'     => ['required', 'string', 'max:80'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'gender'        => ['required', 'string', 'in:M,F,m,f,Male,Female,male,female'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'email'         => ['nullable', 'email'],
            'staff_id'      => ['nullable', 'string', 'max:50'],
        ]);
    }
}