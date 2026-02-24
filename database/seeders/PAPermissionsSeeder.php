<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PAPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset permission cache (required by spatie/laravel-permission)
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            ['name' => 'pa.view',             'label' => 'View Pre-Authorisations',      'group' => 'Pre-Authorisation'],
            ['name' => 'pa.request',           'label' => 'Submit PA Request',            'group' => 'Pre-Authorisation'],
            ['name' => 'pa.approve_standard',  'label' => 'Approve PA (Desk Officer)',    'group' => 'Pre-Authorisation'],
            ['name' => 'pa.approve_high_value','label' => 'Approve PA (Medical Director)','group' => 'Pre-Authorisation'],
            ['name' => 'pa.approve_critical',  'label' => 'Approve PA (CEO)',             'group' => 'Pre-Authorisation'],
            ['name' => 'pa.decline',           'label' => 'Decline / Revoke PA',          'group' => 'Pre-Authorisation'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(
                ['name'       => $perm['name'],  'guard_name' => 'web'],
                ['label'      => $perm['label'], 'group'      => $perm['group']]
            );
        }

        // Assign ALL PA permissions to Super Admin role
        $superAdmin = Role::where('name', 'Super Admin')->first();

        if ($superAdmin) {
            $superAdmin->givePermissionTo([
                'pa.view',
                'pa.request',
                'pa.approve_standard',
                'pa.approve_high_value',
                'pa.approve_critical',
                'pa.decline',
            ]);
        }

        $this->command->info('PA permissions seeded and assigned to Super Admin.');
    }
}