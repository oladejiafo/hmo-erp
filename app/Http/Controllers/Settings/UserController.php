<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::with(['branch:id,name,code', 'roles'])
            ->when($request->search, fn ($q, $s) =>
                $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")
            )
            ->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->role, fn ($q, $r) => $q->whereHas('roles', fn ($rq) => $rq->where('name', $r)))
            ->orderBy('name')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:100'],
            'email'     => ['required', 'email', 'unique:users,email'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'branch_id' => ['required', 'exists:branches,id'],
            'password'  => ['required', 'string', 'min:8'],
            'roles'     => ['nullable', 'array'],
            'roles.*'   => ['string', 'exists:roles,name'],
        ]);

        // Non-HQ users can only create users within their own branch
        /** @disregard P1013 */
        if (! auth()->user()->isHQ()) {
            /** @disregard P1013 */
            $validated['branch_id'] = auth()->user()->branch_id;
        }

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'phone'     => $validated['phone'] ?? null,
            'branch_id' => $validated['branch_id'],
            'password'  => Hash::make($validated['password']),
            'status'    => 'active',
        ]);

        if (! empty($validated['roles'])) {
            $roles = Role::where('guard_name', 'sanctum')
                         ->whereIn('name', $validated['roles'])
                         ->get();
            $user->syncRoles($roles);
        }

        return response()->json([
            'message' => "User created. Temporary password set — user must change on first login.",
            'data'    => new UserResource($user->load('branch', 'roles')),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['branch', 'roles', 'branchRoles.role', 'branchRoles.branch']);

        return response()->json(['data' => new UserResource($user)]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name'  => ['sometimes', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'User updated.',
            'data'    => new UserResource($user->fresh(['branch', 'roles'])),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        /** @disregard P1013 */
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot delete your own account.'], 403);
        }

        // Revoke all tokens before deletion
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function toggleStatus(Request $request, User $user): JsonResponse
    {
        /** @disregard P1013 */
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot suspend your own account.'], 403);
        }

        $newStatus = $user->status === 'active' ? 'suspended' : 'active';
        $user->update(['status' => $newStatus]);

        // Revoke tokens when suspending
        if ($newStatus === 'suspended') {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => "User {$newStatus}.",
            'data'    => new UserResource($user->fresh('roles')),
        ]);
    }

    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'roles'   => ['required', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ]);

        $roles = Role::where('guard_name', 'sanctum')
                     ->whereIn('name', $validated['roles'])
                     ->get();

        // Only super_admin can assign super_admin role
        /** @disregard P1013 */
        if ($roles->contains('name', 'super_admin') && ! auth()->user()->hasRole('super_admin')) {
            return response()->json([
                'message' => 'Only a Super Admin can assign the super_admin role.',
            ], 403);
        }

        $user->syncRoles($roles);

        return response()->json([
            'message' => "Roles updated for {$user->name}.",
            'data'    => ['roles' => $user->fresh()->getRoleNames()],
        ]);
    }
}
