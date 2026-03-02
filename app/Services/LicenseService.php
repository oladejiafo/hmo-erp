<?php

namespace App\Services;

use App\Models\LicenseCache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * LicenseService — ERP
 *
 * Single source of truth for license status in the ERP.
 * All other parts of the system (middleware, frontend API) call this.
 *
 * STATUS VALUES (what the rest of the app sees):
 *   valid       → fully licensed, all features available
 *   grace       → license expired/suspended but grace period still active;
 *                 all features still work, banner shown to admin
 *   restricted  → grace period over; write operations blocked
 *   unlicensed  → no license key configured at all
 *
 * FLOW:
 *   1. CheckLicense command runs every 24h (or per checkin_interval_hours)
 *   2. Calls performCheckin() → hits licensing server → stores signed token
 *   3. All runtime reads go to resolveStatus() — reads from license_cache table
 *   4. False-positive protection: only enters grace after 3+ failures over 48h
 *   5. Emergency token: overrides cache for N days when pasted into settings
 *
 * FILE: app/Services/LicenseService.php
 */
class LicenseService
{
    // After this many consecutive failures over MIN_FAILURE_HOURS, we enter grace
    private const MIN_FAILURES_BEFORE_GRACE = 3;
    private const MIN_FAILURE_HOURS         = 48;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Get the current effective license status.
     * This is the method everything else calls — fast, no HTTP.
     *
     * Returns: 'valid' | 'grace' | 'restricted' | 'unlicensed'
     */
    public function resolveStatus(): string
    {
        $cache = LicenseCache::instance();

        // 1. Emergency token overrides everything
        if ($this->emergencyTokenValid($cache)) {
            return 'valid';
        }

        // 2. No license key configured at all
        $licenseKey = config('licensing.license_key');
        if (! $licenseKey) {
            return 'unlicensed';
        }

        // 3. Valid cached token from licensing server
        if ($cache->valid_until && now()->lt($cache->valid_until)) {
            return $cache->status ?? 'restricted';
        }

        // 4. Cache expired — check consecutive failure history
        // If we haven't failed enough times over enough hours, treat as 'grace'
        // (prevents a brief network blip from restricting the system)
        if ($cache->consecutive_failures < self::MIN_FAILURES_BEFORE_GRACE) {
            return 'grace';
        }

        if ($cache->first_failure_at &&
            now()->diffInHours($cache->first_failure_at) < self::MIN_FAILURE_HOURS) {
            return 'grace';
        }

        // 5. Enough failures have accumulated — use whatever status the server last sent
        // (could be grace if they're in a grace period, or restricted)
        return $cache->status === 'valid' ? 'grace' : ($cache->status ?? 'restricted');
    }

    /**
     * Returns true if the system is in restricted mode (write operations blocked).
     */
    public function isRestricted(): bool
    {
        return $this->resolveStatus() === 'restricted';
    }

    /**
     * Returns true if fully valid (not grace, not restricted).
     */
    public function isValid(): bool
    {
        return $this->resolveStatus() === 'valid';
    }

    /**
     * Full status summary for the admin UI / API.
     */
    public function statusSummary(): array
    {
        $cache  = LicenseCache::instance();
        $status = $this->resolveStatus();
        
        // Get license key from cache if available, otherwise from config
        $licenseKey = $cache->license_key ?? config('licensing.license_key');
    
        return [
            'status'                  => $status,
            'is_restricted'           => $status === 'restricted',
            'is_grace'                => $status === 'grace',
            'plan'                    => $cache->plan ?? 'No license data',
            'client_name'             => $cache->client_name,
            'license_key'             => $licenseKey
                ? $this->maskKey($licenseKey)
                : null,
            'license_expires_at'      => $cache->license_expires_at?->toDateString(),
            'grace_ends_at'           => $cache->grace_ends_at?->toDateString(),
            'grace_days_remaining'    => $cache->grace_days_remaining,
            'last_successful_checkin' => $cache->last_successful_checkin?->toISOString(),
            'last_attempt_at'         => $cache->last_attempt_at?->toISOString(),
            'consecutive_failures'    => $cache->consecutive_failures,
            'cache_valid_until'       => $cache->valid_until?->toISOString(),
            'emergency_token_active'  => $this->emergencyTokenValid($cache),
            'emergency_token_expires' => $cache->emergency_token_valid_until?->toDateString(),
            'checkin_interval_hours'  => $cache->checkin_interval_hours,
            'vendor_contact'          => config('licensing.vendor_contact'),
        ];
    }

    // ── Check-in ──────────────────────────────────────────────────────────────

    /**
     * Perform a check-in with the licensing server.
     * Called by the CheckLicense artisan command (scheduled daily).
     *
     * Returns the resolved status string, or null on network failure.
     */
    public function performCheckin(): ?string
    {
        $cache      = LicenseCache::instance();
        $licenseKey = config('licensing.license_key');
        $serverUrl  = config('licensing.server_url');

        $cache->update(['last_attempt_at' => now()]);

        if (! $licenseKey || ! $serverUrl) {
            Log::warning('License check-in skipped: license_key or server_url not configured.');
            return null;
        }

        try {
            $response = Http::timeout(15)
                ->retry(3, 2000)
                ->post(rtrim($serverUrl, '/') . '/api/check-in', [
                    'license_key' => $licenseKey,
                    'fingerprint' => $this->generateFingerprint(),
                    'hostname'    => gethostname() ?: 'unknown',
                    'erp_version' => config('app.version', '1.0.0'),
                ]);

            if ($response->successful()) {
                return $this->processSuccessfulCheckin($response->json(), $cache);
            }

            // Server responded but with an error (invalid key, suspended, etc.)
            $serverStatus = $response->json('status', 'error');
            Log::warning('License check-in rejected by server', [
                'http_status'   => $response->status(),
                'server_status' => $serverStatus,
                'body'          => $response->body(),
            ]);

            $this->recordFailure($cache);
            return null;

        } catch (\Exception $e) {
            Log::warning('License check-in network failure', ['error' => $e->getMessage()]);
            $this->recordFailure($cache);
            return null;
        }
    }

