<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Seeds representative users for every role so a tester can log in
 * as any role and verify the permission gates work correctly.
 *
 * ALL test passwords: HMO@Test2024!
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $hq  = Branch::where('code', 'HQ-001')->first();
        $abj = Branch::where('code', 'ABJ-001')->first();
        $lag = Branch::where('code', 'LAG-001')->first();
        $kan = Branch::where('code', 'KAN-001')->first();
        $riv = Branch::where('code', 'RIV-001')->first();

        $pw = Hash::make('HMO@Test2024!');

        $users = [
            // HQ roles
            ['branch' => $hq,  'email' => 'hqmanager@hmosystem.ng',        'name' => 'Chidi Okonkwo',     'role' => 'hq_manager',          'phone' => '+2348011000002'],
            ['branch' => $hq,  'email' => 'auditor@hmosystem.ng',           'name' => 'Fatima Lawal',      'role' => 'auditor',             'phone' => '+2348011000003'],
            ['branch' => $hq,  'email' => 'hq.finance@hmosystem.ng',        'name' => 'Emeka Eze',         'role' => 'finance_officer',     'phone' => '+2348011000004'],

            // Abuja branch
            ['branch' => $abj, 'email' => 'abj.manager@hmosystem.ng',       'name' => 'Sule Abdullahi',    'role' => 'branch_manager',      'phone' => '+2348022000001'],
            ['branch' => $abj, 'email' => 'abj.supervisor@hmosystem.ng',    'name' => 'Ngozi Obi',         'role' => 'claims_supervisor',   'phone' => '+2348022000002'],
            ['branch' => $abj, 'email' => 'abj.officer1@hmosystem.ng',      'name' => 'Musa Garba',        'role' => 'claims_officer',      'phone' => '+2348022000003'],
            ['branch' => $abj, 'email' => 'abj.officer2@hmosystem.ng',      'name' => 'Amaka Nwosu',       'role' => 'claims_officer',      'phone' => '+2348022000004'],
            ['branch' => $abj, 'email' => 'abj.enroll@hmosystem.ng',        'name' => 'Yakubu Ibrahim',    'role' => 'enrollment_officer',  'phone' => '+2348022000005'],
            ['branch' => $abj, 'email' => 'abj.finance@hmosystem.ng',       'name' => 'Blessing Okafor',   'role' => 'finance_officer',     'phone' => '+2348022000006'],

            // Lagos branch
            ['branch' => $lag, 'email' => 'lag.manager@hmosystem.ng',       'name' => 'Tunde Adeyemi',     'role' => 'branch_manager',      'phone' => '+2348033000001'],
            ['branch' => $lag, 'email' => 'lag.supervisor@hmosystem.ng',    'name' => 'Chioma Adeleke',    'role' => 'claims_supervisor',   'phone' => '+2348033000002'],
            ['branch' => $lag, 'email' => 'lag.officer@hmosystem.ng',       'name' => 'Obinna Igwe',       'role' => 'claims_officer',      'phone' => '+2348033000003'],
            ['branch' => $lag, 'email' => 'lag.enroll@hmosystem.ng',        'name' => 'Kemi Olawale',      'role' => 'enrollment_officer',  'phone' => '+2348033000004'],

            // Kano branch
            ['branch' => $kan, 'email' => 'kan.manager@hmosystem.ng',       'name' => 'Aliyu Musa',        'role' => 'branch_manager',      'phone' => '+2348044000001'],
            ['branch' => $kan, 'email' => 'kan.officer@hmosystem.ng',       'name' => 'Hajiya Zainab',     'role' => 'claims_officer',      'phone' => '+2348044000002'],

            // Rivers branch
            ['branch' => $riv, 'email' => 'riv.manager@hmosystem.ng',       'name' => 'Tonye Briggs',      'role' => 'branch_manager',      'phone' => '+2348055000001'],
            ['branch' => $riv, 'email' => 'riv.officer@hmosystem.ng',       'name' => 'Precious Amadi',    'role' => 'claims_officer',      'phone' => '+2348055000002'],
        ];

        foreach ($users as $u) {
            $user = User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'branch_id' => $u['branch']->id,
                    'name'      => $u['name'],
                    'phone'     => $u['phone'],
                    'password'  => $pw,
                    'status'    => 'active',
                ]
            );

            $role = Role::where('name', $u['role'])->where('guard_name', 'sanctum')->first();
            if ($role) {
                $user->syncRoles([$role]);
            }

            $this->command->info("✔ User: {$u['email']} [{$u['role']}]");
        }
    }
}