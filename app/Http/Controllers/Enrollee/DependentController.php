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

class DependentController extends Controller
{
    public function index(Request $request, Enrollee $enrollee): JsonResponse
    {
        /** @disregard P1013 */
        abort_unless(Auth::user()->hasPermissionTo('enrollees.view'), 403);

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

    public function store(StoreDependentRequest $request, Enrollee $enrollee): JsonResponse
    {
        /** @disregard P1013 */
        abort_unless(Auth::user()->hasPermissionTo('enrollees.edit'), 403);

        $planLimit   = $enrollee->plan?->max_dependents;
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
            'first_name'    => $request->first_name,
            'middle_name'   => $request->middle_name,
            'last_name'     => $request->last_name,
            'date_of_birth' => $request->date_of_birth,
            'gender'        => $request->gender,
            'relationship'  => $request->relationship,
            'blood_group'   => $request->blood_group,
            'genotype'      => $request->genotype,
            'status'        => 'active',
            'added_by'      => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Dependent added successfully',
            'data'    => new DependentResource($dependent),
        ], 201);
    }

    public function show(Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        abort_unless(Auth::user()->hasPermissionTo('enrollees.view'), 403);

        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        return response()->json(['data' => new DependentResource($dependent)]);
    }

    public function update(UpdateDependentRequest $request, Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        abort_unless(Auth::user()->hasPermissionTo('enrollees.edit'), 403);

        if ($dependent->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Dependent not found for this enrollee'], 404);
        }

        $dependent->update($request->validated());

        return response()->json([
            'message' => 'Dependent updated successfully',
            'data'    => new DependentResource($dependent),
        ]);
    }

    public function destroy(Enrollee $enrollee, Dependent $dependent): JsonResponse
    {
        /** @disregard P1013 */
        abort_unless(Auth::user()->hasPermissionTo('enrollees.edit'), 403);

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