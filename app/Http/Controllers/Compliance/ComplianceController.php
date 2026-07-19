<?php

namespace App\Http\Controllers\Compliance;

use App\Http\Controllers\Controller;
use App\Models\ComplianceDocument;
use App\Models\ComplianceFiling;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * FILE LOCATION: app/Http/Controllers/Compliance/ComplianceController.php
 *
 * ROUTES (add to routes/api.php):
 *
 *   Route::middleware('permission:compliance.view')->prefix('compliance')->group(function () {
 *       Route::get('filings',                          [ComplianceController::class, 'index']);
 *       Route::get('filings/summary',                  [ComplianceController::class, 'summary']);
 *       Route::get('filings/{filing}',                 [ComplianceController::class, 'show']);
 *       Route::post('filings',                         [ComplianceController::class, 'store'])
 *            ->middleware('permission:compliance.manage');
 *       Route::put('filings/{filing}',                 [ComplianceController::class, 'update'])
 *            ->middleware('permission:compliance.manage');
 *       Route::post('filings/{filing}/complete',       [ComplianceController::class, 'complete'])
 *            ->middleware('permission:compliance.manage');
 *       Route::post('filings/{filing}/documents',      [ComplianceController::class, 'uploadDocument'])
 *            ->middleware('permission:compliance.manage');
 *       Route::delete('filings/{filing}/documents/{doc}', [ComplianceController::class, 'deleteDocument'])
 *            ->middleware('permission:compliance.manage');
 *   });
 */
class ComplianceController extends Controller
{
    public function __construct(protected NotificationService $notifications) {}

    // ── INDEX ─────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $branchId = auth()->user()->branch_id;

