<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route permission gate — wraps Spatie permission check.
 *
 * Usage in routes (supports multiple permissions — ANY match grants access):
 *   ->middleware('permission:claims.approve')
 *   ->middleware('permission:claims.approve,claims.process')
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermissionTo($permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'message'    => 'You do not have permission to perform this action.',
            'required'   => $permissions,
        ], 403);
    }
}