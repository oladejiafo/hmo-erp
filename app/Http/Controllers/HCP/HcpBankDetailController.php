<?php

namespace App\Http\Controllers\HCP;

use App\Http\Controllers\Controller;
use App\Http\Requests\HCP\StoreBankDetailRequest;
use App\Models\HcpBankDetail;
use App\Models\HealthCareProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * HcpBankDetailController
 *
 * MAKER-CHECKER SECURITY PATTERN:
 *
 * The following two-person rule is strictly enforced:
 *   1. User A (maker)   → adds a bank account via store()
 *                         → record is created with is_verified = false
 *                         → NO payments can be made to this account yet
 *
 *   2. User B (checker) → a DIFFERENT user reviews and calls verify()
 *                         → User B CANNOT be the same as User A
 *                         → Only after verify() can this account receive payments
 *
 * This prevents a single rogue or compromised finance officer from redirecting
 * HCP payments to a fraudulent account without a second person's approval.
 *
 * ROUTES (nested under /hcps/{hcp}/):
 *   GET    bank-details                  → index()   [hcps.bank_details]
 *   POST   bank-details                  → store()   [hcps.bank_details]
 *   PATCH  bank-details/{bd}/verify      → verify()  [hcps.bank_details_verify]  ← separate permission
 *   DELETE bank-details/{bd}             → destroy() [hcps.bank_details]
 */
