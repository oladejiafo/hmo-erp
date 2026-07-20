<?php
/**
 * NEW FILE - app/Http/Controllers/Portal/ProviderPortalController.php
 *
 * Mirrors EnrolleePortalController / CorporatePortalController exactly:
 * ownership checked via $user->hcp (not Spatie permissions - portal users
 * have no roles). Write endpoints deliberately do NOT reuse
 * ClaimController::store() / PreAuthController::store() directly, because
 * both of those authorize via `hasPermissionTo()` / policies that portal
 * users don't have. Instead this duplicates their core creation logic
 * (verified from the real controllers) with one critical difference:
 * hcp_id is forced to the authenticated provider's own HCP record, never
 * accepted from the request body. A provider must not be able to submit a
 * claim or PA under a different hospital's name.
 *
 * Scope note: this is the Phase 2 MVP per the roadmap - claims + PA
 * submission/tracking, enrollee verification. Mini-EMR, telemedicine, and
 * PBM dispensing are later phases and deliberately not touched here.
 */

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessClaimValidation;
use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\PreAuthorisation;
use App\Models\Ticket; // [PHASE 3]
use App\Services\TicketService; // [PHASE 3]
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProviderPortalController extends Controller
{
    // [PHASE 3]
    public function __construct(protected TicketService $ticketService) {}

    /**
     * Dashboard summary for the logged-in provider.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => null], 404);
        }

        $claimsThisMonth = Claim::where('hcp_id', $hcp->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $pendingClaims = Claim::where('hcp_id', $hcp->id)
            ->whereIn('status', ['submitted', 'auto_validating', 'auto_validated', 'under_review', 'flagged', 'supervisor_review'])
            ->count();

        $paidThisMonth = Claim::where('hcp_id', $hcp->id)
            ->where('status', 'paid')
            ->whereMonth('paid_at', now()->month)
            ->whereYear('paid_at', now()->year)
            ->sum('total_amount_paid');

        $openPAs = PreAuthorisation::where('hcp_id', $hcp->id)
            ->whereIn('status', PreAuthorisation::ACTIVE_STATUSES)
            ->count();

        $recentClaims = Claim::where('hcp_id', $hcp->id)
            ->with('enrollee:id,first_name,last_name,enrollee_id')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'hcp_name' => $hcp->name,
                'hcp_code' => $hcp->hcp_code,
                'status' => $hcp->status,
                'payment_model' => $hcp->payment_model,
                'claims_this_month' => $claimsThisMonth,
                'pending_claims' => $pendingClaims,
                'paid_this_month' => $paidThisMonth,
                'open_pre_auths' => $openPAs,
                'recent_claims' => $recentClaims->map(fn($c) => [
                    'id' => $c->id,
                    'claim_number' => $c->claim_number,
                    'enrollee_name' => $c->enrollee ? $c->enrollee->first_name . ' ' . $c->enrollee->last_name : null,
                    'total_amount_claimed' => $c->total_amount_claimed,
                    'status' => $c->status,
                    'service_date' => $c->service_date?->format('Y-m-d'),
                ]),
            ],
        ]);
    }

    /**
     * Verify/look up an enrollee by member number, for check-in and
     * claim/PA submission. Deliberately returns a minimal field set -
     * providers see enough to confirm identity and coverage, not the
     * enrollee's full record (no NIN, no address, no phone).
     */
    public function verifyEnrollee(Request $request): JsonResponse
    {
        $request->validate([
            'member_number' => 'required|string',
        ]);

        $enrollee = Enrollee::where('enrollee_id', $request->member_number)
            ->with('plan')
            ->first();

        if (!$enrollee) {
            // Also check dependents by their own dependent_id
            $dependent = \App\Models\Dependent::where('dependent_id', $request->member_number)
                ->with('enrollee.plan')
                ->first();

            if (!$dependent) {
                return response()->json(['message' => 'No member found with that number'], 404);
            }

            return response()->json([
                'data' => [
                    'type' => 'dependent',
                    'id' => $dependent->id,
                    'enrollee_id' => $dependent->enrollee_id,
                    'full_name' => $dependent->first_name . ' ' . $dependent->last_name,
                    'member_number' => $dependent->dependent_id,
                    'relationship' => $dependent->relationship,
                    'plan_name' => $dependent->enrollee->plan->plan_name ?? 'N/A',
                    'status' => $dependent->status,
                    'principal_status' => $dependent->enrollee->status,
                ],
            ]);
        }

        return response()->json([
            'data' => [
                'type' => 'principal',
                'id' => $enrollee->id,
                'enrollee_id' => $enrollee->id,
                'full_name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                'member_number' => $enrollee->enrollee_id,
                'plan_name' => $enrollee->plan->plan_name ?? 'N/A',
                'status' => $enrollee->status,
                'expiry_date' => $enrollee->expiry_date?->format('Y-m-d'),
                'benefit_balance' => $enrollee->benefit_balance,
                'can_make_claim' => $enrollee->canMakeClaim(),
            ],
        ]);
    }

    /**
     * List this provider's own claims.
     */
    public function claims(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = Claim::where('hcp_id', $hcp->id)
            ->with(['enrollee:id,first_name,last_name,enrollee_id', 'dependent']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('claim_number', 'like', "%{$request->search}%")
                    ->orWhereHas('enrollee', function ($e) use ($request) {
                        $e->where('first_name', 'like', "%{$request->search}%")
                          ->orWhere('last_name', 'like', "%{$request->search}%")
                          ->orWhere('enrollee_id', 'like', "%{$request->search}%");
                    });
            });
        }

        $claims = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => collect($claims->items())->map(fn($c) => [
                'id' => $c->id,
                'claim_number' => $c->claim_number,
                'enrollee_name' => $c->enrollee ? $c->enrollee->first_name . ' ' . $c->enrollee->last_name : null,
                'dependent_name' => $c->dependent ? $c->dependent->first_name . ' ' . $c->dependent->last_name : null,
                'service_date' => $c->service_date?->format('Y-m-d'),
                'total_amount_claimed' => $c->total_amount_claimed,
                'total_amount_approved' => $c->total_amount_approved,
                'total_amount_paid' => $c->total_amount_paid,
                'status' => $c->status,
                'rejection_reason' => $c->rejection_reason,
            ]),
            'meta' => [
                'current_page' => $claims->currentPage(),
                'last_page' => $claims->lastPage(),
                'total' => $claims->total(),
            ],
        ]);
    }

    /**
     * Claim detail - ownership enforced (hcp_id must match own HCP).
     */
    public function claimShow(Request $request, Claim $claim): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp || $claim->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Claim not found'], 404);
        }

        $claim->load(['enrollee', 'dependent', 'items', 'documents', 'statusLogs']);

        return response()->json(['data' => $claim]);
    }

    /**
     * Submit a new claim as this provider.
     *
     * Mirrors ClaimController::store()'s transaction shape (verified from
     * the real controller) - same claim_number generation, same item
     * creation, same total calculation, same ProcessClaimValidation
     * dispatch. hcp_id is forced server-side, never taken from input.
     */
    public function storeClaim(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['message' => 'No provider record linked to this account'], 404);
        }

        if (!$hcp->canSubmitClaims()) {
            return response()->json(['message' => 'This facility is not currently able to submit claims (check accreditation/contract status).'], 422);
        }

        $validated = $request->validate([
            'enrollee_id' => ['required', 'integer', 'exists:enrollees,id'],
            'dependent_id' => ['nullable', 'integer', 'exists:dependents,id'],
            'service_date' => ['required', 'date', 'before_or_equal:today'],
            'admission_date' => ['nullable', 'date'],
            'discharge_date' => ['nullable', 'date', 'after_or_equal:admission_date'],
            'claim_type' => ['required', Rule::in([
                'outpatient', 'inpatient', 'dental', 'optical', 'maternity',
                'emergency', 'surgery', 'laboratory', 'radiology', 'drug_refill',
            ])],
            'diagnosis_codes' => ['nullable', 'array'],
            'diagnosis_codes.*' => ['string', 'max:20'],
            'diagnosis_description' => ['nullable', 'string', 'max:500'],
            'is_pre_authorized' => ['nullable', 'boolean'],
            'pre_auth_code' => ['nullable', 'required_if:is_pre_authorized,true', 'string', 'max:50'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.service_code' => ['nullable', 'string', 'max:30'],
            'items.*.service_name' => ['required', 'string', 'max:200'],
            'items.*.category' => ['nullable', Rule::in([
                'consultation', 'procedure', 'laboratory', 'radiology',
                'drug', 'surgery', 'dental', 'optical', 'physiotherapy',
                'maternity', 'emergency',
            ])],
            'items.*.quantity' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $claim = DB::transaction(function () use ($validated, $hcp) {
            $validated['hcp_id'] = $hcp->id; // forced, never from input
            $validated['claim_number'] = Claim::generateUniqueId('CLM', 'claim_number', 6, Auth::user()->branch?->code);
            $validated['submission_date'] = now()->toDateString();
            $validated['source'] = 'provider_portal';

            $claim = Claim::create($validated);

            foreach ($validated['items'] as $item) {
                $tariff = $claim->hcp->activeTariffs()
                    ->where('service_code', $item['service_code'] ?? null)
                    ->orWhere('service_name', 'like', "%{$item['service_name']}%")
                    ->first();

                $claim->items()->create([
                    'tariff_id' => $tariff?->id,
                    'service_code' => $item['service_code'] ?? $tariff?->service_code,
                    'service_name' => $item['service_name'],
                    'category' => $item['category'] ?? $tariff?->category ?? 'consultation',
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price_claimed' => $item['unit_price'],
                    'total_price_claimed' => $item['unit_price'] * ($item['quantity'] ?? 1),
                    'tariff_unit_price' => $tariff?->agreed_price,
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
            'data' => $claim->load(['enrollee', 'items']),
        ], 201);
    }

    /**
     * List this provider's own PA requests.
     */
    public function preAuths(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => []], 200);
        }

        $query = PreAuthorisation::where('hcp_id', $hcp->id)
            ->with(['enrollee:id,first_name,last_name,enrollee_id']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $pas = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => collect($pas->items())->map(fn($pa) => [
                'id' => $pa->id,
                'pa_number' => $pa->pa_number,
                'pa_code' => $pa->pa_code,
                'enrollee_name' => $pa->enrollee ? $pa->enrollee->first_name . ' ' . $pa->enrollee->last_name : null,
                'service_type' => $pa->service_type,
                'urgency' => $pa->urgency,
                'estimated_amount' => $pa->estimated_amount,
                'status' => $pa->status,
                'created_at' => $pa->created_at?->format('Y-m-d H:i'),
            ]),
            'meta' => [
                'current_page' => $pas->currentPage(),
                'last_page' => $pas->lastPage(),
                'total' => $pas->total(),
            ],
        ]);
    }

    /**
     * Submit a new PA request as this provider.
     *
     * Mirrors PreAuthController::store()'s logic (verified from the real
     * controller) - same tiering, same pa_number generation, same event
     * log. hcp_id forced server-side, submission_channel marked distinctly
     * so staff can tell provider-submitted PAs apart from HMO-desk-entered
     * ones in reporting.
     */
    public function storePreAuth(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['message' => 'No provider record linked to this account'], 404);
        }

        if (!in_array($hcp->status->value, ['active', 'accredited'])) {
            return response()->json(['message' => 'This facility is not currently accredited/active.'], 422);
        }

        $validated = $request->validate([
            'enrollee_id' => ['required', 'integer', 'exists:enrollees,id'],
            'dependent_id' => ['nullable', 'integer', 'exists:dependents,id'],
            'service_type' => ['required', 'string', 'max:60'],
            'urgency' => ['required', Rule::in(['standard', 'urgent', 'emergency'])],
            'diagnosis_codes' => ['nullable', 'array'],
            'diagnosis_codes.*' => ['string', 'max:20'],
            'diagnosis_description' => ['required', 'string', 'max:500'],
            'clinical_notes' => ['nullable', 'string', 'max:5000'],
            'estimated_amount' => ['nullable', 'numeric', 'min:0'],
            'admission_date' => ['nullable', 'date'],
            'expected_duration' => ['nullable', 'integer', 'min:1', 'max:365'],
            'attending_doctor' => ['nullable', 'string', 'max:120'],
        ]);

        $enrollee = Enrollee::findOrFail($validated['enrollee_id']);

        if ($enrollee->status->value !== 'active') {
            return response()->json(['message' => 'Enrollee is not active and cannot receive a Pre-Authorisation.'], 422);
        }

        $duplicate = PreAuthorisation::where('enrollee_id', $validated['enrollee_id'])
            ->where('service_type', $validated['service_type'])
            ->whereIn('status', PreAuthorisation::ACTIVE_STATUSES)
            ->first();

        $user = Auth::user();
        $tier = PreAuthorisation::tierFromAmount($validated['estimated_amount'] ?? null);
        $status = $validated['urgency'] === 'emergency' ? 'emergency_retrospective' : 'pending';

        $pa = DB::transaction(function () use ($validated, $user, $hcp, $tier, $status, $duplicate) {
            $pa = PreAuthorisation::create([
                ...$validated,
                'hcp_id' => $hcp->id, // forced, never from input
                'pa_number' => PreAuthorisation::generatePANumber(),
                'branch_id' => $user->branch_id,
                'submitted_by_id' => $user->id,
                'approval_tier' => $tier,
                'status' => $status,
                'submission_channel' => 'provider_portal',
            ]);

            $pa->logEvent(
                'submitted',
                'PA Request Submitted (Provider Portal)',
                $user->id,
                $user->name,
                null,
                $duplicate ? ['duplicate_warning' => "Open PA #{$duplicate->pa_number} exists for same service."] : null
            );

            return $pa;
        });

        return response()->json([
            'message' => 'Pre-authorisation request submitted.',
            'data' => $pa->load(['enrollee', 'hcp']),
            'warning' => $duplicate ? "Note: this enrollee already has an open PA ({$duplicate->pa_number}) for the same service." : null,
        ], 201);
    }

    // ─── [PHASE 3] Tickets ──────────────────────────────────────────────────

    public function tickets(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => []], 200);
        }

        $tickets = Ticket::forHcp($hcp->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $tickets->map(fn($t) => [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'subject' => $t->subject,
                'description' => $t->description,
                'category' => $t->category,
                'priority' => $t->priority,
                'status' => $t->status,
                'created_at' => $t->created_at?->toISOString(),
                'resolution_note' => $t->resolution_note,
                'resolved_at' => $t->resolved_at?->format('Y-m-d'),
            ]),
        ]);
    }

    public function submitTicket(Request $request): JsonResponse
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'required|string|min:20',
            'category' => 'nullable|string',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
        ]);

        $user = $request->user();

        if (!$user->hcp) {
            return response()->json(['message' => 'Provider account not found'], 404);
        }

        $ticket = $this->ticketService->createForUser($user, $request->only(['subject', 'description', 'category', 'priority']));

        return response()->json([
            'message' => 'Ticket submitted successfully',
            'data' => ['id' => $ticket->id, 'ticket_number' => $ticket->ticket_number, 'status' => $ticket->status],
        ], 201);
    }

    public function ticketShow(Request $request, Ticket $ticket): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp || $ticket->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        $ticket->load('publicMessages.user:id,name,user_type');

        return response()->json([
            'data' => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'messages' => $ticket->publicMessages->map(fn($m) => [
                    'id' => $m->id,
                    'sender_type' => $m->sender_type,
                    'message' => $m->message,
                    'created_at' => $m->created_at?->format('Y-m-d H:i'),
                ]),
            ],
        ]);
    }

    public function ticketReply(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate(['message' => 'required|string|min:1|max:2000']);

        $hcp = $request->user()->hcp;

        if (!$hcp || $ticket->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        if (!$ticket->isEditableByRaiser()) {
            return response()->json(['message' => 'This ticket is closed and can no longer be replied to.'], 422);
        }

        $this->ticketService->addMessage($ticket, $request->user(), $request->message);

        return response()->json(['message' => 'Reply sent.']);
    }

    // ─── [PHASE 3] Payments & Reconciliation ────────────────────────────────

    /**
     * Payment status - every disbursement made to this facility, batch by batch.
     */
    public function payments(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = \App\Models\ProviderPayment::where('hcp_id', $hcp->id)
            ->with(['batch:id,batch_number,status,processed_at', 'claim:id,claim_number']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $payments = $query->orderByDesc('created_at')->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => collect($payments->items())->map(fn($p) => [
                'id' => $p->id,
                'claim_number' => $p->claim?->claim_number,
                'batch_number' => $p->batch?->batch_number,
                'amount' => $p->amount,
                'status' => $p->status,
                'payment_reference' => $p->payment_reference,
                'paid_at' => $p->paid_at?->format('Y-m-d'),
            ]),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    /**
     * Reconciliation dashboard - claimed vs approved vs paid, and the gap
     * between them. This is the "don't send emails asking where the money
     * is" screen - every variance is visible and explained by claim status,
     * not a black box.
     */
    public function reconciliation(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => null], 404);
        }

        $totals = Claim::where('hcp_id', $hcp->id)
            ->selectRaw('
                SUM(total_amount_claimed) as total_claimed,
                SUM(total_amount_approved) as total_approved,
                SUM(total_amount_paid) as total_paid,
                COUNT(*) as claim_count
            ')
            ->first();

        $byStatus = Claim::where('hcp_id', $hcp->id)
            ->selectRaw('status, COUNT(*) as count, SUM(total_amount_claimed) as amount')
            ->groupBy('status')
            ->get();

        // Claims approved but not yet paid - the actual "where's my money" list
        $awaitingPayment = Claim::where('hcp_id', $hcp->id)
            ->where('status', 'approved')
            ->whereDoesntHave('payment')
            ->with('enrollee:id,first_name,last_name')
            ->orderBy('approved_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => [
                'total_claimed' => $totals->total_claimed ?? 0,
                'total_approved' => $totals->total_approved ?? 0,
                'total_paid' => $totals->total_paid ?? 0,
                'variance_claimed_vs_approved' => ($totals->total_claimed ?? 0) - ($totals->total_approved ?? 0),
                'variance_approved_vs_paid' => ($totals->total_approved ?? 0) - ($totals->total_paid ?? 0),
                'claim_count' => $totals->claim_count ?? 0,
                'by_status' => $byStatus->map(fn($row) => [
                    'status' => $row->status,
                    'count' => $row->count,
                    'amount' => $row->amount,
                ]),
                'awaiting_payment' => $awaitingPayment->map(fn($c) => [
                    'id' => $c->id,
                    'claim_number' => $c->claim_number,
                    'enrollee_name' => $c->enrollee ? $c->enrollee->first_name . ' ' . $c->enrollee->last_name : null,
                    'total_amount_approved' => $c->total_amount_approved,
                    'approved_at' => $c->approved_at?->format('Y-m-d'),
                ]),
            ],
        ]);
    }
    
    /**
     * [PHASE 8] Verify a member by scanning their ID card QR code instead
     * of typing a member number. The QR payload (base64 JSON, built by
     * EnrolleeCardService::buildQrPayload()) includes a checksum keyed by
     * config('app.key') — a server-only secret, so it CANNOT be verified
     * client-side. This endpoint decodes it and recomputes the checksum
     * server-side using the identical formula, then re-fetches the LIVE
     * enrollee record rather than trusting any cached field in the QR
     * payload itself (plan, status, expiry could all be stale if anything
     * changed since the card was printed).
     */
    public function verifyQrCode(Request $request): JsonResponse
    {
        $request->validate(['qr_data' => 'required|string']);

        $decoded = base64_decode($request->qr_data, true);
        $payload = $decoded ? json_decode($decoded, true) : null;

        if (!$payload || !isset($payload['enrollee_id'], $payload['card_number'], $payload['chk'])) {
            return response()->json(['message' => 'Invalid or unreadable QR code.'], 422);
        }

        $expectedChk = substr(md5($payload['enrollee_id'] . $payload['card_number'] . config('app.key')), 0, 8);

        if (!hash_equals($expectedChk, $payload['chk'])) {
            return response()->json(['message' => 'This card could not be verified. Ask the member to check in manually.'], 422);
        }

        $enrollee = Enrollee::where('enrollee_id', $payload['enrollee_id'])->with('plan')->first();

        if (!$enrollee) {
            return response()->json(['message' => 'Member record not found.'], 404);
        }

        $activeCard = $enrollee->activeCard;
        if (!$activeCard || $activeCard->card_number !== $payload['card_number']) {
            return response()->json(['message' => 'This card has been replaced and is no longer valid. Ask the member for their current card.'], 422);
        }

        return response()->json([
            'data' => [
                'type' => 'principal',
                'id' => $enrollee->id,
                'enrollee_id' => $enrollee->id,
                'full_name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                'member_number' => $enrollee->enrollee_id,
                'plan_name' => $enrollee->plan->plan_name ?? 'N/A',
                'status' => $enrollee->status,
                'expiry_date' => $enrollee->expiry_date?->format('Y-m-d'),
                'benefit_balance' => $enrollee->benefit_balance,
                'can_make_claim' => $enrollee->canMakeClaim(),
                'verified_via' => 'qr_scan',
            ],
        ]);
    }

    // ─── [RESTORED — Phase 2b] Check-in feed ────────────────────────────────
    // Referenced by routes/api.php but missing from this file — the
    // /check-ins routes were 500ing. Restored here.

    public function checkins(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => []], 200);
        }

        \App\Models\HcpCheckin::where('hcp_id', $hcp->id)
            ->where('status', 'pending')
            ->where('created_at', '<', now()->subMinutes(30))
            ->update(['status' => 'expired']);

        $checkins = \App\Models\HcpCheckin::where('hcp_id', $hcp->id)
            ->where('status', 'pending')
            ->with(['enrollee:id,first_name,last_name,enrollee_id', 'dependent:id,first_name,last_name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $checkins->map(fn($c) => [
                'id' => $c->id,
                'member_name' => $c->dependent
                    ? $c->dependent->first_name . ' ' . $c->dependent->last_name
                    : $c->enrollee->first_name . ' ' . $c->enrollee->last_name,
                'member_number' => $c->dependent ? null : $c->enrollee->enrollee_id,
                'checked_in_at' => $c->created_at->format('H:i'),
                'minutes_ago' => $c->created_at->diffInMinutes(now()),
            ]),
        ]);
    }

    public function acknowledgeCheckin(Request $request, \App\Models\HcpCheckin $checkin): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp || $checkin->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Check-in not found'], 404);
        }

        $checkin->update([
            'status' => 'acknowledged',
            'acknowledged_by' => $request->user()->id,
            'acknowledged_at' => now(),
        ]);

        return response()->json(['message' => 'Acknowledged.']);
    }

    // ─── [PHASE 8] Verification Dashboard — appointments feed ───────────────
    // Combines with checkins() above to give the front desk one place to
    // see who's expected AND who's already arrived.

    public function appointments(Request $request): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp) {
            return response()->json(['data' => []], 200);
        }

        $query = \App\Models\Appointment::where('hcp_id', $hcp->id)
            ->with(['enrollee:id,first_name,last_name,enrollee_id', 'dependent:id,first_name,last_name']);

        if ($request->status) {
            $query->where('status', $request->status);
        } else {
            $query->whereIn('status', ['requested', 'confirmed', 'rescheduled']);
        }

        $appointments = $query->orderBy('preferred_date')->get();

        return response()->json([
            'data' => $appointments->map(fn($a) => [
                'id' => $a->id,
                'member_name' => $a->dependent
                    ? $a->dependent->first_name . ' ' . $a->dependent->last_name
                    : ($a->enrollee->first_name . ' ' . $a->enrollee->last_name),
                'member_number' => $a->enrollee->enrollee_id ?? null,
                'preferred_date' => $a->preferred_date?->format('Y-m-d'),
                'preferred_time_slot' => $a->preferred_time_slot,
                'reason' => $a->reason,
                'status' => $a->status,
            ]),
        ]);
    }

    public function confirmAppointment(Request $request, \App\Models\Appointment $appointment): JsonResponse
    {
        $hcp = $request->user()->hcp;

        if (!$hcp || $appointment->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        $request->validate([
            'confirmed_date' => 'required|date',
            'confirmed_time' => 'nullable|string|max:10',
        ]);

        $appointment->update([
            'status' => 'confirmed',
            'confirmed_date' => $request->confirmed_date,
            'confirmed_time' => $request->confirmed_time,
            'confirmed_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Appointment confirmed.']);
    }
}
