<?php

namespace App\Http\Controllers\Enrollee;

use App\Http\Controllers\Controller;

use App\Http\Requests\Enrollee\StoreDependentRequest;
use App\Http\Requests\Enrollee\UpdateDependentRequest;
use App\Http\Resources\DependentResource;
use App\Models\Dependent;
use App\Models\Enrollee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DependentController extends Controller
{
    /**
     * Get all dependents for an enrollee
     * 
     * @param Request $request
     * @param Enrollee $enrollee
     * @return JsonResponse
     */
    public function index(Request $request, Enrollee $enrollee): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.view');
        
        $dependents = $enrollee->dependents()
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => DependentResource::collection($dependents),
            'meta' => [
                'total' => $dependents->count(),
                'active_count' => $dependents->where('status', 'active')->count(),
            ],
        ]);

    }

    /**
     * Add a dependent to an enrollee
     * 
     * @param StoreDependentRequest $request
     * @param Enrollee $enrollee
     * @return JsonResponse
     */
    public function store(StoreDependentRequest $request, Enrollee $enrollee): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.edit');
        
        // Check max dependents limit from plan
        if ($enrollee->plan && $enrollee->plan->max_dependents !== null) {
            $currentCount = $enrollee->dependents()
                ->whereIn('status', ['active', 'pending'])
                ->count();
                
            if ($currentCount >= $enrollee->plan->max_dependents) {
                return response()->json([
                    'message' => "Maximum dependents limit ({$enrollee->plan->max_dependents}) reached for this plan"
                ], 422);
            }
        }

        $dependent = $enrollee->dependents()->create([
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'date_of_birth' => $request->date_of_birth,
            'gender' => $request->gender,
            'relationship' => $request->relationship,
            'blood_group' => $request->blood_group,
            'genotype' => $request->genotype,
            'status' => 'active',
            'added_by' => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Dependent added successfully',
            'data' => new DependentResource($dependent),
        ], 201);
    }

    /**
     * Get a specific dependent
     * 
     * @param Enrollee $enrollee
     * @param Dependent $dependent
     * @return JsonResponse
     */
    public function show(Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        
        /** @disregard P1013 */
        $this->authorize('enrollees.view');
        
        // Ensure dependent belongs to enrollee
        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        return response()->json([
            'data' => new DependentResource($dependent),
        ]);
    }

    /**
     * Update a dependent
     * 
     * @param UpdateDependentRequest $request
     * @param Enrollee $enrollee
     * @param Dependent $dependent
     * @return JsonResponse
     */
    public function update(UpdateDependentRequest $request, Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.edit');
        
        // Ensure dependent belongs to enrollee
        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        $dependent->update($request->validated());

        return response()->json([
            'message' => 'Dependent updated successfully',
            'data' => new DependentResource($dependent),
        ]);
    }

    /**
     * Delete a dependent
     * 
     * @param Enrollee $enrollee
     * @param Dependent $dependent
     * @return JsonResponse
     */
    public function destroy(Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.edit');
        
        // Ensure dependent belongs to enrollee
        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        // Check if dependent has any claims
        if ($dependent->claims()->exists()) {
            return response()->json([
                'message' => 'Cannot delete dependent with existing claims. Suspend instead.'
            ], 422);
        }

        $dependent->delete();

        return response()->json([
            'message' => 'Dependent deleted successfully',
        ]);
    }
}