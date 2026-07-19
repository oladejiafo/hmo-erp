<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * SystemSettingController
 *
 * Super-admin-only controller for reading and updating all system settings.
 *
 * FILE LOCATION: app/Http/Controllers/Settings/SystemSettingController.php
 *
 * Routes (add to routes/api.php - see routes_settings_block.php):
 *   GET    /settings/system              → index()    - all settings grouped
 *   GET    /settings/system/public       → public()   - safe subset for frontend bootstrap
 *   PUT    /settings/system              → updateMany() - batch update (super_admin only)
 *   PUT    /settings/system/{key}        → update()   - single key update (super_admin only)
 *   POST   /settings/system/reset/{key} → reset()    - reset one key to default
 */
class SystemSettingController extends Controller
{
    // ── Public bootstrap (no auth required) ──────────────────────────────────

    /**
     * GET /settings/system/public
     *
     * Returns the small set of settings the frontend needs on boot before a
     * user is logged in (currency, HMO name, locale).  No auth required.
     * Cache-friendly - these rarely change.
     */
    public function public(): JsonResponse
    {
        return response()->json([
            'hmo_name'        => SystemSetting::get('hmo_info.name',            'HMO System'),
            'hmo_short_name'  => SystemSetting::get('hmo_info.short_name',       'HMO'),
            'hmo_code'        => SystemSetting::get('hmo_info.hmo_code',         ''),
            'currency_code'   => SystemSetting::get('hmo_info.currency_code',    'NGN'),
            'currency_symbol' => SystemSetting::get('hmo_info.currency_symbol',  '₦'),
            'locale'          => SystemSetting::get('hmo_info.locale',           'en-NG'),
            'address'         => SystemSetting::get('hmo_info.address',          ''),
            'phone'           => SystemSetting::get('hmo_info.phone',            ''),
            'email'           => SystemSetting::get('hmo_info.email',            ''),
            'website'         => SystemSetting::get('hmo_info.website',          ''),
        ]);
    }

    // ── Authenticated routes (super_admin only below) ────────────────────────

    /**
     * GET /settings/system
     *
     * Returns all settings, grouped for the admin UI.
     * Response: { groups: { hmo_info: [...], financial: [...], ... } }
     */
    public function index(): JsonResponse
    {
        $this->authorise();

        $settings = SystemSetting::query()
            ->where('is_hidden', false)
            ->orderBy('group')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (SystemSetting $s) => [
                'key'              => $s->key,
                'label'            => $s->label,
                'description'      => $s->description,
                'group'            => $s->group,
                'type'             => $s->type,
                'value'            => $s->typed_value,
                // 'default_value'    => SystemSetting::cast_public($s->default_value, $s->type),
                'default_value'    => SystemSetting::castPublic($s->default_value, $s->type),
                'unit'             => $s->unit,
                'validation_rules' => $s->validation_rules,
                'is_readonly'      => $s->is_readonly,
                'updated_at'       => $s->updated_at,
                'updated_by'       => $s->updater?->name,
            ]);

        $groups = $settings->groupBy('group');

        $groupMeta = [
            'hmo_info'      => ['label' => 'HMO Information',       'icon' => 'building'],
            'financial'     => ['label' => 'Financial & Limits',     'icon' => 'banknote'],
            'sla'           => ['label' => 'SLA Targets',            'icon' => 'clock'],
            'pre_auth'      => ['label' => 'Pre-Authorisation TAT',  'icon' => 'shield-check'],
            'fraud'         => ['label' => 'Fraud Detection',        'icon' => 'alert-triangle'],
            'notifications' => ['label' => 'Notification Thresholds','icon' => 'bell'],
            'operational'   => ['label' => 'Operational',            'icon' => 'settings'],
        ];

