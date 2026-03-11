<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    /**
     * Get the authenticated user's profile.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['branch:id,name,code', 'roles']);

        return response()->json([
            'data' => [
                'id'                 => $user->id,
                'name'               => $user->name,
                'email'              => $user->email,
                'phone'              => $user->phone,
                'status'             => $user->status,
                'two_factor_enabled' => $user->two_factor_enabled ?? false,
                'branch'             => $user->branch ? [
                    'id'   => $user->branch->id,
                    'name' => $user->branch->name,
                    'code' => $user->branch->code,
                ] : null,
                'roles' => $user->roles->map(fn($r) => [
                    'id'           => $r->id,
                    'name'         => $r->name,
                    'display_name' => $r->display_name ?? ucwords(str_replace('_', ' ', $r->name)),
                ]),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'created_at'  => $user->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Update name and phone only — email/branch changes go through admin.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $request->user()->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data'    => [
                'name'  => $request->user()->name,
                'phone' => $request->user()->phone,
            ],
        ]);
    }

    /**
     * Change password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password'          => ['required', 'string'],
            'new_password'              => ['required', 'string', Password::min(8)->mixedCase()->numbers(), 'confirmed'],
            'new_password_confirmation' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors'  => ['current_password' => ['Current password is incorrect.']],
            ], 422);
        }

        $request->user()->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        // Revoke all other tokens so other sessions are logged out
        $request->user()->tokens()
            ->where('id', '!=', $request->user()->currentAccessToken()->id)
            ->delete();

        return response()->json([
            'message' => 'Password changed successfully. Other sessions have been logged out.',
        ]);
    }
}