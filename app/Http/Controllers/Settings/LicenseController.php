<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\LicenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * LicenseController — ERP
 *
 * Exposes license status to the frontend and handles emergency token submission.
 * Super-admin only for management endpoints; status endpoint is broader.
 *
 * ROUTES (add to routes/api.php):
 *   GET  /settings/license               → status()         — all admins
 *   POST /settings/license/emergency     → applyEmergency() — super_admin only
 *   POST /settings/license/check-in      → forceCheckin()   — super_admin only
 *
 * FILE: app/Http/Controllers/Settings/LicenseController.php
 */
class LicenseController extends Controller
{
    public function __construct(private LicenseService $licenseService) {}

    /**
     * GET /settings/license
     * Returns the current license status summary.
     * Available to any authenticated admin user.
     */
    public function status(): JsonResponse
    {
        return response()->json($this->licenseService->statusSummary());
    }

    /**
     * POST /settings/license/emergency
     * Admin pastes an emergency token to extend access when offline.
     */
    public function applyEmergency(Request $request): JsonResponse
    {
        $this->requireSuperAdmin();

        $request->validate([
            'token' => ['required', 'string'],
        ]);

        $success = $this->licenseService->applyEmergencyToken($request->token);

        if (! $success) {
            return response()->json([
                'message' => 'Invalid or expired emergency token. Please request a new one from your vendor.',
            ], 422);
        }

        return response()->json([
            'message' => 'Emergency token applied successfully. Full access restored for the token period.',
            'status'  => $this->licenseService->statusSummary(),
        ]);
    }

    /**
     * POST /settings/license/check-in
     * Manually trigger a license check-in (super admin).
     */
    public function forceCheckin(): JsonResponse
    {
        $this->requireSuperAdmin();

        $status = $this->licenseService->performCheckin();

        return response()->json([
            'message' => $status
                ? "Check-in successful. Status: {$status}"
                : 'Check-in failed. The licensing server could not be reached. The system will retry automatically.',
            'status'  => $this->licenseService->statusSummary(),
        ]);
    }

    private function requireSuperAdmin(): void
    {
        /** @disregard P1013 */
        $user = auth()->user();
        abort_unless(
            
            $user?->hasRole('super_admin') || $user?->can('settings.system'),
            403,
            'Only Super Administrators can manage licensing.'
        );
    }
}