        $filings = ComplianceFiling::where('branch_id', $branchId)
            ->with(['assignedTo:id,name', 'documents'])
            ->when($request->status,   fn ($q, $s) => $q->where('status', $s))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->when($request->year,     fn ($q, $y) => $q->whereYear('due_date', $y))
            ->when($request->month,    fn ($q, $m) => $q->whereMonth('due_date', $m))
            ->when($request->upcoming_days, fn ($q, $d) => $q->upcoming((int) $d))
            ->orderBy('due_date')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'data' => $filings->map(fn ($f) => $this->format($f)),
            'meta' => [
                'current_page' => $filings->currentPage(),
                'last_page'    => $filings->lastPage(),
                'total'        => $filings->total(),
            ],
        ]);
    }

    // ── SUMMARY - calendar KPI cards ─────────────────────────────────────────

    public function summary(): JsonResponse
    {
        /** @disregard P1013 */
        $branchId = auth()->user()->branch_id;

        $base = ComplianceFiling::where('branch_id', $branchId);

        $overdue       = (clone $base)->overdue()->count();
        $dueThisMonth  = (clone $base)->dueThisMonth()
                                      ->whereNotIn('status', ['completed', 'waived'])->count();
        $dueNext7      = (clone $base)->upcoming(7)->count();
        $completedMonth= (clone $base)->where('status', 'completed')
                                      ->whereMonth('completed_date', now()->month)->count();
        $totalOpen     = (clone $base)->whereNotIn('status', ['completed', 'waived'])->count();

        // Calendar data for the next 3 months - one entry per filing
        $calendarItems = (clone $base)
            ->whereNotIn('status', ['completed', 'waived'])
            ->where('due_date', '>=', now()->startOfMonth())
            ->where('due_date', '<=', now()->addMonths(3)->endOfMonth())
            ->orderBy('due_date')
            ->get(['id', 'title', 'category', 'due_date', 'priority', 'status'])
            ->map(fn ($f) => [
                'id'       => $f->id,
                'title'    => $f->title,
                'category' => $f->category,
                'due_date' => $f->due_date->toDateString(),
                'priority' => $f->priority,
                'status'   => $f->status,
            ]);

        return response()->json([
            'data' => [
                'overdue'           => $overdue,
                'due_this_month'    => $dueThisMonth,
                'due_next_7_days'   => $dueNext7,
                'completed_month'   => $completedMonth,
                'total_open'        => $totalOpen,
                'calendar_items'    => $calendarItems,
            ],
        ]);
    }

    // ── SHOW ──────────────────────────────────────────────────────────────────

    public function show(ComplianceFiling $filing): JsonResponse
    {
        $this->authorizeFiling($filing);

        $filing->load(['assignedTo:id,name', 'createdBy:id,name',
                       'completedBy:id,name', 'documents.uploadedBy:id,name']);

        return response()->json(['data' => $this->format($filing, detailed: true)]);
    }

    // ── STORE ─────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'category'       => ['required', 'string'],
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'due_date'       => ['required', 'date'],
            'reminder_date'  => ['nullable', 'date', 'before:due_date'],
            'priority'       => ['required', 'in:low,medium,high,critical'],
            'recurrence'     => ['nullable', 'in:none,monthly,quarterly,biannual,annual'],
            'assigned_to'    => ['nullable', 'integer', 'exists:users,id'],
            'notes'          => ['nullable', 'string'],
        ]);

        /** @disregard P1013 */
        $branchId = auth()->user()->branch_id;

        $filing = ComplianceFiling::create([
            ...$v,
            'branch_id'     => $branchId,
            'status'        => 'upcoming',
            'recurrence'    => $v['recurrence'] ?? 'none',
            'reminder_date' => $v['reminder_date']
                ?? Carbon::parse($v['due_date'])->subDays(7)->toDateString(),
            'created_by'    => Auth::id(),
        ]);

        return response()->json([
            'data'    => $this->format($filing),
            'message' => 'Compliance filing created.',
        ], 201);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    public function update(Request $request, ComplianceFiling $filing): JsonResponse
    {
        $this->authorizeFiling($filing);

        if (in_array($filing->status, ['completed', 'waived'])) {
            return response()->json(['message' => 'Cannot edit a completed or waived filing.'], 422);
        }

        $v = $request->validate([
            'title'         => ['sometimes', 'string', 'max:255'],
            'description'   => ['nullable', 'string'],
            'due_date'      => ['sometimes', 'date'],
            'reminder_date' => ['nullable', 'date'],
            'priority'      => ['sometimes', 'in:low,medium,high,critical'],
            'status'        => ['sometimes', 'in:upcoming,in_progress,submitted,overdue,waived'],
            'assigned_to'   => ['nullable', 'integer', 'exists:users,id'],
            'notes'         => ['nullable', 'string'],
        ]);

        $filing->update($v);

        return response()->json([
            'data'    => $this->format($filing->fresh(['assignedTo'])),
            'message' => 'Filing updated.',
        ]);
    }

    // ── COMPLETE ──────────────────────────────────────────────────────────────

    public function complete(Request $request, ComplianceFiling $filing): JsonResponse
    {
        $this->authorizeFiling($filing);

        if ($filing->status === 'completed') {
            return response()->json(['message' => 'Already completed.'], 422);
        }

        $v = $request->validate([
            'submission_reference' => ['nullable', 'string', 'max:100'],
            'completion_notes'     => ['nullable', 'string'],
        ]);

        /** @disregard P1013 */
        $filing->complete(auth()->id(), $v['submission_reference'] ?? null, $v['completion_notes'] ?? null);

        // Spawn next occurrence for recurring filings
        $next = $filing->spawnNextOccurrence();

        return response()->json([
            'data'    => $this->format($filing->fresh()),
            'next_filing' => $next ? $this->format($next) : null,
            'message' => 'Filing marked complete.' . ($next ? " Next occurrence created for {$next->due_date->format('d M Y')}." : ''),
        ]);
    }

    // ── UPLOAD DOCUMENT ───────────────────────────────────────────────────────

    public function uploadDocument(Request $request, ComplianceFiling $filing): JsonResponse
    {
        $this->authorizeFiling($filing);

        $request->validate([
            'document'   => ['required', 'file', 'max:20480'], // 20 MB
            'doc_name'   => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('document');
        $path = $file->store("compliance/{$filing->branch_id}/{$filing->id}", 'local');

        $doc = ComplianceDocument::create([
            'filing_id'   => $filing->id,
            'doc_name'    => $request->doc_name ?? $file->getClientOriginalName(),
            'file_path'   => $path,
            'mime_type'   => $file->getMimeType(),
            'file_size'   => $file->getSize(),
            'uploaded_by' => Auth::id(),
        ]);

        return response()->json([
            'data'    => [
                'id'        => $doc->id,
                'doc_name'  => $doc->doc_name,
                'mime_type' => $doc->mime_type,
                'file_size' => $doc->file_size,
                'created_at'=> $doc->created_at?->toIso8601String(),
            ],
            'message' => 'Document uploaded.',
        ], 201);
    }

    // ── DELETE DOCUMENT ───────────────────────────────────────────────────────

    public function deleteDocument(ComplianceFiling $filing, ComplianceDocument $doc): JsonResponse
    {
        $this->authorizeFiling($filing);

        if ($doc->filing_id !== $filing->id) {
            return response()->json(['message' => 'Document not found on this filing.'], 404);
        }

        Storage::disk('local')->delete($doc->file_path);
        $doc->delete();

        return response()->json(['message' => 'Document deleted.']);
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

    private function authorizeFiling(ComplianceFiling $filing): void
    {
        /** @disregard P1013 */
        if ($filing->branch_id !== auth()->user()->branch_id) {
            abort(403);
        }
    }

    private function format(ComplianceFiling $f, bool $detailed = false): array
    {
        $base = [
            'id'              => $f->id,
            'category'        => $f->category,
            'title'           => $f->title,
            'description'     => $f->description,
            'due_date'        => $f->due_date->toDateString(),
            'reminder_date'   => $f->reminder_date?->toDateString(),
            'completed_date'  => $f->completed_date?->toDateString(),
            'status'          => $f->status,
            'priority'        => $f->priority,
            'recurrence'      => $f->recurrence,
            'days_until_due'  => $f->days_until_due,
            'is_overdue'      => $f->is_overdue,
            'urgency'         => $f->urgency,
            'assigned_to_name'=> $f->assignedTo?->name,
            'assigned_to_id'  => $f->assigned_to,
            'document_count'  => $f->relationLoaded('documents') ? $f->documents->count() : null,
            'created_at'      => $f->created_at?->toIso8601String(),
        ];

        if ($detailed) {
            $base['notes']                  = $f->notes;
            $base['completion_notes']       = $f->completion_notes;
            $base['submission_reference']   = $f->submission_reference;
            $base['created_by_name']        = $f->createdBy?->name;
            $base['completed_by_name']      = $f->completedBy?->name;
            $base['documents']              = $f->documents->map(fn ($d) => [
                'id'          => $d->id,
                'doc_name'    => $d->doc_name,
                'mime_type'   => $d->mime_type,
                'file_size'   => $d->file_size,
                'uploaded_by' => $d->uploadedBy?->name,
                'created_at'  => $d->created_at?->toIso8601String(),
            ])->all();
        }

        return $base;
    }
}