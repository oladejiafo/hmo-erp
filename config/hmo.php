<?php
/**
 * FILE LOCATION: config/hmo.php
 *
 * Static env-based fallbacks only. Runtime values come from SystemSetting::get().
 * Services should call SystemSetting::get('hmo_info.*') rather than config('hmo.*')
 * for any setting that can be changed via the settings UI.
 */

return [
    // These are boot-time / infrastructure settings - kept in env only
    'storage_disk'            => env('HMO_STORAGE_DISK', 'local'),

    // Fallback defaults - real values come from system_settings table
    'name'                    => env('HMO_NAME', 'HMO Management System'),
    'enrollee_id_prefix'      => env('ENROLLEE_ID_PREFIX', 'HMO'),
    'claim_escalation_amount' => env('CLAIM_ESCALATION_AMOUNT', 500000),
    'token_lifetime_hours'    => env('TOKEN_LIFETIME_HOURS', 12),
    'max_dependents'          => 4,
    'dashboard_cache_minutes' => 5,

    // Nigerian states list - static, not configurable via UI
    'states' => [
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
        'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
        'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa',
        'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
        'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
        'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
    ],

    'service_categories' => [
        'consultation', 'procedure', 'laboratory', 'radiology',
        'drug', 'surgery', 'dental', 'optical', 'physiotherapy',
        'maternity', 'emergency',
    ],
    'privacy_notice_version' => env('HMO_PRIVACY_NOTICE_VERSION', 'v1'),
    'mandatory_supervisor_claim_types' => ['inpatient', 'surgery', 'maternity'],
];