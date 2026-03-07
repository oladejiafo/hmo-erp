<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\UserPermissionService;
use Illuminate\Console\Command;

class FixUserPermissions extends Command
{
    protected $signature = 'permissions:fix {user? : Specific user ID to fix}';
    protected $description = 'Fix user permissions to ensure sanctum guard consistency';

    public function handle(UserPermissionService $permissionService)
    {
        $this->info('Fixing permissions...');

        // First sync all permissions to sanctum
        $permissionService->syncPermissionsToSanctum();
        $this->info('✓ Synced permissions to sanctum guard');

        // Fix all roles
        $permissionService->fixAllRoles();
        $this->info('✓ Synced role permissions');

        // Fix specific user or all users
        if ($userId = $this->argument('user')) {
            $user = User::find($userId);
            if (!$user) {
                $this->error("User {$userId} not found");
                return 1;
            }
            $permissionService->fixUserPermissions($user);
            $this->info("✓ Fixed permissions for user {$user->name}");
        } else {
            $users = User::all();
            $bar = $this->output->createProgressBar(count($users));
            
            foreach ($users as $user) {
                $permissionService->fixUserPermissions($user);
                $bar->advance();
            }
            
            $bar->finish();
            $this->newLine();
            $this->info('✓ Fixed permissions for all users');
        }

        $this->info('');
        $this->info('✅ All done! Users may need to log out and back in.');

        return 0;
    }
}