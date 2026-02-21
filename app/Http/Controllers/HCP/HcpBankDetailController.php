<?php

namespace App\Http\Controllers\HCP;

use App\Http\Controllers\Controller;
use App\Http\Requests\HCP\StoreBankDetailRequest;
use App\Http\Resources\HcpResource;
use App\Models\HcpBankDetail;
use App\Models\HealthCareProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * HcpBankDetailController
 *
 * Manages bank accounts for Health Care Providers.
 * An HCP may have multiple bank details on file, but only one is "active"
 * (used for payment processing). The `verify` action marks a bank account
 * as verified and sets it as the active account for the HCP.
 *
 * Routes (nested under /hcps/{hcp}/):
 *   GET    /hcps/{hcp}/bank-details              → index()
 *   POST   /hcps/{hcp}/bank-details              → store()
 *   PATCH  /hcps/{hcp}/bank-details/{bd}/verify  → verify()
 *   DELETE /hcps/{hcp}/bank-details/{bd}         → destroy()
 *
 * Permission required: hcps.bank_details
 */
class HcpBankDetailController extends Controller
{
    /**
     * List all bank accounts on file for this HCP.
     * Ordered by created_at descending so the newest appears first.
     */
    public function index(HealthCareProvider $hcp): JsonResponse
    {
        $bankDetails = $hcp->bankDetails()
            ->orderByDesc('is_verified')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($b) => [
                'id'             => $b->id,
                'bank_name'      => $b->bank_name,
                'account_name'   => $b->account_name,
                'account_number' => $b->account_number,
                'bank_code'      => $b->bank_code,
                'account_type'   => $b->account_type,
                'is_verified'    => $b->is_verified,
                'verified_at'    => $b->verified_at?->toISOString(),
                'verified_by'    => $b->verifiedBy ? [
                    'id'   => $b->verifiedBy->id,
                    'name' => $b->verifiedBy->name,
                ] : null,
                'created_at'     => $b->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $bankDetails]);
    }

    /**
     * Add a new bank account for the HCP.
     * Does not automatically make it active — must be verified first.
     */
    public function store(StoreBankDetailRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        $bankDetail = $hcp->bankDetails()->create([
            'bank_name'      => $request->bank_name,
            'account_name'   => $request->account_name,
            'account_number' => $request->account_number,
            'bank_code'      => $request->bank_code,
            'account_type'   => $request->account_type ?? 'current',
            'is_verified'    => false,
            'added_by'       => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Bank account added. It must be verified before it can be used for payments.',
            'data'    => [
                'id'             => $bankDetail->id,
                'bank_name'      => $bankDetail->bank_name,
                'account_name'   => $bankDetail->account_name,
                'account_number' => $bankDetail->account_number,
                'account_type'   => $bankDetail->account_type,
                'is_verified'    => $bankDetail->is_verified,
            ],
        ], 201);
    }

    /**
     * Verify a bank account and set it as the active (primary) payment account.
     *
     * Only one account can be active at a time.
     * Verifying a new account deactivates (un-verifies) all others for this HCP.
     * This action is irreversible via the API — to change, verify a different account.
     */
    public function verify(HealthCareProvider $hcp, HcpBankDetail $bankDetail): JsonResponse
    {
        abort_unless($bankDetail->hcp_id === $hcp->id, 404);

        // Deactivate all other bank accounts for this HCP
        $hcp->bankDetails()
            ->where('id', '!=', $bankDetail->id)
            ->update(['is_verified' => false, 'verified_at' => null, 'verified_by' => null]);

        // Mark this one as verified and active
        $bankDetail->update([
            'is_verified' => true,
            'verified_at' => now(),
            'verified_by' => Auth::id(),
        ]);

        return response()->json([
            'message' => "Bank account {$bankDetail->account_number} verified and set as active payment account for {$hcp->name}.",
            'data'    => [
                'id'             => $bankDetail->id,
                'bank_name'      => $bankDetail->bank_name,
                'account_name'   => $bankDetail->account_name,
                'account_number' => $bankDetail->account_number,
                'is_verified'    => true,
                'verified_at'    => now()->toISOString(),
            ],
        ]);
    }

    /**
     * Remove a bank account from the HCP's records.
     * Cannot delete the currently active (verified) account if it's the only one.
     * Deleting the active account will leave the HCP with no active payment method.
     */
    public function destroy(HealthCareProvider $hcp, HcpBankDetail $bankDetail): JsonResponse
    {
        abort_unless($bankDetail->hcp_id === $hcp->id, 404);

        if ($bankDetail->is_verified) {
            $otherAccountExists = $hcp->bankDetails()
                ->where('id', '!=', $bankDetail->id)
                ->where('is_verified', true)
                ->exists();

            if (! $otherAccountExists) {
                return response()->json([
                    'message' => 'Cannot delete the only active bank account. Please add and verify a new account first.',
                ], 422);
            }
        }

        $bankDetail->delete();

        return response()->json(['message' => 'Bank account removed.']);
    }
}