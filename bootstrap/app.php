<?php

/**
 * FILE LOCATION: bootstrap/app.php
 *
 * Laravel 12 application bootstrap.
 *
 * ROUTE FILES:
 *   web.php  → catch-all, serves React SPA for all non-API URLs
 *   api.php  → all REST endpoints under /api/v1/
 *
 * AUTH STRATEGY: Bearer token (Sanctum personal access tokens)
 *   - No session auth, no CSRF cookies, no stateful SPA middleware
 *   - EnsureFrontendRequestsAreStateful is intentionally REMOVED
 *     It causes redirects to /register for token-based API calls
 *   - All auth is via Authorization: Bearer <token> header
 *   - Tokens are stored in localStorage under 'hmo_token'
 *
 * MIDDLEWARE ORDER (API group):
 *   1. ForceJsonResponse   → always JSON, never HTML error pages
 *   2. Laravel defaults    → throttle, etc.
 *   3. auth:sanctum        → per-route, in api.php
 *   4. branch.isolation    → per-route, in api.php
 *   5. permission          → per-route, in api.php
 */

use App\Http\Middleware\BranchIsolation;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\BranchScope;
use App\Http\Middleware\ForceJsonResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web:      __DIR__ . '/../routes/web.php',
        api:      __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        apiPrefix: 'api/v1',
        health:   '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prependToGroup('api', ForceJsonResponse::class);
        
        $middleware->alias([
            'permission'       => CheckPermission::class,
            'branch.isolation' => BranchIsolation::class,
            'branch.scope'     => BranchScope::class,
            'license' => \App\Http\Middleware\EnforceLicense::class,
        ]);
        
        // Add this - handle unauthenticated requests without redirects
        $middleware->redirectGuestsTo(function ($request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })
    ->withExceptions(function (Exceptions $exceptions) {

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Resource not found.'
                ], 404);
            }
        });
    
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthenticated.'
                ], 401);
            }
        });
    
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Validation failed.',
                    'errors'  => $e->errors(),
                ], 422);
            }
        });
    
        $exceptions->render(function (\Spatie\Permission\Exceptions\UnauthorizedException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'You do not have permission to perform this action.'
                ], 403);
            }
        });
    
    })
    ->create();