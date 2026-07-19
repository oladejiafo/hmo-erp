<?php

namespace App\Http\Controllers;

use App\Models\PreAuthorisation;
use App\Models\Enrollee;
use App\Models\HealthCareProvider;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Http/Controllers/PreAuthController.php
 *
 * Handles all Pre-Authorisation (PA) operations.
 *
 * Route group (in routes/api.php):
 *   Route::prefix('pre-auth')->middleware(['auth:sanctum', 'branch.scope'])->group(function () {
 *       Route::get('/',                [PreAuthController::class, 'index']);
 *       Route::post('/',               [PreAuthController::class, 'store']);
 *       Route::get('/stats',           [PreAuthController::class, 'stats']);
 *       Route::post('/validate-code',  [PreAuthController::class, 'validateCode']);
 *       Route::get('/{pa}',            [PreAuthController::class, 'show']);
 *       Route::post('/{pa}/approve',   [PreAuthController::class, 'approve']);
 *       Route::post('/{pa}/decline',   [PreAuthController::class, 'decline']);
 *       Route::post('/{pa}/revoke',    [PreAuthController::class, 'revoke']);
 *       Route::get('/{pa}/download',   [PreAuthController::class, 'downloadLetter']);
 *   });
 *
 * Three-step approval chain (amount-driven):
 *   ≤ ₦500k:  pending → [Desk Officer] → approved (+ pa_code generated)
 *   ≤ ₦2M:   pending → [Desk Officer] → awaiting_md → [Medical Director] → approved
 *   > ₦2M:   pending → [Desk Officer] → awaiting_md → [MD] → awaiting_ceo → [CEO] → approved
 *
 * Permissions consumed (must be synced in DB):
 *   pa.view              - read any PA
 *   pa.request           - submit new PA
 *   pa.approve_standard  - Desk Officer approval (first step for all tiers)
 *   pa.approve_high_value- Medical Director sign-off (₦500k–₦2M)
 *   pa.approve_critical  - CEO sign-off (>₦2M)
 *   pa.decline           - decline or revoke any PA
 */
