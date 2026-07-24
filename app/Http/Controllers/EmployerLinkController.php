<?php
/**
 * NEW FILE — app/Http/Controllers/EmployerLinkController.php
 *
 * The gap this fills: HR-added employees (via CorporatePortalController::
 * addEnrollee() or BulkEnrolleeImportService) never get a User account -
 * checked both files, neither calls User::create(). This is genuinely the
 * only path that creates login access for someone whose employer already
 * enrolled them.
 *
 * Security shape: two-factor identity match (email OR staff_id, AND date
 * of birth) against an EXISTING Enrollee row that has no user_id yet.
 * Nobody can claim an account by guessing a company name, they need to
 * already be in that company's HR-submitted roster with matching DOB.
 */

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Corporate;
use App\Models\Enrollee;
use App\Models\User;
use App\Services\EnrolleeCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployerLinkController extends Controller
{
    public function __construct(private EnrolleeCardService $cardService) {}

    /**
     * Public search - name/industry only, nothing internal (no code,
     * branch, contract dates). Excludes the reserved Retail pseudo-corporate.
     */
    public function searchEmployers(Request $request): JsonResponse
    {
        $request->validate(['q' => 'required|string|min:2|max:100']);

        $corporates = Corporate::where('name', 'like', "%{$request->q}%")
            ->where('code', '!=', 'RETAIL-001')
            ->where('status', 'active')
            ->limit(15)
            ->get(['id', 'name', 'industry', 'city']);

        return response()->json(['data' => $corporates]);
    }

    /**
     * Step 1: verify identity against an existing, unlinked Enrollee row.
     * Doesn't create anything yet, just confirms a match exists so the
     * frontend can show "Is this you?" before asking for a password.
     */
    public function verifyIdentity(Request $request): JsonResponse
    {
        $request->validate([
            'corporate_id' => 'required|integer|exists:corporates,id',
            'identifier' => 'required|string',
            'date_of_birth' => 'required|date',
        ]);

        $enrollee = Enrollee::where('corporate_id', $request->corporate_id)
            ->where(function ($q) use ($request) {
                $q->where('email', $request->identifier)
                  ->orWhere('staff_id', $request->identifier);
            })
            ->whereDate('date_of_birth', $request->date_of_birth)
            ->whereNull('user_id')
            ->first();

        if (! $enrollee) {
            return response()->json(['message' => 'We could not find a matching record. Check your details or contact your HR team.'], 404);
        }

        return response()->json([
            'message' => 'Match found.',
            'data' => [
                'enrollee_token' => encrypt($enrollee->id),
                'first_name' => $enrollee->first_name,
                'last_name' => $enrollee->last_name,
                'plan_name' => $enrollee->plan?->plan_name,
            ],
        ]);
    }

    /**
     * Step 2: create the actual User account and link it. This is the
     * moment login access is created for the first time for this person.
     */
    public function claimAccount(Request $request): JsonResponse
    {
        $request->validate([
            'enrollee_token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        try {
            $enrolleeId = decrypt($request->enrollee_token);
        } catch (\Exception $e) {
            return response()->json(['message' => 'This verification has expired. Please search again.'], 422);
        }

        $enrollee = Enrollee::whereNull('user_id')->find($enrolleeId);

        if (! $enrollee) {
            return response()->json(['message' => 'This account has already been claimed or no longer exists.'], 422);
        }

        if (User::where('email', $enrollee->email)->exists()) {
            return response()->json(['message' => 'An account with this email already exists. Try logging in instead.'], 422);
        }

        DB::transaction(function () use ($enrollee, $request) {
            $user = User::create([
                'name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                'email' => $enrollee->email,
                'password' => Hash::make($request->password),
                'branch_id' => $enrollee->branch_id,
                'user_type' => 'enrollee_user',
                'status' => 'active',
                'password_changed_at' => now(),
            ]);

            $user->assignRole('enrollee_user');
            $user->givePermissionTo('portal.enrollee.access');

            $enrollee->update(['user_id' => $user->id]);

            if (! $enrollee->activeCard) {
                $this->cardService->issue($enrollee, null, 'Self-service account linked to employer plan');
            }
        });

        return response()->json(['message' => 'Account created. You can now log in.']);
    }
}