class HcpBankDetailController extends Controller
{
    /**
     * List all bank accounts for this HCP.
     *
     * Shows verification status and who added/verified each record.
     * This gives audit visibility into the full maker-checker trail.
     */
    public function index(HealthCareProvider $hcp): JsonResponse
    {
        $bankDetails = $hcp->bankDetails()
            ->with(['addedBy:id,name', 'verifiedBy:id,name'])
            ->orderByDesc('is_verified')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($b) => [
                'id'             => $b->id,
                'bank_name'      => $b->bank_name,
                'bank_code'      => $b->bank_code,
                'account_name'   => $b->account_name,
                'account_number' => $b->account_number,   // full number for authorized finance users
                'account_type'   => $b->account_type,
                'sort_code'      => $b->sort_code,
                'is_verified'    => $b->is_verified,
                'status_label'   => $b->is_verified ? 'Verified — Active for payments' : 'Pending verification',
                'added_by'       => $b->addedBy
                    ? ['id' => $b->addedBy->id, 'name' => $b->addedBy->name]
                    : null,
                'verified_by'    => $b->verifiedBy
                    ? ['id' => $b->verifiedBy->id, 'name' => $b->verifiedBy->name]
                    : null,
                'verified_at'    => $b->verified_at?->toISOString(),
                'created_at'     => $b->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $bankDetails]);
    }

    /**
     * Add a new bank account for the HCP (MAKER step).
     *
     * The account is created with is_verified = false.
     * It CANNOT be used for payments until a DIFFERENT user calls verify().
     *
     * The current user is recorded as added_by for the maker-checker audit trail.
     */
    public function store(StoreBankDetailRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        $bankDetail = $hcp->bankDetails()->create([
            'bank_name'      => $request->bank_name,
            'bank_code'      => $request->bank_code,
            'account_name'   => $request->account_name,
            'account_number' => $request->account_number,
            'account_type'   => $request->account_type ?? 'current',
            'sort_code'      => $request->sort_code,
            'is_verified'    => false,          // ALWAYS starts unverified
            'added_by'       => $request->user()->id,  // record the maker
            'verified_by'    => null,
            'verified_at'    => null,
        ]);

        Log::info('HCP bank detail added — pending verification', [
            'hcp_id'         => $hcp->id,
            'hcp_name'       => $hcp->name,
            'bank_detail_id' => $bankDetail->id,
            'account_number' => '****' . substr($bankDetail->account_number, -4),
            'added_by'       => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Bank account added and is pending verification. A different user must verify it before payments can be processed.',
            'data'    => [
                'id'             => $bankDetail->id,
                'bank_name'      => $bankDetail->bank_name,
                'account_name'   => $bankDetail->account_name,
                'account_number' => $bankDetail->account_number,
                'account_type'   => $bankDetail->account_type,
                'is_verified'    => false,
                'status_label'   => 'Pending verification',
            ],
        ], 201);
    }

    /**
     * Verify a bank account (CHECKER step) — requires hcps.bank_details_verify permission.
     *
     * MAKER-CHECKER ENFORCEMENT:
     *   The user calling this endpoint MUST be different from the user who added the record.
     *   If they are the same person, the request is rejected with 403.
     *
     * When verified:
     *   - This account becomes the single active payment account for the HCP
     *   - All other bank accounts for this HCP are de-verified
     *   - Payments in future batches will use this account
     */
    public function verify(HealthCareProvider $hcp, HcpBankDetail $bankDetail): JsonResponse
    {
        // Ensure the bank detail belongs to this HCP
        abort_unless($bankDetail->hcp_id === $hcp->id, 404);

        // ── MAKER-CHECKER CORE CHECK ──────────────────────────────────────────
        // The verifier MUST be a different person from whoever added the record.
        if ($bankDetail->wasAddedBy(request()->user()->id)) {
            return response()->json([
                'message' => 'Maker-checker violation: you cannot verify a bank account that you submitted. A different authorised user must perform this verification.',
            ], 403);
        }

        // Already verified — idempotent but informative
        if ($bankDetail->is_verified) {
            return response()->json([
                'message'    => 'This bank account is already verified.',
                'data'       => $this->formatDetail($bankDetail),
            ]);
        }

        // ── De-verify all other accounts for this HCP ─────────────────────────
        // Only one account can be the active payment account at a time.
        $deactivatedCount = $hcp->bankDetails()
            ->where('id', '!=', $bankDetail->id)
            ->where('is_verified', true)
            ->count();

        $hcp->bankDetails()
            ->where('id', '!=', $bankDetail->id)
            ->update([
                'is_verified' => false,
                'verified_at' => null,
                'verified_by' => null,
            ]);

        // ── Mark this account as verified ─────────────────────────────────────
        $bankDetail->update([
            'is_verified' => true,
            'verified_at' => now(),
            'verified_by' => request()->user()->id,
        ]);

        Log::info('HCP bank detail verified — now active for payments', [
            'hcp_id'              => $hcp->id,
            'hcp_name'            => $hcp->name,
            'bank_detail_id'      => $bankDetail->id,
            'account_number'      => '****' . substr($bankDetail->account_number, -4),
            'added_by'            => $bankDetail->added_by,
            'verified_by'         => request()->user()->id,
            'previous_deactivated'=> $deactivatedCount,
        ]);

        return response()->json([
            'message' => "Bank account verified and set as the active payment account for {$hcp->name}."
                . ($deactivatedCount > 0 ? " {$deactivatedCount} previous account(s) de-activated." : ''),
            'data'    => $this->formatDetail($bankDetail->refresh()),
        ]);
    }

    /**
     * Delete a bank account from the HCP's records.
     *
     * Cannot delete the only verified (active) account — doing so would leave
     * the HCP unable to receive payments. Add and verify a replacement first.
     */
    public function destroy(HealthCareProvider $hcp, HcpBankDetail $bankDetail): JsonResponse
    {
        abort_unless($bankDetail->hcp_id === $hcp->id, 404);

        if ($bankDetail->is_verified) {
            // Allow deletion only if there's another verified account ready
            $otherVerifiedExists = $hcp->bankDetails()
                ->where('id', '!=', $bankDetail->id)
                ->where('is_verified', true)
                ->exists();

            if (! $otherVerifiedExists) {
                return response()->json([
                    'message' => 'Cannot delete the only active (verified) bank account. Add and verify a replacement account first.',
                ], 422);
            }
        }

        Log::info('HCP bank detail deleted', [
            'hcp_id'         => $hcp->id,
            'bank_detail_id' => $bankDetail->id,
            'was_verified'   => $bankDetail->is_verified,
            'deleted_by'     => request()->user()->id,
        ]);

        $bankDetail->delete();

        return response()->json(['message' => 'Bank account removed.']);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function formatDetail(HcpBankDetail $b): array
    {
        return [
            'id'             => $b->id,
            'bank_name'      => $b->bank_name,
            'account_name'   => $b->account_name,
            'account_number' => $b->account_number,
            'account_type'   => $b->account_type,
            'is_verified'    => $b->is_verified,
            'verified_at'    => $b->verified_at?->toISOString(),
            'verified_by'    => $b->verifiedBy
                ? ['id' => $b->verifiedBy->id, 'name' => $b->verifiedBy->name]
                : null,
            'added_by'       => $b->addedBy
                ? ['id' => $b->addedBy->id, 'name' => $b->addedBy->name]
                : null,
        ];
    }
}