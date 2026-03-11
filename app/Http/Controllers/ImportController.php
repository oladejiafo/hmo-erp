<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use League\Csv\Reader;
use League\Csv\Writer;
use App\Models\Enrollee;
use App\Models\HealthCareProvider;
use App\Models\Tariff;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Auth;

class ImportController extends Controller
{
    public function downloadTemplate(string $type): StreamedResponse
    {
        $headers = match($type) {
            'enrollees' => ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'corporate_code', 'plan_code'],
            'tariffs' => ['hcp_code', 'service_code', 'service_name', 'price', 'effective_from', 'effective_to'],
            'hcps' => ['name', 'code', 'type', 'tier', 'state', 'city', 'address', 'phone', 'email'],
            default => abort(404, 'Invalid template type'),
        };

        $callback = function() use ($headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename={$type}_template.csv",
        ]);
    }

    public function enrollees(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt']);

        $csv = Reader::createFromPath($request->file('file')->path(), 'r');
        $csv->setHeaderOffset(0);
        
        $results = [
            'success' => [],
            'errors' => [],
        ];

        DB::beginTransaction();
        try {
            foreach ($csv->getRecords() as $rowIndex => $row) {
                $validator = Validator::make($row, [
                    'first_name' => 'required|string|max:100',
                    'last_name' => 'required|string|max:100',
                    'email' => 'required|email|unique:enrollees,email',
                    'phone' => 'required|string|max:20',
                    'date_of_birth' => 'required|date',
                    'gender' => 'required|in:Male,Female',
                    'corporate_code' => 'required|exists:corporates,code',
                    'plan_code' => 'required|exists:plans,code',
                ]);

                if ($validator->fails()) {
                    $results['errors'][] = [
                        'row' => $rowIndex + 2,
                        'data' => $row,
                        'errors' => $validator->errors()->all(),
                    ];
                    continue;
                }

                $corporate = \App\Models\Corporate::where('code', $row['corporate_code'])->first();
                $plan = \App\Models\Plan::where('code', $row['plan_code'])->first();

                $enrollee = Enrollee::create([
                    'first_name' => $row['first_name'],
                    'last_name' => $row['last_name'],
                    'email' => $row['email'],
                    'phone' => $row['phone'],
                    'date_of_birth' => $row['date_of_birth'],
                    'gender' => $row['gender'],
                    'corporate_id' => $corporate->id,
                    'plan_id' => $plan->id,
                    'branch_id' => Auth::user()->branch_id,
                    'status' => 'active',
                ]);

                $results['success'][] = [
                    'row' => $rowIndex + 2,
                    'id' => $enrollee->id,
                    'name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                ];
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }

        $status = empty($results['errors']) ? 200 : 207;
        return response()->json($results, $status);
    }

    public function tariffs(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt']);
        
        // Similar implementation for tariffs import
        return response()->json(['message' => 'Tariffs import endpoint - to be implemented'], 200);
    }

    public function hcps(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt']);
        
        // Similar implementation for HCPs import
        return response()->json(['message' => 'HCPs import endpoint - to be implemented'], 200);
    }
}