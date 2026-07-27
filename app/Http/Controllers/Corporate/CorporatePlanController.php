<?php
/**
 * FILE: app/Http/Controllers/Corporate/CorporatePlanController.php
 *
 * Manages health plans under a corporate.
 * Routes are nested: /corporates/{corporate}/plans
 *
 * Also handles standalone plan access at /plans for HQ users
 * who need to view/compare plans across corporates.
 */

namespace App\Http\Controllers\Corporate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Plan\StorePlanRequest;
use App\Http\Requests\Plan\UpdatePlanRequest;
use App\Http\Resources\PlanResource;
use App\Models\Corporate;
use App\Models\Plan;
use App\Models\PlanBenefitItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\SystemSetting; 

class CorporatePlanController extends Controller
{
    // ── List plans for a corporate ────────────────────────────────────────────
    public function index(Request $request, Corporate $corporate): JsonResponse
    {
        $plans = Plan::forCorporate($corporate->id)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->tier,   fn ($q, $t) => $q->where('tier', $t))
            ->withCount('enrollees')
            ->orderBy('tier')
            ->orderBy('plan_name')
            ->get();

        return response()->json([
            'data' => PlanResource::collection($plans),
            'meta' => [
                'total'  => $plans->count(),
                'active' => $plans->where('status', 'active')->count(),
            ],
        ]);
    }

    // ── Create a plan ─────────────────────────────────────────────────────────
    public function store(StorePlanRequest $request, Corporate $corporate = null): JsonResponse
    {
        $validated = $request->validated();

        // Check if this is a base plan (no corporate_id)
        $isBasePlan = empty($validated['corporate_id']) && !$corporate;

        // Only HQ can create HMO-wide base plans
        if ($isBasePlan && !$request->user()->hasRole('hq_manager')) {
            return response()->json([
                'message' => 'Only HQ can create an HMO-wide base plan.'
            ], 403);
        }

        $plan = DB::transaction(function () use ($validated, $corporate, $isBasePlan) {
            // Auto-generate plan code if not provided
            if (empty($validated['plan_code'])) {
                $codePrefix = $isBasePlan 
                    ? 'HMO' 
                    : ($corporate->code ?? substr($corporate->name, 0, 4));
                $validated['plan_code'] = Plan::generateCode($codePrefix, $validated['plan_name']);
            }

            // Add default max_dependents from system settings if not provided
            if (!isset($validated['max_dependents'])) {
                $validated['max_dependents'] = SystemSetting::get('financial.max_dependents', 4);
            }

            // For base plans, corporate_id should be explicitly set to null
            if ($isBasePlan) {
                $validated['corporate_id'] = null;
            }

            $planData = [
                ...$validated,
                'created_by' => Auth::id(),
            ];

            // Remove corporate_id from data if it's null (Laravel handles it)
            $plan = ($corporate ?? new Corporate())->plans()->create($planData);

            // Sync benefit items if provided
            if (!empty($validated['benefit_items'])) {
                foreach ($validated['benefit_items'] as $i => $item) {
                    $plan->benefitItems()->create([
                        ...$item,
                        'sort_order' => $item['sort_order'] ?? $i,
                    ]);
                }
            }

            return $plan;
        });

        return response()->json([
            'message' => 'Plan created successfully.',
            'data'    => new PlanResource($plan->load('benefitItems')),
        ], 201);
    }


    // ── Show a single plan ────────────────────────────────────────────────────
    public function show(Corporate $corporate, Plan $plan): JsonResponse
    {
        $this->assertBelongsToCorporate($plan, $corporate);

        $plan->load(['corporate:id,name,code', 'benefitItems', 'createdBy:id,name']);
        $plan->loadCount('enrollees');

        return response()->json(['data' => new PlanResource($plan)]);
    }

    // ── Update a plan ─────────────────────────────────────────────────────────
    public function update(UpdatePlanRequest $request, Corporate $corporate, Plan $plan): JsonResponse
    {
        $this->assertBelongsToCorporate($plan, $corporate);

        // Prevent editing discontinued plans
        if ($plan->status === 'discontinued') {
            return response()->json([
                'message' => 'Discontinued plans cannot be edited. Create a new plan instead.',
            ], 422);
        }

        $plan->update($request->validated());

        return response()->json([
            'message' => 'Plan updated successfully.',
            'data'    => new PlanResource($plan->fresh(['benefitItems'])),
        ]);
    }

    // ── Discontinue a plan (soft logical status change) ───────────────────────
    public function discontinue(Request $request, Corporate $corporate, Plan $plan): JsonResponse
    {
        $this->assertBelongsToCorporate($plan, $corporate);

        if ($plan->enrollee_count > 0) {
            return response()->json([
                'message' => "Cannot discontinue a plan with {$plan->enrollee_count} active enrollees. Transfer or expire enrollees first.",
            ], 422);
        }

        $plan->update(['status' => 'discontinued']);

        return response()->json(['message' => 'Plan discontinued.', 'data' => new PlanResource($plan->fresh())]);
    }

    // ── Duplicate a plan (copy with new name) ─────────────────────────────────
    public function duplicate(Request $request, Corporate $corporate, Plan $plan): JsonResponse
    {
        $this->assertBelongsToCorporate($plan, $corporate);

        $request->validate([
            'plan_name' => ['required', 'string', 'max:150'],
        ]);

        $newPlan = DB::transaction(function () use ($plan, $request, $corporate) {
            $copy = $plan->replicate(['enrollee_count']);
            $copy->plan_name     = $request->plan_name;
            $copy->plan_code     = Plan::generateCode(
                $corporate->code ?? substr($corporate->name, 0, 4),
                $request->plan_name
            );
            $copy->status        = 'active';
            $copy->enrollee_count = 0;
            $copy->created_by    = Auth::id();
            $copy->save();

            // Copy benefit items
            foreach ($plan->benefitItems as $item) {
                $copy->benefitItems()->create($item->only([
                    'benefit_category', 'benefit_name', 'coverage_type',
                    'annual_limit', 'per_visit_limit', 'annual_visit_limit',
                    'requires_preauth', 'waiting_period_days', 'notes', 'sort_order',
                ]));
            }

            return $copy;
        });

        return response()->json([
            'message' => 'Plan duplicated successfully.',
            'data'    => new PlanResource($newPlan->load('benefitItems')),
        ], 201);
    }

    // ── Benefit Items: full sync (replace all items for this plan) ────────────
    public function syncBenefitItems(Request $request, Corporate $corporate, Plan $plan): JsonResponse
    {
        $this->assertBelongsToCorporate($plan, $corporate);

        $request->validate([
            'items'                        => ['required', 'array', 'min:1'],
            'items.*.benefit_category'     => ['required', 'string'],
            'items.*.benefit_name'         => ['required', 'string', 'max:150'],
            'items.*.coverage_type'        => ['required', 'in:covered,not_covered,limited,requires_preauth,copay_applies'],
            'items.*.annual_limit'         => ['nullable', 'numeric', 'min:0'],
            'items.*.per_visit_limit'      => ['nullable', 'numeric', 'min:0'],
            'items.*.annual_visit_limit'   => ['nullable', 'integer', 'min:0'],
            'items.*.requires_preauth'     => ['boolean'],
            'items.*.waiting_period_days'  => ['integer', 'min:0'],
            'items.*.notes'                => ['nullable', 'string'],
            'items.*.sort_order'           => ['integer', 'min:0'],
        ]);

        DB::transaction(function () use ($plan, $request) {
            $plan->benefitItems()->delete();

            foreach ($request->items as $i => $item) {
                $plan->benefitItems()->create([
                    ...$item,
                    'requires_preauth'    => $item['requires_preauth']    ?? false,
                    'waiting_period_days' => $item['waiting_period_days'] ?? 0,
                    'sort_order'          => $item['sort_order']          ?? $i,
                ]);
            }
        });

        return response()->json([
            'message' => 'Benefit items updated.',
            'data'    => new PlanResource($plan->fresh(['benefitItems'])),
        ]);
    }

    // ── Plans across all corporates (HQ only) ─────────────────────────────────
    public function allPlans(Request $request): JsonResponse
    {
        $plans = Plan::with('corporate:id,name,code')
            ->when($request->corporate_id, fn ($q, $id) => $q->where('corporate_id', $id))
            ->when($request->tier,         fn ($q, $t)  => $q->where('tier', $t))
            ->when($request->status,       fn ($q, $s)  => $q->where('status', $s))
            ->withCount('enrollees')
            ->orderBy('corporate_id')
            ->orderBy('tier')
            ->paginate($request->per_page ?? 25);

        return response()->json([
            'data' => PlanResource::collection($plans),
            'meta' => [
                'current_page' => $plans->currentPage(),
                'last_page'    => $plans->lastPage(),
                'per_page'     => $plans->perPage(),
                'total'        => $plans->total(),
            ],
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function assertBelongsToCorporate(Plan $plan, Corporate $corporate): void
    {
        abort_if(
            $plan->corporate_id !== $corporate->id,
            404,
            'Plan not found for this corporate.'
        );
    }

    /**
 * Get all HMO base plans (corporate_id = null)
 */
public function baseIndex(): JsonResponse
{
    $plans = Plan::whereNull('corporate_id')
        ->orderBy('tier')
        ->get();

    return response()->json(['data' => $plans]);
}

/**
 * Create a new HMO base plan
 */
public function baseStore(StorePlanRequest $request): JsonResponse
{
    // Only HQ can create base plans
    if (!$request->user()->hasRole('hq_manager')) {
        return response()->json(['message' => 'Only HQ can create HMO-wide base plans.'], 403);
    }

    $validated = $request->validated();
    $validated['corporate_id'] = null;
    $validated['created_by'] = Auth::id();

    $plan = Plan::create($validated);

    return response()->json([
        'message' => 'Base plan created successfully.',
        'data' => $plan,
    ], 201);
}

/**
 * Update an HMO base plan
 */
public function baseUpdate(StorePlanRequest $request, Plan $plan): JsonResponse
{
    if ($plan->corporate_id !== null) {
        return response()->json(['message' => 'Not a base plan.'], 404);
    }

    $plan->update($request->validated());

    return response()->json([
        'message' => 'Base plan updated successfully.',
        'data' => $plan,
    ]);
}

/**
 * Delete an HMO base plan
 */
public function baseDestroy(Plan $plan): JsonResponse
{
    if ($plan->corporate_id !== null) {
        return response()->json(['message' => 'Not a base plan.'], 404);
    }

    $plan->delete();

    return response()->json(['message' => 'Base plan deleted successfully.']);
}

}