<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\Toggle2FARequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\User;

class AuthController extends Controller
{
    public function __construct(protected AuthService $authService) {}

    public function loginXX(LoginRequest $request): JsonResponse
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
    
        // ✅ NEW: Check if password change is required
        if ($result['requires_password_change'] ?? false) {
            return response()->json([
                'message' => 'First login detected. Please set your password.',
                'requires_password_change' => true,
                'data' => [
                    'token' => $result['token'],
                    'user' => $result['user'],
                ],
            ]);
        }
    
        return response()->json([
            'message' => 'Login successful.',
            'data'    => $result,
        ]);
    }
    
    // ✅ NEW: Add endpoint for setting initial password
    public function setInitialPassword(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
    
        /** @var User $user */
        $user = $request->user();
        
        // Check if password was already changed
        if ($user->password_changed_at !== null) {
            return response()->json([
                'message' => 'Password already set. Please use change password endpoint.',
            ], 400);
        }
    
        $this->authService->setInitialPassword($user, $request->password);
    
        return response()->json([
            'message' => 'Password set successfully. You can now continue.',
        ]);
    }
    
    public function mex(Request $request): JsonResponse
    {
        // $user = $request->user()->load('branch', 'corporate', 'enrollee');
        $user = $request->user()->load('branch', 'corporate', 'enrollee', 'hcp');
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
                'corporate'          => $user->corporate,
                'enrollee'           => $user->enrollee,
                'hcp'                => $user->hcp, 
                'user_type'          => $user->user_type,
                'roles'              => $user->getRoleNames(),
                'permissions'        => $user->getAllPermissions()->pluck('name')->sort()->values(),
            ],
        ]);
    }
    public function me(Request $request): JsonResponse
    {
        // $user = $request->user()->load('branch', 'corporate', 'enrollee');
        $user = $request->user()->load('branch', 'corporate', 'enrollee', 'hcp');
        
        // Ensure user has sanctum permissions
        $permissions = $user->getAllPermissions()
            ->filter(fn($perm) => $perm->guard_name === 'sanctum')
            ->pluck('name')
            ->sort()
            ->values();

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
                'corporate'          => $user->corporate,
                'enrollee'           => $user->enrollee,
                'hcp'                => $user->hcp, 
                'user_type'          => $user->user_type,
                'roles'              => $user->getRoleNames(),
                'permissions'        => $permissions,
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

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $result = $this->authService->sendPasswordResetLink($request->email);

        return response()->json([
            'message' => $result['message'],
        ], $result['status'] ?? 200);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'exists:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $result = $this->authService->resetPassword(
            $request->email,
            $request->password,
            $request->token
        );

        return response()->json([
            'message' => $result['message'],
        ], $result['status'] ?? 200);
    }
}