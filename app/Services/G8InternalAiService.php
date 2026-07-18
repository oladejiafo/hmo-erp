<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class G8InternalAiService
{
    private string $baseUrl;
    private string $token;
    private string $productSlug;
    private bool   $cachingEnabled;
    private int    $timeout;

    public function __construct()
    {
        $this->baseUrl        = config('g8_ai.url',           'https://chatbot.g8brooks.com');
        $this->token          = config('g8_ai.token',         '');
        $this->productSlug    = config('g8_ai.product_slug',  'nexum_health');
        $this->timeout        = config('g8_ai.timeout',       30);
        $this->cachingEnabled = config('g8_ai.cache_enabled', false); // claims data changes frequently
    }

    public function withCache(int $ttl = 3600): self
    {
        $this->cachingEnabled = true;
        return $this;
    }

    public function withoutCache(): self
    {
        $this->cachingEnabled = false;
        return $this;
    }

    public function ping(): bool
    {
        try {
            return Http::timeout(5)
                ->get($this->baseUrl . '/api/internal/ping')
                ->successful();
        } catch (\Exception) {
            return false;
        }
    }

    // ── Nexum Health methods ──────────────────────────────────────

    /**
     * Detect anomalies in a provider's claims submission.
     * Returns: [ summary, insights[] ]
     */
    public function nexumClaimsAnomaly(array $context): ?array
    {
        return $this->call('analyze', [
            'product' => 'nexum_health',
            'feature' => 'claims_anomaly',
            'context' => $context,
        ]);
    }

    /**
     * Draft a response to an enrollee inquiry.
     * Returns: string
     */
    public function nexumEnrolleeResponse(array $context): ?string
    {
        $response = $this->call('generate', [
            'product' => 'nexum_health',
            'feature' => 'enrollee_response',
            'context' => $context,
        ]);

        return $response['content'] ?? null;
    }

    /**
     * Summarize a provider's performance for a period.
     * Returns: [ summary, insights[] ]
     */
    public function nexumProviderSummary(array $context): ?array
    {
        return $this->call('analyze', [
            'product' => 'nexum_health',
            'feature' => 'provider_summary',
            'context' => $context,
        ]);
    }

    /**
     * Generate a plain-language dashboard digest.
     * Returns: string
     */
    public function nexumDashboardDigest(array $context): ?string
    {
        $response = $this->call('generate', [
            'product' => 'nexum_health',
            'feature' => 'dashboard_digest',
            'context' => $context,
        ]);

        return $response['content'] ?? null;
    }

    /**
     * Score the fraud risk of a specific claim.
     * Returns: [ score, label, reasons[], suggestions[] ]
     */
    public function nexumClaimRisk(array $context): ?array
    {
        return $this->call('score', [
            'product' => 'nexum_health',
            'feature' => 'claim_risk',
            'context' => $context,
        ]);
    }

    // ── Core caller ──────────────────────────────────────────────

    public function call(string $endpoint, array $payload): ?array
    {
        $cacheKey = 'g8_ai_' . $this->productSlug . '_' . $endpoint . '_' . md5(json_encode($payload));

        if ($this->cachingEnabled && Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-G8-Service-Token' => $this->token,
                    'Content-Type'       => 'application/json',
                ])
                ->post($this->baseUrl . "/api/internal/{$endpoint}", $payload);

            if ($response->successful()) {
                $result = $response->json();

                if ($this->cachingEnabled) {
                    Cache::put($cacheKey, $result, now()->addHours(1));
                }

                return $result;
            }

            Log::warning('[NexumHealth] AI request failed', [
                'feature' => $payload['feature'] ?? '',
                'status'  => $response->status(),
            ]);

            return null;

        } catch (\Exception $e) {
            Log::error('[NexumHealth] AI service error', [
                'feature' => $payload['feature'] ?? '',
                'error'   => $e->getMessage(),
            ]);

            return null;
        }
    }
}