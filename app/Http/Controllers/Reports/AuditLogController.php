<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\AuditLogRequest;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;

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
        /** @disregard P1013 */
        $this->authorize('reports.audit_logs');
        
        $query = AuditLog::with(['user', 'branch'])
            ->when($request->user_id, fn($q, $id) => $q->where('user_id', $id))
            ->when($request->branch_id, fn($q, $id) => $q->where('branch_id', $id))
            ->when($request->action, fn($q, $a) => $q->where('action', $a))
            ->when($request->model_type, fn($q, $t) => $q->where('model_type', $t))
            ->when($request->model_id, fn($q, $id) => $q->where('model_id', $id))
            ->when($request->date_from, fn($q, $d) => $q->where('created_at', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('created_at', '<=', $d))
            ->when($request->search, function($q, $s) {
                $q->where(function($q) use ($s) {
                    $q->where('description', 'like', "%{$s}%")
                      ->orWhere('old_values', 'like', "%{$s}%")
                      ->orWhere('new_values', 'like', "%{$s}%");
                });
            });

        // Branch isolation for non-HQ users
        /** @disregard P1013 */
        if (!auth()->user()->isHQ()) {
            /** @disregard P1013 */
            $query->where('branch_id', auth()->user()->branch_id);
        }

        $logs = $query->orderByDesc('created_at')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'data' => AuditLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'filters' => [
                    'actions' => AuditLog::distinct('action')->pluck('action'),
                    'model_types' => AuditLog::distinct('model_type')->pluck('model_type'),
                ],
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