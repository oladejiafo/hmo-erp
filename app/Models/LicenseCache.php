<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * LicenseCache - ERP
 *
 * Single-row model. Always use LicenseCache::instance() to get the row.
 * Use LicenseService to read and update - don't update this directly.
 *
 * FILE: app/Models/LicenseCache.php
 */
class LicenseCache extends Model
{
    protected $table = 'license_cache';

    protected $fillable = [
        'signed_token', 'license_key', 'client_name', 'plan', 'status',
        'valid_until', 'license_expires_at', 'grace_ends_at', 'grace_days_remaining',
        'checkin_interval_hours', 'consecutive_failures', 'first_failure_at',
        'last_successful_checkin', 'last_attempt_at',
        'emergency_token', 'emergency_token_valid_until',
    ];

    protected $casts = [
        'valid_until'               => 'datetime',
        'license_expires_at'        => 'date',
        'grace_ends_at'             => 'date',
        'first_failure_at'          => 'datetime',
        'last_successful_checkin'   => 'datetime',
        'last_attempt_at'           => 'datetime',
        'emergency_token_valid_until'=> 'datetime',
    ];

    /**
     * Always returns the single license cache row, creating it if absent.
     */
    public static function instance(): self
    {
        return static::firstOrCreate(['id' => 1], [
            'status'                 => 'unlicensed',
            'consecutive_failures'   => 0,
            'checkin_interval_hours' => 24,
        ]);
    }
}