    /**
     * Validate and store an emergency offline token pasted by the admin.
     * Returns true if valid and stored, false if invalid.
     */
    public function applyEmergencyToken(string $token): bool
    {
        $payload = $this->verifyAndDecode($token);

        if (! $payload) {
            return false;
        }

        if (($payload['type'] ?? '') !== 'emergency') {
            return false;
        }

        // Check it hasn't already expired
        $validUntil = \Carbon\Carbon::parse($payload['valid_until']);
        if ($validUntil->isPast()) {
            return false;
        }

        // Verify the license key matches what's configured
        if ($payload['license_key'] !== config('licensing.license_key')) {
            return false;
        }

        $cache = LicenseCache::instance();
        $cache->update([
            'emergency_token'            => $token,
            'emergency_token_valid_until'=> $validUntil,
        ]);

        Log::info('Emergency license token applied.', [
            'valid_until' => $validUntil->toDateString(),
            'reason'      => $payload['reason'] ?? 'not stated',
        ]);

        return true;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function processSuccessfulCheckin(array $data, LicenseCache $cache): string
    {
        $token   = $data['token']   ?? null;
        $payload = $data['payload'] ?? null;

        if (! $token || ! $payload) {
            $this->recordFailure($cache);
            return 'error';
        }

        // Verify the signature
        if (! $this->verifyAndDecode($token)) {
            Log::error('License token signature verification FAILED — possible tampering or server key mismatch.');
            $this->recordFailure($cache);
            return 'error';
        }

        // Store in cache
        $cache->update([
            'signed_token'            => $token,
            'license_key'             => $payload['license_key'] ?? null,
            'client_name'             => $payload['client_name'] ?? null,
            'plan'                    => $payload['plan']        ?? null,
            'status'                  => $payload['status']      ?? 'restricted',
            'valid_until'             => $payload['valid_until'] ?? null,
            'license_expires_at'      => $payload['expires_at']  ?? null,
            'grace_ends_at'           => $payload['grace_ends_at'] ?? null,
            'grace_days_remaining'    => $payload['grace_days_remaining'] ?? null,
            'checkin_interval_hours'  => $payload['checkin_interval_hours'] ?? 24,
            'consecutive_failures'    => 0,
            'first_failure_at'        => null,
            'last_successful_checkin' => now(),
        ]);

        return $payload['status'] ?? 'valid';
    }

    private function recordFailure(LicenseCache $cache): void
    {
        $updates = [
            'consecutive_failures' => $cache->consecutive_failures + 1,
        ];

        // Record the first failure timestamp (don't overwrite subsequent ones)
        if (is_null($cache->first_failure_at)) {
            $updates['first_failure_at'] = now();
        }

        $cache->update($updates);

        Log::info('License check-in failure recorded.', [
            'consecutive' => $cache->consecutive_failures + 1,
            'first_at'    => $cache->first_failure_at ?? now(),
        ]);
    }

    /**
     * Verify the token signature using the licensing server's public key.
     * Returns the decoded payload array, or null if invalid.
     */
    private function verifyAndDecode(string $token): ?array
    {
        $publicKeyPem = config('licensing.public_key');

        if (! $publicKeyPem) {
            Log::error('Licensing public key not configured — cannot verify token.');
            return null;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            return null;
        }

        [$payloadB64, $sigB64] = $parts;

        $payloadJson = base64_decode(strtr($payloadB64, '-_', '+/'));
        $signature   = base64_decode(strtr($sigB64,    '-_', '+/'));

        $publicKey = openssl_pkey_get_public($publicKeyPem);
        if (! $publicKey) {
            Log::error('Failed to load licensing public key.');
            return null;
        }

        $result = openssl_verify($payloadJson, $signature, $publicKey, OPENSSL_ALGO_SHA256);

        if ($result !== 1) {
            return null;
        }

        return json_decode($payloadJson, true);
    }

    /**
     * Generate a stable fingerprint for this server installation.
     * Uses hostname + a salt stored in the app key — stable across restarts,
     * but unique to this deployment.
     */
    private function generateFingerprint(): string
    {
        $hostname  = gethostname() ?: 'unknown';
        $salt      = substr(config('app.key'), 0, 16); // first 16 chars of APP_KEY
        return hash('sha256', $hostname . '|' . $salt);
    }

    private function emergencyTokenValid(LicenseCache $cache): bool
    {
        return $cache->emergency_token
            && $cache->emergency_token_valid_until
            && now()->lt($cache->emergency_token_valid_until);
    }

    private function maskKey(string $key): string
    {
        // Show: HMS-XXXX-****-****-XXXX
        $parts = explode('-', $key);
        if (count($parts) === 5) {
            $parts[2] = '****';
            $parts[3] = '****';
        }
        return implode('-', $parts);
    }
}