<?php

namespace App\Http\Controllers\Corporate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Corporate\StoreCorporatePlanRequest;
use App\Http\Requests\Corporate\UpdateCorporatePlanRequest;
use App\Http\Resources\CorporatePlanResource;
use App\Models\Corporate;
use App\Models\CorporatePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CorporatePlanController extends Controller
{
    /**
     * Get all plans for a corporate
     * 
     * @param Request $request
     * @param Corporate $corporate
     * @return JsonResponse
     */
    public function index(Request $request, Corporate $corporate): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.view');
        
        $plans = $corporate->plans()
            ->when($request->active !== null, fn($q, $a) => $q->where('is_active', $a))
            ->orderBy('name')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => CorporatePlanResource::collection($plans),
            'meta' => [
                'current_page' => $plans->currentPage(),
                'last_page' => $plans->lastPage(),
                'per_page' => $plans->perPage(),
                'total' => $plans->total(),
            ],
        ]);
    }

    /**
     * Create a new plan for a corporate
     * 
     * @param StoreCorporatePlanRequest $request
     * @param Corporate $corporate
     * @return JsonResponse
     */
    public function store(StoreCorporatePlanRequest $request, Corporate $corporate): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.edit');
        
        $plan = $corporate->plans()->create([
            'name' => $request->name,
            'code' => $request->code ?? $this->generatePlanCode($corporate, $request->name),
            'description' => $request->description,
            'premium_amount' => $request->premium_amount,
            'max_benefit' => $request->max_benefit,
            'max_dependents' => $request->max_dependents,
            'coverage_type' => $request->coverage_type,
            'covered_services' => $request->covered_services,
            'exclusions' => $request->exclusions,
            'waiting_period_days' => $request->waiting_period_days ?? 0,
            'is_active' => $request->is_active ?? true,
            'effective_from' => $request->effective_from,
            'effective_to' => $request->effective_to,
        ]);

        return response()->json([
            'message' => 'Plan created successfully',
            'data' => new CorporatePlanResource($plan),
        ], 201);
    }

    /**
     * Get a specific plan
     * 
     * @param Corporate $corporate
     * @param CorporatePlan $plan
     * @return JsonResponse
     */
    public function show(Corporate $corporate, CorporatePlan $plan): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.view');
        
        // Ensure plan belongs to corporate
        if ($plan->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Plan not found for this corporate'], 404);
        }

        return response()->json([
            'data' => new CorporatePlanResource($plan->load('enrollees')),
        ]);
    }

    /**
     * Update a plan
     * 
     * @param UpdateCorporatePlanRequest $request
     * @param Corporate $corporate
     * @param CorporatePlan $plan
     * @return JsonResponse
     */
    public function update(UpdateCorporatePlanRequest $request, Corporate $corporate, CorporatePlan $plan): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.edit');
        
        // Ensure plan belongs to corporate
        if ($plan->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Plan not found for this corporate'], 404);
        }

        $plan->update($request->validated());

        return response()->json([
            'message' => 'Plan updated successfully',
            'data' => new CorporatePlanResource($plan),
        ]);
    }

    /**
     * Delete a plan (only if no enrollees)
     * 
     * @param Corporate $corporate
     * @param CorporatePlan $plan
     * @return JsonResponse
     */
    public function destroy(Corporate $corporate, CorporatePlan $plan): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('corporates.edit');
        
        // Ensure plan belongs to corporate
        if ($plan->corporate_id !== $corporate->id) {
            return response()->json(['message' => 'Plan not found for this corporate'], 404);
        }

        if ($plan->enrollees()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete plan with active enrollees. Deactivate it instead.'
            ], 422);
        }

        $plan->delete();

        return response()->json([
            'message' => 'Plan deleted successfully',
        ]);
    }

    /**
     * Generate a unique plan code
     */
    protected function generatePlanCode(Corporate $corporate, string $name): string
    {
        $prefix = strtoupper(substr($corporate->code, 0, 3));
        $namePart = strtoupper(preg_replace('/[^A-Z]/', '', substr($name, 0, 3)));
        $base = $prefix . '-' . $namePart;
        $counter = 1;
        $code = $base . '-' . str_pad($counter, 3, '0', STR_PAD_LEFT);
        
        while (CorporatePlan::where('code', $code)->exists()) {
            $counter++;
            $code = $base . '-' . str_pad($counter, 3, '0', STR_PAD_LEFT);
        }
        
        return $code;
    }
}