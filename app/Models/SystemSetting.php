<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Typed key-value settings store with in-process caching.
 *
 * FILE LOCATION: app/Models/SystemSetting.php
 *
 * Usage:
 *   SystemSetting::get('fraud.auto_quarantine_threshold')       → 70
 *   SystemSetting::get('hmo_info.currency_symbol', '₦')        → '₦'
 *   SystemSetting::set('fraud.auto_quarantine_threshold', 75)  → bool
 *   SystemSetting::all()                                        → Collection
 *
 * All reads are cached for 60 minutes. Any write clears the full cache.
 */
class SystemSetting extends Model
{
    protected $fillable = [
        'key', 'label', 'description', 'group', 'type',
        'value', 'default_value', 'validation_rules',
        'unit', 'is_hidden', 'is_readonly', 'sort_order', 'updated_by',
    ];

    protected $casts = [
        'validation_rules' => 'array',
        'is_hidden'        => 'boolean',
        'is_readonly'      => 'boolean',
    ];

    /** Cache key for the full settings map */
    private const CACHE_KEY = 'system_settings_map';
    private const CACHE_TTL = 3600; // seconds

    // ── Typed read ────────────────────────────────────────────────────────────

    /**
     * Get a setting value, cast to its declared type.
     * Falls back to $default if the key is missing entirely.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $map = static::getMap();

        if (! array_key_exists($key, $map)) {
            return $default;
        }

        ['value' => $raw, 'default_value' => $def, 'type' => $type] = $map[$key];

        $raw = $raw ?? $def ?? $default;

        return static::cast($raw, $type);
    }

    /**
     * Get all settings for a group as key→value array.
     */
    public static function group(string $group): array
    {
        $map = static::getMap();
        $result = [];
        foreach ($map as $key => $row) {
            if ($row['group'] === $group) {
                $result[$key] = static::cast($row['value'] ?? $row['default_value'], $row['type']);
            }
        }
        return $result;
    }

    /**
     * Return the full settings map (from cache).
     * Structure: [ key => ['value', 'default_value', 'type', 'group', ...] ]
     */
    public static function getMap(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return static::query()
                ->get(['key', 'value', 'default_value', 'type', 'group'])
                ->keyBy('key')
                ->map(fn ($r) => $r->toArray())
                ->toArray();
        });
    }

    // ── Write ──────────────────────────────────────────────────────────────────

    /**
     * Update a setting value. Clears the cache.
     */
    public static function set(string $key, mixed $value, ?int $userId = null): bool
    {
        $updated = static::where('key', $key)->update([
            'value'      => is_array($value) ? json_encode($value) : (string) $value,
            'updated_by' => $userId,
            'updated_at' => now(),
        ]);

        static::clearCache();

        return $updated > 0;
    }

    /**
     * Batch-update multiple keys. Wraps in a transaction; clears cache once.
     */
    public static function setMany(array $data, ?int $userId = null): void
    {
        DB::transaction(function () use ($data, $userId) {
            foreach ($data as $key => $value) {
                static::where('key', $key)->update([
                    'value'      => is_array($value) ? json_encode($value) : (string) $value,
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]);
            }
        });

        static::clearCache();
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    // ── Type casting ──────────────────────────────────────────────────────────

    private static function cast(mixed $raw, string $type): mixed
    {
        if ($raw === null) return null;

        return match ($type) {
            'integer' => (int) $raw,
            'decimal' => (float) $raw,
            'boolean' => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            'json'    => is_array($raw) ? $raw : (json_decode($raw, true) ?? []),
            default   => (string) $raw,
        };
    }
    /**
     * Cast a raw value to its proper type based on the setting type
     */
    public static function castPublic(mixed $raw, string $type): mixed
    {
        if ($raw === null) return null;
        
        return match ($type) {
            'integer' => (int) $raw,
            'decimal' => (float) $raw,
            'boolean' => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            'json'    => is_array($raw) ? $raw : (json_decode($raw, true) ?? []),
            default   => (string) $raw,
        };
    }
    // ── Helpers for the API response ──────────────────────────────────────────

    /**
     * Return the typed current value of this instance.
     */
    public function getTypedValueAttribute(): mixed
    {
        return static::cast($this->value ?? $this->default_value, $this->type);
    }

    /** Relationship to the user who last updated this */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}