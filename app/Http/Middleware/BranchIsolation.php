<?php

// ============================================================
// FILE: app/Http/Middleware/BranchIsolation.php
// ============================================================
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Prevents non-HQ users from:
 *   1. Passing a branch_id in request body different from their own
 *   2. Accessing or modifying records of other branches
 *
 * Applied globally to all authenticated routes.
 */
class BranchIsolation
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // HQ users can explicitly target any branch — they have full access
        if ($user->isHQ()) {
            return $next($request);
        }

        // Prevent branch_id spoofing in request payload
        if ($request->has('branch_id')) {
            $requestedBranchId = (int) $request->input('branch_id');

            if ($requestedBranchId !== $user->branch_id) {
                return response()->json([
                    'message' => 'Forbidden. You cannot perform actions on behalf of another branch.',
                ], 403);
            }
        }

        // Force branch_id on write operations — always the authenticated user's branch
        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH')) {
            $request->merge(['branch_id' => $user->branch_id]);
        }

        return $next($request);
    }
}