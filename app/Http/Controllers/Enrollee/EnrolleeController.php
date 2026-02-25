<?php

namespace App\Http\Controllers\Enrollee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Enrollee\StoreEnrolleeRequest;
use App\Http\Requests\Enrollee\TransferEnrolleeRequest;
use App\Http\Requests\Enrollee\UpdateEnrolleeRequest;
use App\Http\Resources\ClaimResource;
use App\Http\Resources\EnrolleeCardResource;
use App\Http\Resources\EnrolleeResource;
use App\Models\Branch;
use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\EnrolleeTransferLog;
use App\Services\EnrolleeCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Mail\EnrolleeWelcomeMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class EnrolleeController extends Controller
{
    
    public function __construct(
        protected EnrolleeCardService $cardService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $enrollees = Enrollee::query()
            ->with(['corporate:id,name,code', 'branch:id,name,code', 'primaryHcp:id,name'])
            ->when($request->search, function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('first_name', 'like', "%{$s}%")
                      ->orWhere('last_name', 'like', "%{$s}%")
                      ->orWhere('enrollee_id', 'like', "%{$s}%")
                      ->orWhere('email', 'like', "%{$s}%")
                      ->orWhere('phone', 'like', "%{$s}%")
                      ->orWhere('staff_id', 'like', "%{$s}%");
                });
            })
            ->when($request->corporate_id, fn ($q, $id) => $q->where('corporate_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->gender, fn ($q, $g) => $q->where('gender', $g))
            ->when($request->expired, fn ($q) => $q->expired())
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => EnrolleeResource::collection($enrollees),
            'meta' => [
                'current_page' => $enrollees->currentPage(),
                'last_page'    => $enrollees->lastPage(),
                'per_page'     => $enrollees->perPage(),
                'total'        => $enrollees->total(),
            ],
        ]);
    }

    public function store(StoreEnrolleeRequest $request): JsonResponse
    {
        $validated = $request->validated();
    
        $enrollee = DB::transaction(function () use ($validated) {
            // Generate unique enrollee ID
            $validated['enrollee_id'] = Enrollee::generateUniqueId(
                config('hmo.enrollee_id_prefix', 'HMO'),
                'enrollee_id',
                6
            );
    
            // Create enrollee
            $enrollee = Enrollee::create($validated);
    
            // Auto-issue digital card on enrollment
            $this->cardService->issue($enrollee, Auth::id());
    
            // 🔥 AUTO-CREATE USER ACCOUNT for portal access
            $tempPassword = Str::random(10); // Generate random password
            $user = User::create([
                'name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                'email' => $enrollee->email,
                'password' => Hash::make($tempPassword),
                'branch_id' => $enrollee->branch_id,
                'user_type' => 'enrollee_user',
                'enrollee_id' => $enrollee->id,
                'status' => 'active',
                'password_changed_at' => null, // Force password change on first login
            ]);
    
            // Assign enrollee role
            $user->assignRole('enrollee_user');
    
            // Grant portal access permission
            $user->givePermissionTo('portal.enrollee.access');
    
            // Send welcome email with login credentials
            try {
                Mail::to($enrollee->email)->send(new EnrolleeWelcomeMail($enrollee, $tempPassword));
            } catch (\Exception $e) {
                Log::error('Failed to send welcome email: ' . $e->getMessage());
            }
    
            return $enrollee;
        });
    
        return response()->json([
            'message' => 'Enrollee registered successfully. Digital card issued. Login credentials sent to email.',
            'data'    => new EnrolleeResource(
                $enrollee->load(['corporate', 'branch', 'activeCard', 'plan'])
            ),
        ], 201);
    }

    public function storeXX(StoreEnrolleeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $enrollee = DB::transaction(function () use ($validated) {
            // Generate unique enrollee ID
            $validated['enrollee_id'] = Enrollee::generateUniqueId(
                config('hmo.enrollee_id_prefix', 'HMO'),
                'enrollee_id',
                6
            );

            $enrollee = Enrollee::create($validated);

            // Auto-issue digital card on enrollment
            $this->cardService->issue($enrollee, Auth::id());

            return $enrollee;
        });

        return response()->json([
            'message' => 'Enrollee registered successfully. Digital card issued.',
            'data'    => new EnrolleeResource(
                $enrollee->load(['corporate', 'branch', 'activeCard', 'plan'])
            ),
        ], 201);
    }

    public function show(Enrollee $enrollee): JsonResponse
    {
        $enrollee->load([
            'corporate:id,name,code',
            'branch:id,name,code',
            'plan',
            'primaryHcp:id,name,type,phone',
            'activeDependents',
            'activeCard',
        ]);

        return response()->json(['data' => new EnrolleeResource($enrollee)]);
    }

    public function update(UpdateEnrolleeRequest $request, Enrollee $enrollee): JsonResponse
    {
        $enrollee->update($request->validated());

        return response()->json([
            'message' => 'Enrollee updated successfully.',
            'data'    => new EnrolleeResource($enrollee->fresh(['corporate', 'branch', 'plan'])),
        ]);
    }

    public function suspend(Request $request, Enrollee $enrollee): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $newStatus = $enrollee->status->value === 'active' ? 'suspended' : 'active';
        $enrollee->update(['status' => $newStatus]);

        return response()->json([
            'message' => "Enrollee {$newStatus}.",
            'data'    => new EnrolleeResource($enrollee->fresh()),
        ]);
    }

    /**
     * Transfer enrollee from one branch to another.
     * Requires HQ approval — creates a pending transfer log.
     */
    public function transfer(TransferEnrolleeRequest $request, Enrollee $enrollee): JsonResponse
    {
        $toBranch = Branch::findOrFail($request->to_branch_id);

        if ($enrollee->branch_id === $toBranch->id) {
            return response()->json([
                'message' => 'Enrollee is already in the target branch.',
            ], 422);
        }

        $transferLog = DB::transaction(function () use ($enrollee, $toBranch, $request) {
             /** @disregard P1013 */
            $requestedBy = Auth::id();

            /** @disregard P1013 */
            $status = Auth::user()->isHQ() ? 'approved' : 'pending';

            $log = EnrolleeTransferLog::create([
                'enrollee_id'    => $enrollee->id,
                'from_branch_id' => $enrollee->branch_id,
                'to_branch_id'   => $toBranch->id,
                'reason'         => $request->reason,
                'requested_by'   => $requestedBy,
                'status'         => $status,
            ]);

            // HQ users can auto-approve transfers
            /** @disregard P1013 */
            if (Auth::user()->isHQ()) {
                $enrollee->update([
                    'branch_id' => $toBranch->id,
                ]);

                $log->update([
                    'approved_by' => Auth::id(),
                    'approved_at' => now(),
                ]);
            }

            return $log;
        });
        /** @disregard P1013 */
        $message = Auth::user()->isHQ()
            ? "Enrollee transferred to {$toBranch->name}."
            : "Transfer request submitted. Awaiting HQ approval.";

        return response()->json([
            'message'      => $message,
            'transfer_log' => $transferLog,
        ]);
    }

    public function claimsHistory(Request $request, Enrollee $enrollee): JsonResponse
    {
        $claims = Claim::withoutGlobalScopes()
            ->where('enrollee_id', $enrollee->id)
            ->with(['hcp:id,name', 'items'])
            ->when($request->year, fn ($q, $y) => $q->whereYear('service_date', $y))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('service_date')
            ->paginate(15);

        return response()->json([
            'data' => ClaimResource::collection($claims),
            'meta' => [
                'current_page' => $claims->currentPage(),
                'last_page'    => $claims->lastPage(),
                'total'        => $claims->total(),
            ],
        ]);
    }

    public function card(Enrollee $enrollee): JsonResponse
    {
        $card = $enrollee->activeCard;

        if (! $card) {
            return response()->json(['message' => 'No active card found for this enrollee.'], 404);
        }

        return response()->json(['data' => new EnrolleeCardResource($card)]);
    }

    public function regenerateCard(Request $request, Enrollee $enrollee): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:255',
                         'in:lost,damaged,expired,security_concern,first_issuance'],
        ]);

        $card = $this->cardService->issue($enrollee, Auth::id(), $request->reason);

        return response()->json([
            'message' => 'New digital card issued successfully.',
            'data'    => new EnrolleeCardResource($card),
        ]);
    }

    public function benefitSummary(Enrollee $enrollee): JsonResponse
    {
        $enrollee->load('plan');

        $yearlyUsed = Claim::withoutGlobalScopes()
            ->where('enrollee_id', $enrollee->id)
            ->whereYear('service_date', now()->year)
            ->whereNotIn('status', ['rejected', 'reversed'])
            ->sum('total_amount_approved');

        return response()->json([
            'data' => [
                'enrollee_id'      => $enrollee->enrollee_id,
                'plan_name'        => $enrollee->plan?->plan_name,
                'max_benefit'      => $enrollee->plan?->max_benefit_value ?? 0,
                'used_this_year'   => $yearlyUsed,
                'remaining_balance' => $enrollee->benefit_balance,
                'expiry_date'      => $enrollee->expiry_date?->format('Y-m-d'),
                'is_expired'       => $enrollee->isPlanExpired(),
            ],
        ]);
    }
}