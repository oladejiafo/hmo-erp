<?php

namespace App\Http\Controllers\Claims;

use App\Http\Controllers\Controller;
use App\Http\Requests\Claims\ApproveClaimRequest;
use App\Http\Requests\Claims\AssignClaimRequest;
use App\Http\Requests\Claims\ProcessClaimRequest;
use App\Http\Requests\Claims\RejectClaimRequest;
use App\Http\Requests\Claims\ReviewFraudFlagRequest;
use App\Http\Requests\Claims\ReverseClaimRequest;
use App\Http\Requests\Claims\StoreClaimRequest;
use App\Http\Resources\ClaimResource;
use App\Http\Resources\FraudFlagResource;
use App\Jobs\ProcessClaimValidation;
use App\Models\Claim;
use App\Models\ClaimAssignment;
use App\Models\FraudFlag;
use App\Models\User;
use App\Services\ClaimStateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ClaimController extends Controller
{
    public function __construct(
        protected ClaimStateService $stateService
    ) {}

    /**
     * List claims with full filtering support.
     * Branch isolation applied automatically via BelongsToBranch global scope.
     * Route: GET /claims
     */
    public function index(Request $request): JsonResponse
    {
        $claims = Claim::query()
            ->with(['hcp:id,name,type', 'enrollee:id,enrollee_id,first_name,last_name'])
            ->when($request->status,      fn ($q, $s)  => $q->where('status', $s))
            ->when($request->claim_type,  fn ($q, $t)  => $q->where('claim_type', $t))
            ->when($request->hcp_id,      fn ($q, $id) => $q->where('hcp_id', $id))
            ->when($request->enrollee_id, fn ($q, $id) => $q->where('enrollee_id', $id))
            ->when($request->high_risk,   fn ($q)      => $q->highRisk())
            ->when($request->date_from,   fn ($q, $d)  => $q->where('service_date', '>=', $d))
            ->when($request->date_to,     fn ($q, $d)  => $q->where('service_date', '<=', $d))
            ->when($request->assigned_to_me, fn ($q)   => $q->whereHas('activeAssignment', fn ($a) =>
                $a->where('assigned_to', Auth::id())
            ))
            ->orderByDesc('submission_date')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => ClaimResource::collection($claims),
            'meta' => [
                'current_page' => $claims->currentPage(),
                'last_page'    => $claims->lastPage(),
                'per_page'     => $claims->perPage(),
                'total'        => $claims->total(),
            ],
        ]);
    }

    /**
     * Submit a new claim.
     * Auto-generates claim number, links items to tariffs, dispatches validation job.
     * Route: POST /claims
     */
    public function store(StoreClaimRequest $request): JsonResponse
    {
        $claim = DB::transaction(function () use ($request) {
            $validated = $request->validated();

            $validated['claim_number']    = Claim::generateUniqueId('CLM', 'claim_number', 6, Auth::user()->branch->code);
            $validated['submission_date'] = now()->toDateString();

            $claim = Claim::create($validated);

            foreach ($request->items as $item) {
                $tariff = $claim->hcp->activeTariffs()
                    ->where('service_code', $item['service_code'] ?? null)
                    ->orWhere('service_name', 'like', "%{$item['service_name']}%")
                    ->first();

                $claim->items()->create([
                    'tariff_id'           => $tariff?->id,
                    'service_code'        => $item['service_code'] ?? $tariff?->service_code,
                    'service_name'        => $item['service_name'],
                    'category'            => $item['category'] ?? $tariff?->category ?? 'consultation',
                    'quantity'            => $item['quantity'] ?? 1,
                    'unit_price_claimed'  => $item['unit_price'],
                    'total_price_claimed' => $item['unit_price'] * ($item['quantity'] ?? 1),
                    'tariff_unit_price'   => $tariff?->agreed_price,
                ]);
            }

            $claim->update([
                'total_amount_claimed' => $claim->items()->sum('total_price_claimed'),
            ]);

            return $claim;
        });

        ProcessClaimValidation::dispatch($claim)->onQueue('claims');

        return response()->json([
            'message' => 'Claim submitted. Auto-validation started.',
            'data'    => new ClaimResource($claim->load(['hcp', 'enrollee', 'items'])),
        ], 201);
    }

    /**
     * Get full claim detail with all relationships.
     * Route: GET /claims/{claim}
     */
    public function show(Claim $claim): JsonResponse
    {
        $claim->load([
            'hcp:id,name,type,tier,phone',
            'enrollee:id,enrollee_id,first_name,last_name,benefit_balance',
            'dependent:id,first_name,last_name,relationship',
            'items',
            'documents',
            'activeAssignment.assignedTo:id,name',
            'openFraudFlags',
            'statusLogs.user:id,name',
        ]);

        return response()->json(['data' => new ClaimResource($claim)]);
    }

    /**
     * Review a claim — officer approves/adjusts individual items.
     * Route: POST /claims/{claim}/process
     */
    public function process(ProcessClaimRequest $request, Claim $claim): JsonResponse
    {
        if (! in_array($claim->status->value, ['under_review', 'flagged', 'auto_validated'])) {
            return response()->json([
                'message' => 'Only claims under review can be processed.',
            ], 422);
        }

        DB::transaction(function () use ($request, $claim) {
            foreach ($request->items ?? [] as $itemData) {
                $claim->items()->where('id', $itemData['id'])->update([
                    'amount_approved'   => $itemData['amount_approved'],
                    'status'            => $itemData['status'],
                    'adjustment_reason' => $itemData['adjustment_reason'] ?? null,
                ]);
            }

            $claim->update([
                'total_amount_approved' => $claim->items()->sum('amount_approved'),
                'reviewer_notes'        => $request->notes,
            ]);
        });

        return response()->json([
            'message' => 'Claim reviewed. Ready for approval.',
            'data'    => new ClaimResource($claim->fresh(['items'])),
        ]);
    }

    /**
     * Final approval of a claim. High-value/high-risk claims require supervisor role.
     * Route: POST /claims/{claim}/approve
     */
    public function approve(ApproveClaimRequest $request, Claim $claim): JsonResponse
    {
       /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($claim->requiresSupervisorReview() && !$user->hasAnyRole(['claims_supervisor', 'hq_manager', 'super_admin'])) {
            return response()->json([
                'message' => 'This claim requires supervisor approval due to its value or risk level.',
            ], 403);
        }

        $this->stateService->approve($claim, $request->approved_amount, $request->note);

        $claim->enrollee->deductBenefit($request->approved_amount);

        return response()->json([
            'message' => 'Claim approved and added to payment queue.',
            'data'    => new ClaimResource($claim->fresh(['items', 'statusLogs'])),
        ]);
    }

    /**
     * Reject a claim with a mandatory reason.
     * Route: POST /claims/{claim}/reject
     */
    public function reject(RejectClaimRequest $request, Claim $claim): JsonResponse
    {
        $this->stateService->reject($claim, $request->reason);

        return response()->json([
            'message' => 'Claim rejected.',
            'data'    => new ClaimResource($claim->fresh()),
        ]);
    }

    /**
     * Assign a claim to an officer or supervisor.
     * Closes the previous active assignment first.
     * Route: POST /claims/{claim}/assign
     */
    public function assign(AssignClaimRequest $request, Claim $claim): JsonResponse
    {
        $assignee = User::findOrFail($request->assignee_id);

        DB::transaction(function () use ($claim, $assignee, $request) {
            $claim->assignments()->where('is_active', true)->update([
                'is_active'    => false,
                'completed_at' => now(),
            ]);

            ClaimAssignment::create([
                'claim_id'        => $claim->id,
                'assigned_to'     => $assignee->id,
                'assigned_by'     => Auth::id(),
                'assignment_type' => $request->priority ?? 'normal',
                'is_active'       => true,
                'assigned_at'     => now(),
                'handover_note'   => $request->notes,
            ]);
        });

        return response()->json([
            'message' => "Claim assigned to {$assignee->name}.",
        ]);
    }

    /**
     * Reverse a paid claim. Creates a financial reversal record.
     * Requires a detailed reason (min 20 chars enforced by request).
     * Route: POST /claims/{claim}/reverse
     */
    public function reverse(ReverseClaimRequest $request, Claim $claim): JsonResponse
    {
        $this->stateService->transition(
            $claim,
            \App\Enums\ClaimStatus::REVERSED,
            $request->reason,
            'user'
        );

        return response()->json(['message' => 'Claim reversed. Finance will be notified.']);
    }

    /**
     * Get the full status-change timeline for a claim.
     * Route: GET /claims/{claim}/timeline
     */
    public function timeline(Claim $claim): JsonResponse
    {
        $logs = $claim->statusLogs()
            ->with('user:id,name')
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $logs]);
    }

    /**
     * Get all fraud flags raised against a claim.
     * Route: GET /claims/{claim}/fraud-flags
     */
    public function fraudFlags(Claim $claim): JsonResponse
    {
        $flags = $claim->fraudFlags()->with('reviewedBy:id,name')->get();

        return response()->json([
            'data'       => FraudFlagResource::collection($flags),
            'risk_score' => $claim->risk_score,
        ]);
    }

    /**
     * Review a specific fraud flag (confirm or dismiss it).
     * Route: PATCH /claims/{claim}/fraud-flags/{flag}/review
     */
    public function reviewFraudFlag(ReviewFraudFlagRequest $request, Claim $claim, FraudFlag $flag): JsonResponse
    {
        abort_unless($flag->claim_id === $claim->id, 404);

        $flag->update([
            'status'        => $request->status,
            'reviewed_by'   => Auth::id(),
            'reviewed_at'   => now(),
            'reviewer_note' => $request->reviewer_note,
        ]);

        return response()->json([
            'message' => "Fraud flag {$request->status}.",
            'data'    => new FraudFlagResource($flag->fresh('reviewedBy')),
        ]);
    }
}