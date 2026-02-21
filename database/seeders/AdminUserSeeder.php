<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $hqBranch = Branch::where('type', 'HQ')->firstOrFail();

        $admin = User::firstOrCreate(
            ['email' => 'superadmin@hmosystem.ng'],
            [
                'branch_id'          => $hqBranch->id,
                'name'               => 'System Super Admin',
                'phone'              => '+2348000000001',
                'password'           => Hash::make('HMO@SuperAdmin2024!'),
                'two_factor_enabled' => false,
                'status'             => 'active',
            ]
        );

        // Assign super_admin role (Spatie uses syncRoles for clean assignment)
        $superAdminRole = Role::where('name', 'super_admin')
                              ->where('guard_name', 'sanctum')
                              ->firstOrFail();

        $admin->syncRoles([$superAdminRole]);

        $this->command->info("✔ Super admin created: superadmin@hmosystem.ng");
        $this->command->warn("⚠  IMPORTANT: Change default password immediately after first login!");
        $this->command->warn("   Default password: HMO\@SuperAdmin2024!");
    }
}