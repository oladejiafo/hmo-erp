<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Licensing Settings Seeder
 * 
 * Adds licensing configuration settings to the system_settings table.
 * These settings control license behavior and are visible in the
 * System Settings admin UI under the "Licensing" tab.
 * 
 * Run this seeder separately:
 *   php artisan db:seed --class=LicensingSettingsSeeder
 */
class LicensingSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'key'              => 'licensing.checkin_failures_before_grace',
                'label'            => 'Check-in Failures Before Grace',
                'description'      => 'Number of consecutive failed check-ins required before the system enters grace period. Higher = more tolerant of network issues. Default: 3.',
                'group'            => 'licensing',
                'type'             => 'integer',
                'default_value'    => '3',
                'value'            => null, // null means use default
                'unit'             => 'failures',
                'validation_rules' => json_encode(['min' => 1, 'max' => 10]),
                'is_hidden'        => false,
                'is_readonly'      => false,
                'sort_order'       => 1,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'key'              => 'licensing.min_failure_hours_before_grace',
                'label'            => 'Minimum Hours Before Grace Triggers',
                'description'      => 'Even after enough failures, grace only triggers if the first failure was at least this many hours ago. Prevents a brief outage from restricting the system.',
                'group'            => 'licensing',
                'type'             => 'integer',
                'default_value'    => '48',
                'value'            => null,
                'unit'             => 'hours',
                'validation_rules' => json_encode(['min' => 1, 'max' => 168]),
                'is_hidden'        => false,
                'is_readonly'      => false,
                'sort_order'       => 2,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'key'              => 'licensing.show_banner_on_grace',
                'label'            => 'Show Banner During Grace Period',
                'description'      => 'Display a warning banner to admin users when the license is in grace period.',
                'group'            => 'licensing',
                'type'             => 'boolean',
                'default_value'    => 'true',
                'value'            => null,
                'unit'             => null,
                'validation_rules' => null,
                'is_hidden'        => false,
                'is_readonly'      => false,
                'sort_order'       => 3,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
            [
                'key'              => 'licensing.restricted_message',
                'label'            => 'Restricted Mode Message',
                'description'      => 'Message shown to all users when the system is in restricted mode.',
                'group'            => 'licensing',
                'type'             => 'string',
                'default_value'    => 'This system is currently in restricted mode due to a licensing issue. Please contact your system administrator.',
                'value'            => null,
                'unit'             => null,
                'validation_rules' => null,
                'is_hidden'        => false,
                'is_readonly'      => false,
                'sort_order'       => 4,
                'created_at'       => now(),
                'updated_at'       => now(),
            ],
        ];

        foreach ($settings as $setting) {
            // Use updateOrInsert to avoid duplicates if seeder is run multiple times
            DB::table('system_settings')->updateOrInsert(
                ['key' => $setting['key']],
                $setting
            );
        }

        $this->command->info('Licensing settings seeded successfully.');
    }
}