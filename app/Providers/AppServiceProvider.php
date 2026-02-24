<?php

namespace App\Providers;

use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\PreAuthorisation;  // ADD THIS IMPORT
use App\Policies\PAPolicy;        // ADD THIS IMPORT
use App\Observers\ClaimObserver;
use App\Observers\EnrolleeObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;      // ADD THIS IMPORT
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // ── Register Model Observers ──────────────────────────────────────────
        Claim::observe(ClaimObserver::class);
        Enrollee::observe(EnrolleeObserver::class);
        
        // ADD THIS LINE - Register the PreAuthorisation policy
        Gate::policy(PreAuthorisation::class, PAPolicy::class);

        // ── API Rate Limiting ─────────────────────────────────────────────────
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        // Tighter limit on auth endpoints to prevent brute-force
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // ── Sanctum Guard for Spatie ──────────────────────────────────────────
        // Spatie uses 'web' guard by default; we need 'sanctum' for API-only apps
        config(['auth.guards.sanctum' => [
            'driver'   => 'sanctum',
            'provider' => 'users',
        ]]);
    }
}