class PreAuthController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // INDEX - paginated list with queue/filter support
    // GET /pre-auth
    // ─────────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PreAuthorisation::class);

        $query = PreAuthorisation::with([
            'enrollee:id,first_name,last_name,enrollee_id',
            'enrollee.corporate:id,name',
            'dependent:id,first_name,last_name,relationship',
            'hcp:id,name,type,tier,city',
            'submittedBy:id,name',
            'reviewedBy:id,name',
        ])->forBranch(Auth::user()->branch_id);

        // ── Filters ──────────────────────────────────────────────────────

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($urgency = $request->input('urgency')) {
            $query->where('urgency', $urgency);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('pa_code', 'like', "%{$search}%")
                  ->orWhere('pa_number', 'like', "%{$search}%")
                  ->orWhereHas('enrollee', fn ($e) =>
                      $e->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name',  'like', "%{$search}%")
                        ->orWhere('enrollee_id','like', "%{$search}%")
                  )
                  ->orWhereHas('hcp', fn ($h) =>
                      $h->where('name', 'like', "%{$search}%")
                  );
            });
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Only overdue active PAs (for the TAT breach report)
        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        // ── Sorting ───────────────────────────────────────────────────────
        $sort = $request->input('sort', 'created_at_desc');

        if ($sort === 'urgency_age') {
            // Queue order: emergency first, then urgent, then standard; within each by age (oldest first)
            $query->orderByRaw("FIELD(urgency, 'emergency', 'urgent', 'standard')")
                  ->orderBy('created_at', 'asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $paginated = $query->paginate($perPage);

        // ── Append computed fields to each item ──────────────────────────
        $paginated->through(fn ($pa) => $this->appendListFields($pa));

        return response()->json($paginated);
    }

    // ─────────────────────────────────────────────────────────────────────
    // STORE - submit a new PA request
    // POST /pre-auth
    // ─────────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', PreAuthorisation::class);

        $validated = $request->validate([
            'enrollee_id'           => ['required', 'integer', 'exists:enrollees,id'],
            'dependent_id'          => ['nullable', 'integer', 'exists:dependents,id'],
            'hcp_id'                => ['required', 'integer', 'exists:health_care_providers,id'],
            'service_type'          => ['required', 'string', 'max:60'],
            'urgency'               => ['required', Rule::in(['standard', 'urgent', 'emergency'])],
            'diagnosis_codes'       => ['nullable', 'array'],
            'diagnosis_codes.*'     => ['string', 'max:20'],
            'diagnosis_description' => ['required', 'string', 'max:500'],
            'clinical_notes'        => ['nullable', 'string', 'max:5000'],
            'estimated_amount'      => ['nullable', 'numeric', 'min:0'],
            'admission_date'        => ['nullable', 'date'],
            'expected_duration'     => ['nullable', 'integer', 'min:1', 'max:365'],
            'attending_doctor'      => ['nullable', 'string', 'max:120'],
            'submission_channel'    => ['nullable', 'string', 'max:40'],
        ]);

        // ── Business rule checks ─────────────────────────────────────────

        $enrollee = Enrollee::findOrFail($validated['enrollee_id']);

        if ($enrollee->status->value !== 'active')  { 
            return response()->json([
                'message' => 'Enrollee is not active and cannot receive a Pre-Authorisation.',
            ], 422);
        }

        $hcp = HealthCareProvider::findOrFail($validated['hcp_id']);

        if (! in_array($hcp->status->value, ['active', 'accredited'])) {
            return response()->json([
                'message' => 'Selected healthcare provider is not active/accredited.',
            ], 422);
        }

        // Warn if PA already open for same enrollee + service (soft duplicate check)
        $duplicate = PreAuthorisation::where('enrollee_id', $validated['enrollee_id'])
            ->where('service_type', $validated['service_type'])
            ->whereIn('status', PreAuthorisation::ACTIVE_STATUSES)
            ->first();

        $user = Auth::user();

        $tier = PreAuthorisation::tierFromAmount($validated['estimated_amount'] ?? null);

        // Emergency PAs bypass normal flow
        $status = $validated['urgency'] === 'emergency'
            ? 'emergency_retrospective'
            : 'pending';

        $pa = DB::transaction(function () use ($validated, $user, $tier, $status, $duplicate) {

            $pa = PreAuthorisation::create([
                ...$validated,
                'pa_number'          => PreAuthorisation::generatePANumber(),
                'branch_id'          => $user->branch_id,
                'submitted_by_id'    => $user->id,
                'approval_tier'      => $tier,
                'status'             => $status,
                'submission_channel' => $validated['submission_channel'] ?? 'hmo_portal',
            ]);

            $pa->logEvent(
                'submitted',
                'PA Request Submitted',
                $user->id,
                $user->name,
                null,
                $duplicate ? ['duplicate_warning' => "Open PA #{$duplicate->pa_number} exists for same service."] : null
            );

            return $pa;
        });

        $pa->load(['enrollee', 'hcp', 'submittedBy']);

        return response()->json([
            'data'    => $this->formatDetail($pa),
            'warning' => $duplicate
                ? "Note: Enrollee already has an open PA ({$duplicate->pa_number}) for the same service."
                : null,
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────
    // STATS - KPI bar for PAListPage
    // GET /pre-auth/stats
    // ─────────────────────────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $this->authorize('viewAny', PreAuthorisation::class);

        $branchId = Auth::user()->branch_id;

        $base = PreAuthorisation::forBranch($branchId);

        $pendingCount    = (clone $base)->whereIn('status', PreAuthorisation::ACTIVE_STATUSES)->count();
        $overdueCount    = (clone $base)->overdue()->count();
        $awaitingMdCount = (clone $base)->where('status', 'awaiting_md')->count();
        $awaitingCeoCount= (clone $base)->where('status', 'awaiting_ceo')->count();

        $approvedToday   = (clone $base)->where('status', 'approved')
                               ->whereDate('reviewed_at', today())->count();
        $declinedToday   = (clone $base)->where('status', 'declined')
                               ->whereDate('reviewed_at', today())->count();

        // Average response time today (minutes), only for resolved PAs
        $avgResponse = (clone $base)
            ->whereNotNull('reviewed_at')
            ->whereDate('reviewed_at', today())
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, reviewed_at)) as avg_mins')
            ->value('avg_mins');

        return response()->json([
            'data' => [
                'pending_count'      => $pendingCount,
                'overdue_count'      => $overdueCount,
                'awaiting_md_count'  => $awaitingMdCount,
                'awaiting_ceo_count' => $awaitingCeoCount,
                'approved_today'     => $approvedToday,
                'declined_today'     => $declinedToday,
                'avg_response_mins'  => $avgResponse ? (int) round($avgResponse) : null,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // VALIDATE CODE - used during claim submission (live PA code check)
    // POST /pre-auth/validate-code
    // ─────────────────────────────────────────────────────────────────────

    public function validateCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pa_code'     => ['required', 'string'],
            'enrollee_id' => ['nullable', 'integer'],
            'hcp_id'      => ['nullable', 'integer'],
        ]);

        $pa = PreAuthorisation::where('pa_code', $validated['pa_code'])->first();

        if (! $pa) {
            return response()->json(['valid' => false, 'error' => 'PA code not found.'], 422);
        }

        if ($pa->status !== 'approved') {
            $msg = match ($pa->status) {
                'used'    => 'This PA code has already been used on a claim.',
                'expired' => 'This PA code has expired.',
                'revoked' => 'This PA code has been revoked.',
                'declined'=> 'This PA request was declined.',
                default   => 'PA is not yet approved.',
            };
            return response()->json(['valid' => false, 'error' => $msg], 422);
        }

        if ($pa->expires_at && $pa->expires_at->isPast()) {
            // Mark as expired
            $pa->update(['status' => 'expired']);
            $pa->logEvent('expired', 'PA Code Expired', null, 'System');
            return response()->json(['valid' => false, 'error' => 'This PA code has expired.'], 422);
        }

        // Enrollee mismatch
        if (! empty($validated['enrollee_id']) && $pa->enrollee_id != $validated['enrollee_id']) {
            return response()->json([
                'valid' => false,
                'error' => 'PA code does not match the selected enrollee.',
            ], 422);
        }

        // HCP mismatch
        if (! empty($validated['hcp_id']) && $pa->hcp_id != $validated['hcp_id']) {
            return response()->json([
                'valid' => false,
                'error' => 'PA code was issued for a different healthcare provider.',
            ], 422);
        }

        $pa->logEvent(
            'code_validated',
            'PA Code Validated',
            Auth::id(),
            Auth::user()?->name,
            null,
            ['caller_enrollee_id' => $validated['enrollee_id'], 'caller_hcp_id' => $validated['hcp_id']]
        );

        $pa->load(['enrollee:id,first_name,last_name,enrollee_id', 'hcp:id,name']);

        return response()->json([
            'valid' => true,
            'pa'    => [
                'id'               => $pa->id,
                'pa_code'          => $pa->pa_code,
                'pa_number'        => $pa->pa_number,
                'enrollee_name'    => $pa->enrollee->first_name . ' ' . $pa->enrollee->last_name,
                'hcp_name'         => $pa->hcp->name,
                'service_type'     => $pa->service_type,
                'service_type_label' => $pa->service_type_label,
                'approved_amount'  => $pa->approved_amount,
                'estimated_amount' => $pa->estimated_amount,
                'expires_at'       => $pa->expires_at?->toIso8601String(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // SHOW - full PA detail
    // GET /pre-auth/{pa}
    // ─────────────────────────────────────────────────────────────────────

    public function show(PreAuthorisation $pa): JsonResponse
    {
        $this->authorize('view', $pa);

        $pa->load([
            'enrollee',
            'enrollee.corporate:id,name',
            // 'enrollee.activePlan',                      // assumes Enrollee has activePlan relation
            'dependent',
            'hcp',
            'submittedBy:id,name',
            'deskApprovedBy:id,name',
            'mdApprovedBy:id,name',
            'ceoApprovedBy:id,name',
            'reviewedBy:id,name',
            'claim:id,claim_number',
            'timeline.actor:id,name',
        ]);

        return response()->json(['data' => $this->formatDetail($pa)]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // APPROVE - multi-step approval logic
    // POST /pre-auth/{pa}/approve
    // ─────────────────────────────────────────────────────────────────────

    public function approve(Request $request, PreAuthorisation $pa): JsonResponse
    {
        $this->authorize('approve', $pa);

        if (! in_array($pa->status, PreAuthorisation::ACTIVE_STATUSES)) {
            return response()->json(['message' => 'This PA is not in an approvable state.'], 422);
        }

        $validated = $request->validate([
            'approved_amount' => ['nullable', 'numeric', 'min:0'],
            'note'            => ['nullable', 'string', 'max:2000'],
            'validity_days'   => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $user = Auth::user();

        $pa = DB::transaction(function () use ($pa, $validated, $user) {

            $tier = $pa->approval_tier;

            // ── Determine next status based on current status and user permissions ──
            $nextStatus  = null;
            $event       = null;
            $eventLabel  = null;
            $generateCode= false;

            if ($pa->status === 'pending' || $pa->status === 'emergency_retrospective') {

                // Desk Officer step
                $pa->desk_approved_by_id = $user->id;
                $pa->desk_approved_at    = now();

                if ($tier === 'standard') {
                    // One-step - go directly to approved
                    $nextStatus   = 'approved';
                    $generateCode = true;
                    $event        = 'pa_issued';
                    $eventLabel   = 'PA Approved & Code Issued';
                } elseif ($tier === 'md') {
                    $nextStatus = 'awaiting_md';
                    $event      = 'escalated_to_md';
                    $eventLabel = 'Escalated to Medical Director';
                } else {
                    // ceo tier - desk first step
                    $nextStatus = 'awaiting_md';
                    $event      = 'escalated_to_md';
                    $eventLabel = 'Escalated to Medical Director (CEO approval required)';
                }

            } elseif ($pa->status === 'awaiting_md') {

                // Medical Director step
                /** @disregard P1013 */
                if (! $user->can('pa.approve_high_value')) {
                    abort(403, 'Medical Director permission required to approve at this stage.');
                }
                $pa->md_approved_by_id = $user->id;
                $pa->md_approved_at    = now();

                if ($tier === 'md') {
                    $nextStatus   = 'approved';
                    $generateCode = true;
                    $event        = 'pa_issued';
                    $eventLabel   = 'PA Approved by Medical Director & Code Issued';
                } else {
                    $nextStatus = 'awaiting_ceo';
                    $event      = 'escalated_to_ceo';
                    $eventLabel = 'Escalated to CEO';
                }

            } elseif ($pa->status === 'awaiting_ceo') {

                // CEO step
                /** @disregard P1013 */
                if (! $user->can('pa.approve_critical')) {
                    abort(403, 'CEO permission required to approve at this stage.');
                }
                $pa->ceo_approved_by_id = $user->id;
                $pa->ceo_approved_at    = now();
                $nextStatus             = 'approved';
                $generateCode           = true;
                $event                  = 'pa_issued';
                $eventLabel             = 'PA Approved by CEO & Code Issued';
            }

            // ── Apply final approval fields ────────────────────────────────
            $pa->status = $nextStatus;

            if ($generateCode) {
                $pa->pa_code         = PreAuthorisation::generatePACode();
                $pa->approved_amount = $validated['approved_amount'] ?? $pa->estimated_amount;
                $pa->approval_note   = $validated['note'] ?? null;
                // $pa->validity_days   = $validated['validity_days'] ?? 30;
                $pa->validity_days   = $validated['validity_days']
                 ?? SystemSetting::get('financial.pa_default_validity_days', 30);

                $pa->expires_at      = now()->addDays($pa->validity_days);
                $pa->reviewed_by_id  = $user->id;
                $pa->reviewed_at     = now();
            }

            $pa->save();

            $pa->logEvent(
                $event,
                $eventLabel,
                $user->id,
                $user->name,
                $validated['note'] ?? null,
                $generateCode ? ['pa_code' => $pa->pa_code, 'expires_at' => $pa->expires_at?->toDateString()] : null
            );

            return $pa;
        });

        $pa->load(['enrollee', 'hcp', 'submittedBy', 'reviewedBy', 'timeline']);
        app(\App\Services\NotificationService::class)->providerPreAuthDecision($pa);
        return response()->json([
            'data'    => $this->formatDetail($pa),
            'message' => $pa->status === 'approved'
                ? "PA approved. Code issued: {$pa->pa_code}"
                : "First approval recorded. Escalated to " . ($pa->status === 'awaiting_md' ? 'Medical Director' : 'CEO') . ".",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DECLINE - decline at any active stage
    // POST /pre-auth/{pa}/decline
    // ─────────────────────────────────────────────────────────────────────

    public function decline(Request $request, PreAuthorisation $pa): JsonResponse
    {
        $this->authorize('decline', $pa);

        if (! in_array($pa->status, PreAuthorisation::ACTIVE_STATUSES)) {
            return response()->json(['message' => 'This PA cannot be declined in its current state.'], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:20', 'max:2000'],
        ]);
        /** @disregard P1013 */
        $user = auth()->user();

        DB::transaction(function () use ($pa, $validated, $user) {
            $pa->update([
                'status'         => 'declined',
                'decline_reason' => $validated['reason'],
                'reviewed_by_id' => $user->id,
                'reviewed_at'    => now(),
            ]);

            $pa->logEvent(
                'declined',
                'PA Request Declined',
                $user->id,
                $user->name,
                $validated['reason']
            );
        });
        app(\App\Services\NotificationService::class)->providerPreAuthDecision($pa);
        return response()->json([
            'data'    => ['id' => $pa->id, 'status' => 'declined'],
            'message' => 'PA request declined.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // REVOKE - cancel an approved (unused) PA code
    // POST /pre-auth/{pa}/revoke
    // ─────────────────────────────────────────────────────────────────────

    public function revoke(Request $request, PreAuthorisation $pa): JsonResponse
    {
        $this->authorize('revoke', $pa);

        if ($pa->status !== 'approved') {
            return response()->json(['message' => 'Only approved PAs can be revoked.'], 422);
        }

        if ($pa->claim_id) {
            return response()->json([
                'message' => 'This PA code has already been used on a claim and cannot be revoked.',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        /** @disregard P1013 */
        $user = auth()->user();

        DB::transaction(function () use ($pa, $validated, $user) {
            $pa->update([
                'status'       => 'revoked',
                'revoke_reason'=> $validated['reason'],
                'reviewed_by_id' => $user->id,
                'reviewed_at'    => now(),
            ]);

            $pa->logEvent(
                'revoked',
                'PA Code Revoked',
                $user->id,
                $user->name,
                $validated['reason'],
                ['revoked_code' => $pa->pa_code]
            );
        });

        return response()->json([
            'data'    => ['id' => $pa->id, 'status' => 'revoked'],
            'message' => "PA code {$pa->pa_code} has been revoked.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DOWNLOAD LETTER - PDF approval letter for provider
    // GET /pre-auth/{pa}/download
    // ─────────────────────────────────────────────────────────────────────

    public function downloadLetter(PreAuthorisation $pa)
    {
        if (!request()->user()->can('pa.view')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
    
        if (!$pa->pa_code) {
            return response()->json(['message' => 'PA code has not been issued yet.'], 422);
        }
    
        $pa->load(['enrollee', 'hcp', 'reviewedBy', 'deskApprovedBy']);
        
        // Get HMO settings from database
        $hmoName = SystemSetting::get('hmo_info.name', 'HMO Management System');
        $hmoAddress = SystemSetting::get('hmo_info.address', '');
        $hmoPhone = SystemSetting::get('hmo_info.phone', '');
        $hmoEmail = SystemSetting::get('hmo_info.email', '');
        $currencySymbol = SystemSetting::get('hmo_info.currency_symbol', '₦');
    
        $pdf = Pdf::loadView('pdf.pa-approval-letter', [
            'pa' => $pa,
            'hmoName' => $hmoName,
            'hmoAddress' => $hmoAddress,
            'hmoPhone' => $hmoPhone,
            'hmoEmail' => $hmoEmail,
            'currencySymbol' => $currencySymbol
        ])->setPaper('a4', 'portrait');
    
        return $pdf->download("PA-Letter-{$pa->pa_code}.pdf");
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Append computed/relational fields to a PA for the list endpoint.
     * Keeps the list query fast (no eager loads beyond what's needed).
     */
    private function appendListFields(PreAuthorisation $pa): array
    {
        return [
            'id'                   => $pa->id,
            'pa_number'            => $pa->pa_number,
            'pa_code'              => $pa->pa_code,
            'status'               => $pa->status,
            'urgency'              => $pa->urgency,
            'approval_tier'        => $pa->approval_tier,
            'service_type'         => $pa->service_type,
            'service_type_label'   => $pa->service_type_label,
            'estimated_amount'     => $pa->estimated_amount,
            'enrollee_name'        => $pa->enrollee
                ? "{$pa->enrollee->first_name} {$pa->enrollee->last_name}"
                : null,
            'enrollee_member_no'   => $pa->enrollee?->enrollee_id,
            'dependent_name'       => $pa->dependent
                ? "{$pa->dependent->first_name} {$pa->dependent->last_name}"
                : null,
            'hcp_name'             => $pa->hcp?->name,
            'hcp_tier'             => $pa->hcp?->tier,
            'diagnosis_description'=> $pa->diagnosis_description,
            'submitted_by_name'    => $pa->submittedBy?->name,
            'reviewed_by_name'     => $pa->reviewedBy?->name,
            'age_minutes'          => $pa->age_minutes,
            'response_minutes'     => $pa->response_minutes,
            'is_overdue'           => $pa->is_overdue,
            'tat_status'           => $pa->tat_status,
            'created_at'           => $pa->created_at?->toIso8601String(),
            'reviewed_at'          => $pa->reviewed_at?->toIso8601String(),
            'expires_at'           => $pa->expires_at?->toIso8601String(),
        ];
    }

    /**
     * Full detail format for show/approve/decline responses.
     */
    private function formatDetail(PreAuthorisation $pa): array
    {
        $base = $this->appendListFields($pa);

        return array_merge($base, [
            // Extended patient info
            'corporate_name'         => $pa->enrollee?->corporate?->name,
            'enrollee_benefit_balance'=> $pa->enrollee?->activePlan?->remaining_balance ?? null,
            'dependent_relationship' => $pa->dependent?->relationship,

            // Extended HCP info
            'hcp_type'               => $pa->hcp?->type,
            'hcp_city'               => $pa->hcp?->city,

            // Clinical
            'diagnosis_codes'        => $pa->diagnosis_codes,
            'clinical_notes'         => $pa->clinical_notes,
            'admission_date'         => $pa->admission_date,
            'expected_duration'      => $pa->expected_duration,
            'attending_doctor'       => $pa->attending_doctor,

            // Financial
            'approved_amount'        => $pa->approved_amount,
            'validity_days'          => $pa->validity_days,

            // Approval chain
            'desk_approved_by_name'  => $pa->deskApprovedBy?->name,
            'desk_approved_at'       => $pa->desk_approved_at?->toIso8601String(),
            'md_approved_by_name'    => $pa->mdApprovedBy?->name,
            'md_approved_at'         => $pa->md_approved_at?->toIso8601String(),
            'ceo_approved_by_name'   => $pa->ceoApprovedBy?->name,
            'ceo_approved_at'        => $pa->ceo_approved_at?->toIso8601String(),
            'submitted_by_name'      => $pa->submittedBy?->name,
            'submission_channel'     => $pa->submission_channel,

            // Decision notes
            'approval_note'          => $pa->approval_note,
            'decline_reason'         => $pa->decline_reason,
            'revoke_reason'          => $pa->revoke_reason,

            // Linked claim
            'claim_id'               => $pa->claim_id,
            'claim_number'           => $pa->claim?->claim_number,

            // Audit timeline (array of event objects)
            'timeline'               => $pa->timeline->map(fn ($event) => [
                'id'           => $event->id,
                'event'        => $event->event,
                'event_label'  => $event->event_label,
                'actor_name'   => $event->actor_name,
                'note'         => $event->note,
                'status_after' => $event->status_after,
                'meta'         => $event->meta,
                'created_at'   => $event->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }
}