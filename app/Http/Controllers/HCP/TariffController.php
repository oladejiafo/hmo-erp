<?php

namespace App\Http\Controllers\HCP;

use App\Http\Controllers\Controller;
use App\Http\Requests\HCP\StoreTariffRequest;
use App\Models\HcpTariff;
use App\Models\HealthCareProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class TariffController extends Controller
{
    public function index(Request $request, HealthCareProvider $hcp): JsonResponse
    {
        $tariffs = $hcp->tariffs()
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->when($request->search, fn ($q, $s) =>
                $q->where('service_name', 'like', "%{$s}%")
                  ->orWhere('service_code', 'like', "%{$s}%")
            )
            ->when($request->active_only, fn ($q) => $q->where('is_active', true))
            ->orderBy('category')
            ->orderBy('service_name')
            ->paginate($request->per_page ?? 50);

        return response()->json(['data' => $tariffs]);
    }

    public function store(StoreTariffRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        $tariff = $hcp->tariffs()->create(
            array_merge($request->validated(), ['uploaded_by' => Auth::id()])
        );

        return response()->json([
            'message' => 'Tariff added.',
            'data'    => $tariff,
        ], 201);
    }

    public function update(StoreTariffRequest $request, HealthCareProvider $hcp, HcpTariff $tariff): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('update', $hcp);

        $tariff->update($request->validated());

        return response()->json([
            'message' => 'Tariff updated.',
            'data'    => $tariff->fresh(),
        ]);
    }

    public function destroy(HealthCareProvider $hcp, HcpTariff $tariff): JsonResponse
    {
        // Soft-deactivate instead of hard delete — preserve claim item history
        $tariff->update(['is_active' => false]);

        return response()->json(['message' => 'Tariff deactivated.']);
    }

    /**
     * Bulk upload tariffs from CSV.
     * Expected columns: service_code, service_name, category, agreed_price, effective_from, effective_to
     */
    public function bulkUpload(Request $request, HealthCareProvider $hcp): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv', 'max:2048'],
        ]);

        $handle  = fopen($request->file('file')->getRealPath(), 'r');
        $headers = fgetcsv($handle);
        $headers = array_map(fn ($h) => strtolower(trim($h)), $headers);

        $created = 0;
        $updated = 0;
        $errors  = [];
        $row     = 1;

        DB::beginTransaction();

        try {
            while (($data = fgetcsv($handle)) !== false) {
                $row++;
                if (count($data) !== count($headers)) {
                    $errors[] = "Row {$row}: column count mismatch.";
                    continue;
                }

                $record = array_combine($headers, $data);

                if (empty($record['service_name']) || empty($record['agreed_price'])) {
                    $errors[] = "Row {$row}: service_name and agreed_price are required.";
                    continue;
                }

                $existing = HcpTariff::where('hcp_id', $hcp->id)
                    ->where('service_code', $record['service_code'] ?? '')
                    ->first();

                if ($existing) {
                    $existing->update([
                        'agreed_price'   => $record['agreed_price'],
                        'effective_from' => $record['effective_from'] ?? now()->toDateString(),
                        'effective_to'   => $record['effective_to'] ?? null,
                    ]);
                    $updated++;
                } else {
                    HcpTariff::create([
                        'hcp_id'         => $hcp->id,
                        'service_code'   => $record['service_code'] ?? null,
                        'service_name'   => $record['service_name'],
                        'category'       => $record['category'] ?? 'consultation',
                        'agreed_price'   => $record['agreed_price'],
                        'effective_from' => $record['effective_from'] ?? now()->toDateString(),
                        'effective_to'   => $record['effective_to'] ?? null,
                        'uploaded_by'    => Auth::id(),
                    ]);
                    $created++;
                }
            }

            fclose($handle);
            DB::commit();

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Bulk upload failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Tariff upload complete.',
            'summary' => ['created' => $created, 'updated' => $updated, 'errors' => count($errors)],
            'errors'  => $errors,
        ]);
    }
}