        return response()->json([
            'groups'     => $groups,
            'group_meta' => $groupMeta,
        ]);
    }

    /**
     * PUT /settings/system
     *
     * Batch-update multiple settings in a single request.
     * Body: { "fraud.auto_quarantine_threshold": 75, "hmo_info.name": "My HMO" }
     */
    public function updateMany(Request $request): JsonResponse
    {
        $this->authorise();

        $payload = $request->validate([
            '*' => ['required'],
        ]);

        // Fetch all matching settings for type-aware validation
        $meta = SystemSetting::whereIn('key', array_keys($payload))
            ->get()
            ->keyBy('key');

        $errors  = [];
        $updates = [];

        foreach ($payload as $key => $value) {
            $setting = $meta->get($key);

            if (! $setting) {
                $errors[$key] = "Unknown setting key: {$key}";
                continue;
            }

            if ($setting->is_readonly) {
                $errors[$key] = "Setting '{$key}' is read-only.";
                continue;
            }

            $castError = $this->validateValue($value, $setting);
            if ($castError) {
                $errors[$key] = $castError;
                continue;
            }

            $updates[$key] = $value;
        }

        if ($errors) {
            return response()->json(['message' => 'Validation failed.', 'errors' => $errors], 422);
        }

        SystemSetting::setMany($updates, Auth::id());

        return response()->json([
            'message' => count($updates) . ' setting(s) updated successfully.',
            'updated' => array_keys($updates),
        ]);
    }

    /**
     * PUT /settings/system/{key}
     *
     * Update a single setting.
     * Body: { "value": <new-value> }
     */
    public function update(Request $request, string $key): JsonResponse
    {
        $this->authorise();

        $setting = SystemSetting::where('key', $key)->firstOrFail();

        if ($setting->is_readonly) {
            return response()->json(['message' => "Setting '{$key}' is read-only and cannot be changed through the UI."], 403);
        }

        $request->validate(['value' => 'required']);

        $error = $this->validateValue($request->value, $setting);
        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        SystemSetting::set($key, $request->value, Auth::id());

        return response()->json([
            'message' => "Setting '{$setting->label}' updated.",
            'key'     => $key,
            'value'   => SystemSetting::get($key),
        ]);
    }

    /**
     * POST /settings/system/reset/{key}
     *
     * Resets a single setting back to its seeded default value.
     */
    public function reset(string $key): JsonResponse
    {
        $this->authorise();

        $setting = SystemSetting::where('key', $key)->firstOrFail();

        SystemSetting::where('key', $key)->update([
            'value'      => null,
            'updated_by' => Auth::id(),
            'updated_at' => now(),
        ]);

        SystemSetting::clearCache();

        return response()->json([
            'message'       => "Setting '{$setting->label}' reset to default.",
            'key'           => $key,
            'default_value' => SystemSetting::cast_public($setting->default_value, $setting->type),
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function authorise(): void
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        abort_unless(
            $user?->hasRole('super_admin') || $user?->can('settings.system'),
            403,
            'Only Super Administrators can manage system settings.'
        );
    }

    private function validateValue(mixed $value, SystemSetting $setting): ?string
    {
        $rules = $setting->validation_rules ?? [];

        if ($setting->type === 'integer' || $setting->type === 'decimal') {
            if (! is_numeric($value)) {
                return "Value must be numeric.";
            }
            $num = (float) $value;
            if (isset($rules['min']) && $num < $rules['min']) {
                return "Value must be at least {$rules['min']}.";
            }
            if (isset($rules['max']) && $num > $rules['max']) {
                return "Value must be at most {$rules['max']}.";
            }
        }

        if ($setting->type === 'boolean' && ! in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true)) {
            return "Value must be boolean.";
        }

        return null;
    }

    /**
     * Public cast helper so we can expose default_value in typed form.
     */
    public static function cast_public(mixed $raw, string $type): mixed
    {
        if ($raw === null) return null;
        return match ($type) {
            'integer' => (int)   $raw,
            'decimal' => (float) $raw,
            'boolean' => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            'json'    => is_array($raw) ? $raw : (json_decode($raw, true) ?? []),
            default   => (string) $raw,
        };
    }
}