<?php

namespace App\Http\Controllers\HCP;

use App\Http\Controllers\Controller;
use App\Http\Requests\HCP\StoreHcpRequest;
use App\Http\Requests\HCP\UpdateHcpRequest;
use App\Http\Requests\HCP\UpdateHcpStatusRequest;
use App\Http\Resources\HcpResource;
use App\Models\HealthCareProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class HCPController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $hcps = HealthCareProvider::query()
            ->with(['branch:id,name,code', 'activeContract'])
            ->withCount(['claims', 'enrollees'])
            ->when($request->search, function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('hcp_code', 'like', "%{$s}%")
                      ->orWhere('nhis_accreditation_no', 'like', "%{$s}%");
                });
            })
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->tier, fn ($q, $t) => $q->where('tier', $t))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->state, fn ($q, $s) => $q->byState($s))
            ->orderBy('name')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => HcpResource::collection($hcps),
            'meta' => [
                'current_page' => $hcps->currentPage(),
                'last_page'    => $hcps->lastPage(),
                'per_page'     => $hcps->perPage(),
                'total'        => $hcps->total(),
            ],
        ]);
    }

    public function store(StoreHcpRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $validated['hcp_code'] = HealthCareProvider::generateUniqueId(
            'HCP-' . strtoupper(substr($validated['type'], 0, 3)),
            'hcp_code',
            4
        );

        $validated['status'] = 'pending'; // New HCPs always start as pending

        $hcp = HealthCareProvider::create($validated);

        return response()->json([
            'message' => 'HCP registered successfully. Status: Pending accreditation.',
            'data'    => new HcpResource($hcp->load('branch')),
        ], 201);
    }

    public function show(HealthCareProvider $hcp): JsonResponse
    {
        $hcp->load([
            'branch:id,name,code',
            'activeContract',
            'activeBankDetail',
            'activeTariffs',
        ])->loadCount(['claims', 'enrollees']);

        return response()->json(['data' => new HcpResource($hcp)]);
    }

    public function update(UpdateHcpRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        $hcp->update($request->validated());

        return response()->json([
            'message' => 'HCP updated.',
            'data'    => new HcpResource($hcp->fresh(['branch', 'activeContract'])),
        ]);
    }

    /**
     * Accredit an HCP — changes status from pending/suspended to active.
     * Route: PATCH /hcps/{hcp}/accredit
     */
    public function accredit(UpdateHcpStatusRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        if ($hcp->status->value === 'active') {
            return response()->json(['message' => 'HCP is already accredited and active.'], 422);
        }

        $hcp->update([
            'status'       => 'active',
            'accredited_at' => $request->effective_date ?? now()->toDateString(),
            'notes'         => $request->reason,
        ]);

        return response()->json([
            'message' => "HCP [{$hcp->name}] accredited and set to active.",
            'data'    => new HcpResource($hcp->fresh()),
        ]);
    }

    /**
     * Blacklist an HCP — requires a documented reason.
     * Route: PATCH /hcps/{hcp}/blacklist
     */
    public function blacklist(UpdateHcpStatusRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        if ($hcp->status->value === 'blacklisted') {
            return response()->json(['message' => 'HCP is already blacklisted.'], 422);
        }

        $hcp->update([
            'status' => 'blacklisted',
            'notes'  => "BLACKLISTED (" . ($request->effective_date ?? now()->toDateString()) . "): {$request->reason}",
        ]);

        return response()->json([
            'message' => "HCP [{$hcp->name}] has been blacklisted.",
            'data'    => new HcpResource($hcp->fresh()),
        ]);
    }

    public function performance(HealthCareProvider $hcp): JsonResponse
    {
        $scores = $hcp->performanceScores()
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->limit(12)
            ->get();

        return response()->json([
            'data' => [
                'current_score' => $hcp->performance_score,
                'history'       => $scores,
            ],
        ]);
    }

    public function paymentHistory(Request $request, HealthCareProvider $hcp): JsonResponse
    {
        $payments = $hcp->payments()
            ->with('batch:id,batch_number,status')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $payments,
            'meta' => [
                'total_paid' => $hcp->payments()->where('status', 'paid')->sum('amount'),
                'pending'    => $hcp->payments()->where('status', 'pending')->sum('amount'),
            ],
        ]);
    }
}