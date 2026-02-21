<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::where('guard_name', 'sanctum')
            ->withCount('permissions')
            ->with('permissions:id,name')
            ->get();

        return response()->json(['data' => $roles]);
    }

    public function show(Role $role): JsonResponse
    {
        $role->load('permissions');

        return response()->json([
            'data' => [
                'id'          => $role->id,
                'name'        => $role->name,
                'permissions' => $role->permissions->pluck('name')->sort()->values(),
            ],
        ]);
    }

    public function allPermissions(): JsonResponse
    {
        $permissions = Permission::where('guard_name', 'sanctum')
            ->get()
            ->groupBy(fn ($p) => explode('.', $p->name)[0])
            ->map(fn ($group) => $group->pluck('name')->values());

        return response()->json(['data' => $permissions]);
    }

    public function syncPermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions'   => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        /** @disregard P1013 */
        if ($role->name === 'super_admin' && ! auth()->user()->hasRole('super_admin')) {
            return response()->json([
                'message' => 'Only a Super Admin can modify the super_admin role permissions.',
            ], 403);
        }

        $role->syncPermissions($validated['permissions']);

        return response()->json([
            'message'     => "Permissions updated for role [{$role->name}].",
            'permissions' => $role->fresh()->permissions->pluck('name'),
        ]);
    }
}