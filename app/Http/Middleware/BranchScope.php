<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BranchScope
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Skip branch check for super admin if you have that concept
        /** @disregard P1013 */
        if (Auth::check() && Auth::user()->hasRole('Super Admin')) {
            return $next($request);
        }

        // Ensure user has a branch_id
        if (Auth::check() && !Auth::user()->branch_id) {
            return response()->json([
                'message' => 'User does not have a branch assigned.'
            ], 403);
        }

        // You can add additional branch-scoping logic here
        // For example, adding a global scope to queries, etc.

        return $next($request);
    }
}