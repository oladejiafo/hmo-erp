<?php

namespace App\Http\Controllers\Enrollee;

use App\Http\Controllers\Controller;
use App\Http\Requests\Enrollee\StoreDependentRequest;
use App\Http\Requests\Enrollee\UpdateDependentRequest;
use App\Http\Resources\DependentResource;
use App\Models\Dependent;
use App\Models\Enrollee;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class DependentController extends Controller
{
    /**
     * Get all dependents for an enrollee
     */
    public function index(Request $request, Enrollee $enrollee): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.view');

        $dependents = $enrollee->dependents()
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => DependentResource::collection($dependents),
            'meta' => [
                'total'        => $dependents->count(),
                'active_count' => $dependents->where('status', 'active')->count(),
            ],
        ]);
    }

    /**
     * Add a dependent to an enrollee.
     *
     * Enforces the max-dependents limit using (in priority order):
     *   1. The plan's own max_dependents value (if the enrollee has a plan and the plan has a limit set)
     *   2. The system-wide default from SystemSetting: financial.max_dependents (super-admin configurable)
     *   3. Hard-coded fallback of 4 (used only if the settings table is not yet seeded)
     */
    public function store(StoreDependentRequest $request, Enrollee $enrollee): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.edit');

        // Resolve the effective limit:
        // Plan-level limit takes precedence; fall back to the global system setting.
        $planLimit   = $enrollee->plan?->max_dependents; // null if no plan or no plan limit
        $globalLimit = SystemSetting::get('financial.max_dependents', 4);
        $maxAllowed  = $planLimit ?? $globalLimit;

        $currentCount = $enrollee->dependents()
            ->whereIn('status', ['active', 'pending'])
            ->count();

        if ($currentCount >= $maxAllowed) {
            $source = $planLimit !== null ? 'plan limit' : 'organisation default';
            return response()->json([
                'message' => "Maximum dependents limit ({$maxAllowed}) reached for this enrollee ({$source}).",
            ], 422);
        }

        $dependent = $enrollee->dependents()->create([
            'first_name'   => $request->first_name,
            'middle_name'  => $request->middle_name,
            'last_name'    => $request->last_name,
            'date_of_birth'=> $request->date_of_birth,
            'gender'       => $request->gender,
            'relationship' => $request->relationship,
            'blood_group'  => $request->blood_group,
            'genotype'     => $request->genotype,
            'status'       => 'active',
            'added_by'     => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Dependent added successfully',
            'data'    => new DependentResource($dependent),
        ], 201);
    }

    /**
     * Get a specific dependent.
     */
    public function show(Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.view');

        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        return response()->json(['data' => new DependentResource($dependent)]);
    }

    /**
     * Update a dependent.
     */
    public function update(UpdateDependentRequest $request, Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.edit');

        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        $dependent->update($request->validated());

        return response()->json([
            'message' => 'Dependent updated successfully',
            'data'    => new DependentResource($dependent),
        ]);
    }

    /**
     * Delete a dependent (hard delete; blocked if claims exist).
     */
    public function destroy(Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('enrollees.edit');

        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        if ($dependent->claims()->exists()) {
            return response()->json([
                'message' => 'Cannot delete dependent with existing claims. Suspend instead.',
            ], 422);
        }

        $dependent->delete();

        return response()->json(['message' => 'Dependent deleted successfully']);
    }
}