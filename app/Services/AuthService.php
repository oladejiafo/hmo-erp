<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;


class AuthService
{
    public function __construct(protected Google2FA $google2FA) {}

    /**
     * Authenticate user credentials, enforce 2FA, return token.
     */
    public function loginxx(array $credentials, string $ip): array
    {
        /** @var User $user */
        $user = User::with('branch')
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ["Your account has been {$user->status}. Contact your administrator."],
            ]);
        }

        // 2FA gate
        if ($user->two_factor_enabled) {
            if (empty($credentials['otp'])) {
                return ['requires_2fa' => true, 'message' => 'OTP code required.'];
            }

            $valid = $this->google2FA->verifyKey(
                $user->two_factor_secret,
                (string) $credentials['otp']
            );

            if (! $valid) {
                throw ValidationException::withMessages([
                    'otp' => ['Invalid OTP code. Please try again.'],
                ]);
            }
        }

        // Revoke all previous tokens to enforce single-session per user
        // Comment out the line below if you want multi-device login
        $user->tokens()->delete();

        $expiresAt = now()->addHours(config('hmo.token_lifetime_hours', 12));
        $token     = $user->createToken('hmo-erp', ['*'], $expiresAt);

        $user->recordLogin($ip);

        return [
            'requires_2fa' => false,
            'token'        => $token->plainTextToken,
            'expires_at'   => $expiresAt->toISOString(),
            'user'         => $this->formatUserPayload($user),
        ];
    }

    // app/Services/AuthService.php
    public function login(array $credentials, string $ip): array
    {
        /** @var User $user */
        $user = User::with('branch','corporate', 'enrollee')
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ["Your account has been {$user->status}. Contact your administrator."],
            ]);
        }

        // 2FA gate (your existing code)
        if ($user->two_factor_enabled) {
            if (empty($credentials['otp'])) {
                return ['requires_2fa' => true, 'message' => 'OTP code required.'];
            }

            $valid = $this->google2FA->verifyKey(
                $user->two_factor_secret,
                (string) $credentials['otp']
            );

            if (! $valid) {
                throw ValidationException::withMessages([
                    'otp' => ['Invalid OTP code. Please try again.'],
                ]);
            }
        }

        // ✅ NEW: Check if password needs to be changed (first login)
        $requiresPasswordChange = $user->password_changed_at === null;

        // Revoke all previous tokens to enforce single-session per user
        $user->tokens()->delete();
        
        $expiresAt = now()->addHours((int) config('hmo.token_lifetime_hours', 12));
        $token     = $user->createToken('hmo-erp', ['*'], $expiresAt);

        $user->recordLogin($ip);

        // ✅ MODIFIED: Include requires_password_change in response
        return [
            'requires_2fa' => false,
            'requires_password_change' => $requiresPasswordChange,
            'token'        => $token->plainTextToken,
            'expires_at'   => $expiresAt->toISOString(),
            'user'         => $this->formatUserPayload($user),
        ];
    }

    // Add a new method to handle password change after first login
    public function setInitialPassword(User $user, string $newPassword): void
    {
        $user->update([
            'password' => Hash::make($newPassword),
            'password_changed_at' => now(),
        ]);

        // Force re-login on all devices after password change
        $user->tokens()->delete();
    }


    public function sendPasswordResetLink(string $email): array
    {
        $status = Password::sendResetLink(['email' => $email]);
    
        if ($status === Password::RESET_LINK_SENT) {
            return [
                'message' => 'Password reset link sent to your email.',
                'status' => 200,
            ];
        }
    
        return [
            'message' => 'Unable to send reset link. Please try again.',
            'status' => 400,
        ];
    }
    
    public function resetPassword(string $email, string $password, string $token): array
    {
        $status = Password::reset(
            [
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $password,
                'token' => $token,
            ],
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );
    
        if ($status === Password::PASSWORD_RESET) {
            return [
                'message' => 'Password reset successful. You can now log in with your new password.',
                'status' => 200,
            ];
        }
    
        return [
            'message' => 'Invalid token or email. Please request a new reset link.',
            'status' => 400,
        ];
    }

    public function logout(User $user): void
    {
        /** @disregard P1013 Intelephense false positive */
        $user->currentAccessToken()->delete();
    }

    public function logoutAll(User $user): void
    {
        $user->tokens()->delete();
    }

    public function changePassword(User $user, string $current, string $new): void
    {
        if (! Hash::check($current, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($new)]);

        // Force re-login on all devices after password change
        $user->tokens()->delete();
    }

    public function setup2FA(User $user): array
    {
        if ($user->two_factor_enabled) {
            throw ValidationException::withMessages([
                'two_factor' => ['2FA is already enabled. Disable it first to reset.'],
            ]);
        }

        $secret = $this->google2FA->generateSecretKey();
        $user->updateQuietly(['two_factor_secret' => $secret]);

        return [
            'secret' => $secret,
            'qr_url' => $this->google2FA->getQRCodeUrl(
                config('app.name'),
                $user->email,
                $secret
            ),
        ];
    }

    public function confirm2FA(User $user, string $otp): void
    {
        if (! $user->two_factor_secret) {
            throw ValidationException::withMessages([
                'otp' => ['Please run the 2FA setup step first.'],
            ]);
        }

        $valid = $this->google2FA->verifyKey($user->two_factor_secret, $otp);

        if (! $valid) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid OTP. 2FA not activated.'],
            ]);
        }

        $user->update(['two_factor_enabled' => true]);
    }

    public function disable2FA(User $user, string $otp): void
    {
        $valid = $this->google2FA->verifyKey($user->two_factor_secret, $otp);

        if (! $valid) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid OTP. Cannot disable 2FA.'],
            ]);
        }

        $user->update([
            'two_factor_enabled' => false,
            'two_factor_secret'  => null,
        ]);
    }

    protected function formatUserPayload(User $user): array
    {
        return [
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'phone'              => $user->phone,
            'branch_id'          => $user->branch_id,
            'two_factor_enabled' => $user->two_factor_enabled,
            'branch'             => $user->branch ? [
                'id'   => $user->branch->id,
                'name' => $user->branch->name,
                'code' => $user->branch->code,
                'type' => $user->branch->type,
            ] : null,
            'corporate'          => $user->corporate ? [ // Add this
                'id'   => $user->corporate->id,
                'name' => $user->corporate->name,
                'code' => $user->corporate->code,
            ] : null,
            'enrollee'           => $user->enrollee ? [ // ADD THIS
                'id'            => $user->enrollee->id,
                'enrollee_id'   => $user->enrollee->enrollee_id,
                'first_name'    => $user->enrollee->first_name,
                'last_name'     => $user->enrollee->last_name,
                'date_of_birth' => $user->enrollee->date_of_birth,
                'gender'        => $user->enrollee->gender,
                'phone'         => $user->enrollee->phone,
                'photo'         => $user->enrollee->photo,
            ] : null,
            'roles'       => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ];
    }
}