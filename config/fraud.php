<?php
/**
 * FILE LOCATION: config/fraud.php
 *
 * All values now fall back to SystemSetting::get() first, then env(), then
 * the hard-coded default. This means the DB setting wins over the env var,
 * which wins over the fallback literal.
 *
 * The SystemSetting model caches reads for 60 minutes, so there is no
 * per-request database hit.
 *
 * IMPORTANT: config() is evaluated at boot time, before the service container
 * is fully available, so we cannot call Eloquent directly here. Instead, the
 * services that use these values should call SystemSetting::get() directly
 * rather than config('fraud.*') — see updated service files.
 *
 * For backwards compatibility, the env-based values remain as fallbacks.
 */

return [
    /*
    |--------------------------------------------------------------------------
    | Fraud Detection Configuration
    |--------------------------------------------------------------------------
    | All thresholds are now managed via the System Settings page (super admin).
    | These values are used ONLY when the DB table is not yet seeded (e.g. during
    | initial setup or in test environments).
    */

    'auto_quarantine_threshold'    => env('FRAUD_RISK_THRESHOLD', 70),
    'auto_reject_threshold'        => env('FRAUD_AUTO_REJECT_THRESHOLD', 95),
    'duplicate_window_days'        => env('FRAUD_DUPLICATE_WINDOW', 30),
    'frequency_threshold_monthly'  => env('FRAUD_FREQUENCY_THRESHOLD', 4),
    'cost_spike_multiplier'        => env('FRAUD_COST_SPIKE_MULTIPLIER', 1.5),
    'high_cost_enrollee_threshold' => env('FRAUD_HIGH_COST_THRESHOLD', 2000000),
    'provider_baseline_months'     => env('FRAUD_BASELINE_MONTHS', 6),
    'min_claims_for_baseline'      => env('FRAUD_MIN_BASELINE_CLAIMS', 10),

    'score_weights' => [
        'duplicate_claim'      => env('FRAUD_WEIGHT_DUPLICATE', 40),
        'tariff_mismatch'      => env('FRAUD_WEIGHT_TARIFF', 25),
        'over_benefit_limit'   => env('FRAUD_WEIGHT_BENEFIT', 20),
        'frequency_anomaly'    => env('FRAUD_WEIGHT_FREQUENCY', 20),
        'cost_spike'           => env('FRAUD_WEIGHT_COST_SPIKE', 25),
        'pattern_deviation'    => env('FRAUD_WEIGHT_DEVIATION', 10),
        'pre_auth_missing'     => env('FRAUD_WEIGHT_PRE_AUTH', 15),
        'provider_blacklisted' => 50, // Hard fail — not user-configurable
        'expired_plan'         => 35, // Hard fail — not user-configurable
    ],
];