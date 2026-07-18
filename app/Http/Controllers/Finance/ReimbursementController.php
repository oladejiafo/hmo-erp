<?php
/**
 * NEW FILE — app/Http/Controllers/Finance/ReimbursementController.php
 *
 * Staff-facing side of Phase 1's reimbursement flow. Mirrors the shape of
 * your PaymentBatchController approve/reject pattern rather than inventing
 * something new. Deliberately thin for Phase 1 — no partial-approval
 * workflow yet, just approve-with-amount / reject / mark-paid.
 *
 * ASSUMPTION FLAGGED: permission slugs 'reimbursements.view' and
 * 'reimbursements.review' are NOT yet in your permissions seeder — this
 * needs adding (Spatie permission create) before these routes will resolve
 * for any role. I can't see your seeder from here to add it directly.
 */

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Enums\ReimbursementStatus;
use App\Models\ReimbursementRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReimbursementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ReimbursementRequest::with(['enrollee', 'dependent', 'claim']);

        if ($request->status) {
            $query->byStatus($request->status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => collect($requests->items())->map(fn($r) => [
                'id' => $r->id,
                'reimbursement_number' => $r->reimbursement_number,
                'enrollee_name' => $r->enrollee->first_name . ' ' . $r->enrollee->last_name,
                'claim_number' => $r->claim->claim_number ?? null,
                'amount_requested' => $r->amount_requested,
                'amount_approved' => $r->amount_approved,
                'status' => $r->status,
                'created_at' => $r->created_at?->format('Y-m-d'),
            ]),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    public function show(ReimbursementRequest $reimbursement): JsonResponse
    {
        $reimbursement->load(['enrollee', 'dependent', 'claim', 'reviewer']);

        return response()->json(['data' => $reimbursement]);
    }

    public function approve(Request $request, ReimbursementRequest $reimbursement): JsonResponse
    {
        $request->validate([
            'amount_approved' => 'required|numeric|min:1|lte:' . $reimbursement->amount_requested,
            'notes' => 'nullable|string|max:1000',
        ]);

        $reimbursement->update([
            'status' => ReimbursementStatus::APPROVED,
            'amount_approved' => $request->amount_approved,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'reviewer_notes' => $request->notes,
        ]);

        return response()->json(['message' => 'Reimbursement approved.', 'data' => $reimbursement]);
    }

    public function reject(Request $request, ReimbursementRequest $reimbursement): JsonResponse
    {
        $request->validate([
            'notes' => 'required|string|min:5|max:1000',
        ]);

        $reimbursement->update([
            'status' => ReimbursementStatus::REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'reviewer_notes' => $request->notes,
        ]);

        return response()->json(['message' => 'Reimbursement rejected.', 'data' => $reimbursement]);
    }

    public function markPaid(Request $request, ReimbursementRequest $reimbursement): JsonResponse
    {
        $request->validate([
            'payment_reference' => 'required|string|max:100',
        ]);

        if ($reimbursement->status !== ReimbursementStatus::APPROVED) {
            return response()->json(['message' => 'Only approved reimbursements can be marked paid.'], 422);
        }

        $reimbursement->update([
            'status' => ReimbursementStatus::PAID,
            'paid_at' => now(),
            'payment_reference' => $request->payment_reference,
        ]);

        return response()->json(['message' => 'Reimbursement marked as paid.', 'data' => $reimbursement]);
    }
}
