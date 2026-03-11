<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\AuditLogRequest;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class AuditLogController extends Controller
{
    /**
     * Get audit logs with filtering
     * 
     * @param AuditLogRequest $request
     * @return JsonResponse
     */
    public function index(AuditLogRequest $request): JsonResponse
    {
        $this->authorize('reports.audit_logs');
    
        $query = AuditLog::with(['user', 'user.branch'])
            ->when($request->user_id,    fn($q, $id) => $q->where('user_id', $id))
            ->when($request->action,     fn($q, $a) => $q->where('action', $a))
            ->when($request->model_type, fn($q, $t) => $q->where('model_type', 'like', "%{$t}%"))
            ->when($request->model_id,   fn($q, $id) => $q->where('model_id', $id))
            // ->when($request->model_id,   fn($q, $id) => $q->where('auditable_id', $id)) // model_id → auditable_id
            ->when($request->date_from,  fn($q, $d)  => $q->where('created_at', '>=', $d))
            ->when($request->date_to,    fn($q, $d)  => $q->where('created_at', '<=', $d))
            ->when($request->search,     fn($q, $s)  => $q->where(function($q) use ($s) {
                $q->whereJsonContains('old_values', $s)
                  ->orWhereJsonContains('new_values', $s)
                  ->orWhere('model_type', 'like', "%{$s}%");
            }));
    
            // Friendly model name map
            $modelLabels = [
                'HealthCareProvider' => 'HCP',
                'Enrollee'           => 'Enrollee',
                'Claim'              => 'Claim',
                'Corporate'          => 'Corporate',
                'User'               => 'User',
                'PaymentBatch'       => 'Payment Batch',
                'PreAuthorisation'   => 'Pre-Auth',
                'Branch'             => 'Branch',
                'HcpContract'        => 'HCP Contract',
                'HcpTariff'          => 'HCP Tariff',
                'Dependent'          => 'Dependent',
            ];

            $logs = $query->orderByDesc('created_at')->paginate($request->per_page ?? 50);

            return response()->json([
                'data' => $logs->map(function($log) use ($modelLabels) {

                    $modelBase = class_basename(str_replace('\\\\', '\\', $log->model_type ?? ''));
                    $modelLabel = $modelLabels[$modelBase] ?? $modelBase;
                    // Build a readable diff from old/new values
                    $oldVals = is_array($log->old_values) ? $log->old_values : json_decode($log->old_values ?? '{}', true);
                    $newVals = is_array($log->new_values) ? $log->new_values : json_decode($log->new_values ?? '{}', true);

                    $skip = ['updated_at', 'created_at', 'password', 'remember_token'];
                    $changes = [];
                    foreach ($newVals ?? [] as $key => $newVal) {
                        if (in_array($key, $skip)) continue;
                        $oldVal = $oldVals[$key] ?? null;
                        if ($oldVal !== $newVal) {
                            $changes[] = "{$key}: " . json_encode($oldVal) . " → " . json_encode($newVal);
                        }
                    }

                    $description = count($changes)
                        ? implode('; ', array_slice($changes, 0, 3)) . (count($changes) > 3 ? ' …' : '')
                        : ($log->action . ' ' . $modelLabel);

                    return [
                        'id'           => $log->id,
                        'created_at'   => $log->created_at?->toIso8601String(),
                        'user'         => ['name' => $log->user?->name ?? 'System'],
                        'branch'       => ['name' => $log->user?->branch?->name ?? 'HQ'],
                        'action'       => $log->action,
                        'action_label' => ucfirst($log->action),
                        'model_name'   => $modelLabel,
                        // 'model_name'   => $modelLabel ?: $log->model_type,
                        'model_id'     => $log->model_id,
                        'description'  => $description,
                        'ip_address'   => $log->ip_address,
                    ];
                }),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'last_page'    => $logs->lastPage(),
                    'per_page'     => $logs->perPage(),
                    'total'        => $logs->total(),
                ],
            ]);
    }

    /**
     * Get a single audit log entry
     * 
     * @param AuditLog $auditLog
     * @return JsonResponse
     */
    public function show(AuditLog $auditLog): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('reports.audit_logs');
        
        // Check branch access
        /** @disregard P1013 */
        if (!auth()->user()->isHQ() && $auditLog->branch_id !== auth()->user()->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => new AuditLogResource($auditLog->load(['user', 'branch'])),
        ]);
    }

    /**
     * Export audit logs (CSV)
     * 
     * @param AuditLogRequest $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function export(AuditLogRequest $request)
    {
        /** @disregard P1013 */
        $this->authorize('reports.export');
        
        $query = AuditLog::with(['user', 'branch']);
        
        // Apply same filters as index
        // ... filter logic ...

        $logs = $query->orderByDesc('created_at')->get();
        
        $filename = 'audit-logs-' . now()->format('Y-m-d-His') . '.csv';
        $path = storage_path("app/temp/{$filename}");
        
        $handle = fopen($path, 'w');
        fputcsv($handle, ['Date/Time', 'User', 'Branch', 'Action', 'Model', 'Model ID', 'Description', 'IP Address']);
        
        foreach ($logs as $log) {
            fputcsv($handle, [
                $log->created_at?->toDateTimeString(),
                $log->user?->name ?? 'System',
                $log->branch?->name ?? 'N/A',
                $log->action,
                class_basename($log->model_type),
                $log->model_id,
                $log->description,
                $log->ip_address,
            ]);
        }
        
        fclose($handle);
        
        return response()->download($path, $filename)->deleteFileAfterSend();
    }
}