<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\Toggle2FARequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(protected AuthService $authService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->only('email', 'password', 'otp'),
            $request->ip()
        );

        if ($result['requires_2fa'] ?? false) {
            return response()->json([
                'message'      => $result['message'],
                'requires_2fa' => true,
            ], 200);
        }

        return response()->json([
            'message' => 'Login successful.',
            'data'    => $result,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('branch');

        return response()->json([
            'data' => [
                'id'                 => $user->id,
                'name'               => $user->name,
                'email'              => $user->email,
                'phone'              => $user->phone,
                'status'             => $user->status,
                'two_factor_enabled' => $user->two_factor_enabled,
                'last_login_at'      => $user->last_login_at,
                'branch'             => $user->branch,
                'roles'              => $user->getRoleNames(),
                'permissions'        => $user->getAllPermissions()->pluck('name')->sort()->values(),
            ],
        ]);
    }
    

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $this->authService->logoutAll($request->user());

        return response()->json(['message' => 'Logged out from all devices.']);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->authService->changePassword(
            $request->user(),
            $request->current_password,
            $request->new_password
        );

        return response()->json([
            'message' => 'Password changed. Please log in again with your new password.',
        ]);
    }

    public function setup2FA(Request $request): JsonResponse
    {
        $data = $this->authService->setup2FA($request->user());

        return response()->json([
            'message' => 'Scan the QR code with Google Authenticator or any TOTP app, then confirm with your first OTP.',
            'data'    => $data,
        ]);
    }

    public function confirm2FA(Toggle2FARequest $request): JsonResponse
    {
        $this->authService->confirm2FA($request->user(), $request->otp);

        return response()->json(['message' => '2FA enabled successfully. Your account is now more secure.']);
    }

    public function disable2FA(Toggle2FARequest $request): JsonResponse
    {
        $this->authService->disable2FA($request->user(), $request->otp);

        return response()->json(['message' => '2FA disabled.']);
    }
}