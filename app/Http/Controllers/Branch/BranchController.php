<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Http\Resources\BranchResource;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $branches = Branch::query()
            ->withCount(['users', 'corporates', 'enrollees', 'claims'])
            ->when($request->search, fn ($q, $s) =>
                $q->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%")
            )
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->orderBy('type') // HQ first
            ->orderBy('name')
            ->get();

        return response()->json(['data' => BranchResource::collection($branches)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => ['required', 'string', 'max:100'],
            'code'    => ['required', 'string', 'max:20', 'unique:branches,code', 'uppercase'],
            'state'   => ['required', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'phone'   => ['nullable', 'string', 'max:20'],
            'email'   => ['nullable', 'email', 'max:100'],
            'type'    => ['required', Rule::in(['STATE', 'REGIONAL'])],
            // HQ type can only be created by direct DB seeding - never via API
        ]);

        $validated['status'] = 'active';

        $branch = Branch::create($validated);

        return response()->json([
            'message' => 'Branch created successfully.',
            'data'    => new BranchResource($branch),
        ], 201);
    }

    public function show(Branch $branch): JsonResponse
    {
        $branch->loadCount(['users', 'corporates', 'enrollees', 'claims', 'healthCareProviders']);

        return response()->json(['data' => new BranchResource($branch)]);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        if ($branch->isHQ()) {
            // Restrict HQ editable fields - you cannot rename or retype HQ via API
            $validated = $request->validate([
                'address' => ['nullable', 'string'],
                'phone'   => ['nullable', 'string', 'max:20'],
                'email'   => ['nullable', 'email', 'max:100'],
            ]);
        } else {
            $validated = $request->validate([
                'name'    => ['sometimes', 'string', 'max:100'],
                'state'   => ['sometimes', 'string', 'max:50'],
                'address' => ['nullable', 'string'],
                'phone'   => ['nullable', 'string', 'max:20'],
                'email'   => ['nullable', 'email', 'max:100'],
                'type'    => ['sometimes', Rule::in(['STATE', 'REGIONAL'])],
            ]);
        }

        $branch->update($validated);

        return response()->json([
            'message' => 'Branch updated.',
            'data'    => new BranchResource($branch->fresh()),
        ]);
    }

    public function destroy(Branch $branch): JsonResponse
    {
        if ($branch->isHQ()) {
            return response()->json(['message' => 'The HQ branch cannot be deleted.'], 403);
        }

        if ($branch->users()->exists() || $branch->enrollees()->exists()) {
            return response()->json([
                'message' => 'Branch has active users or enrollees. Deactivate it instead.',
            ], 422);
        }

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }

    public function toggleStatus(Branch $branch): JsonResponse
    {
        if ($branch->isHQ()) {
            return response()->json(['message' => 'The HQ branch status cannot be changed.'], 403);
        }

        $newStatus = $branch->status === 'active' ? 'inactive' : 'active';
        $branch->update(['status' => $newStatus]);

        return response()->json([
            'message' => "Branch {$newStatus}.",
            'data'    => new BranchResource($branch->fresh()),
        ]);
    }
}