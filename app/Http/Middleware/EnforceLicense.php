<?php

namespace App\Http\Middleware;

use App\Services\LicenseService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnforceLicense Middleware - ERP
 *
 * Blocks write operations when the license is in 'restricted' status.
 * Attach to any route group that performs state-changing operations.
 *
 * ATTACH IN bootstrap/app.php (Laravel 11) or Kernel.php (Laravel 10):
 *
 *   ->withMiddleware(function (Middleware $middleware) {
 *       $middleware->alias(['license' => \App\Http\Middleware\EnforceLicense::class]);
 *   })
 *
 * APPLY TO ROUTE GROUPS in routes/api.php:
 *   Route::middleware(['auth:sanctum', 'license'])->group(function () { ... });
 *
 * BLOCKED HTTP METHODS: POST, PUT, PATCH, DELETE
 * ALLOWED ALWAYS: GET, HEAD, OPTIONS (read and export)
 *
 * READ-ONLY BYPASS ROUTES (always allowed even in restricted mode):
 *   - /api/settings/license        (so admin can see status and paste emergency token)
 *   - /api/auth/logout             (always allow logout)
 *   - /api/reports/*               (export still works)

 */
 
/* 
 *
 * FILE: app/Http/Middleware/EnforceLicense.php
 */
class EnforceLicense
{
    private LicenseService $license;

    public function __construct(LicenseService $license)
    {
        $this->license = $license;
    }

    public function handle($request, $next)
    {
        // Skip license check for GET requests (read-only)
        if ($request->isMethod('GET')) {
            return $next($request);
        }
        
        $status = app(LicenseService::class)->resolveStatus();
        
        // Block all write operations if restricted
        if ($status === 'restricted') {
            return response()->json([
                'message' => 'System is in restricted mode due to license expiration. Please contact your administrator.',
                'error' => 'license_restricted'
            ], 403);
        }
        
        // Allow writes during grace period
        return $next($request);
    }
    
    public function handlex(Request $request, Closure $next): Response
    {
        // Read-only methods are always allowed
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'])) {
            return $next($request);
        }

        // Always-allowed write routes (even in restricted mode)
        if ($this->isAlwaysAllowed($request)) {
            return $next($request);
        }

        // Check license
        if ($this->license->isRestricted()) {
            return response()->json([
                'message'        => 'This system is currently in restricted mode due to a licensing issue. Read-only access is available. Please contact your software vendor to resolve this.',
                'license_status' => 'restricted',
                'contact'        => config('licensing.vendor_contact'),
                'error_code'     => 'LICENSE_RESTRICTED',
            ], 403);
        }

        return $next($request);
    }

    private function isAlwaysAllowed(Request $request): bool
    {
        $alwaysAllowed = [
            'api/settings/license',    // license status and emergency token
            'api/auth/logout',         // logout
            'api/auth/refresh',        // token refresh
        ];

        $path = $request->path();

        foreach ($alwaysAllowed as $allowed) {
            if (str_starts_with($path, $allowed)) {
                return true;
            }
        }

        // Export endpoints are always readable
        if (str_ends_with($path, '/export') || str_contains($path, '/reports/')) {
            return true;
        }

        return false;
    }
}