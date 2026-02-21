<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces Accept: application/json on all API requests.
 * Without this, Laravel redirects unauthenticated requests to /login
 * instead of returning a 401 JSON response.
 *
 * Register this as the FIRST middleware in the API group.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}