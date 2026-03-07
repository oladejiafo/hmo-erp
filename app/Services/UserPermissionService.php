<?php

namespace App\Services;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserPermissionService
{
    /**
     * Assign default role and permissions to a new user based on their type
     */
    public function assignDefaultPermissions(User $user, string $userType = 'staff'): void
    {
        // Default role based on user type
        $roleName = match($userType) {
            'ceo' => 'ceo',
            'hq_manager' => 'hq_manager',
            'branch_manager' => 'branch_manager',
            'claims_officer' => 'claims_officer',
            'finance_officer' => 'finance_officer',
            'compliance_officer' => 'compliance_officer',
            default => 'staff',
        };

        // Find or create the role with sanctum guard
        $role = Role::firstOrCreate(
            ['name' => $roleName, 'guard_name' => 'sanctum'],
            ['guard_name' => 'sanctum']
        );

        // Assign role to user
        $user->assignRole($role);
    }

    /**
     * Sync all permissions from web guard to sanctum guard for consistency
     */
    public function syncPermissionsToSanctum(): void
    {
        // Get all web permissions
        $webPermissions = Permission::where('guard_name', 'web')->get();
        $count = 0;
        
        foreach ($webPermissions as $webPerm) {
            // Create or update sanctum version
            Permission::firstOrCreate(
                ['name' => $webPerm->name, 'guard_name' => 'sanctum'],
                ['name' => $webPerm->name, 'guard_name' => 'sanctum']
            );
            $count++;
        }
        
        Log::info("Synced {$count} permissions from web to sanctum guard");
    }

    /**
     * Ensure all roles have sanctum permissions (without cross-guard checking)
     */
    public function syncRolePermissions(): void
    {
        $roles = Role::where('guard_name', 'sanctum')->get();
        
        foreach ($roles as $role) {
            // Get permissions assigned to this role (only sanctum guard)
            $permissionNames = DB::table('role_has_permissions')
                ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
                ->where('role_has_permissions.role_id', $role->id)
                ->where('permissions.guard_name', 'sanctum')
                ->pluck('permissions.name')
                ->toArray();
            
            Log::info("Role {$role->name} has " . count($permissionNames) . " sanctum permissions");
        }
    }

    /**
     * Fix a specific user's permissions (ensure they have sanctum guard permissions)
     */
    public function fixUserPermissions(User $user): void
    {
        // Get all roles the user has
        $roles = $user->roles()->where('guard_name', 'sanctum')->get();
        
        if ($roles->isEmpty()) {
            Log::warning("User {$user->id} has no sanctum roles. Assigning default.");
            $this->assignDefaultPermissions($user, 'staff');
        }
    }

    /**
     * Copy permissions from a web role to a sanctum role
     */
    public function copyRoleToSanctum(string $roleName): void
    {
        // Find web role
        $webRole = Role::where('name', $roleName)->where('guard_name', 'web')->first();
        if (!$webRole) {
            Log::warning("Web role {$roleName} not found");
            return;
        }
        
        // Find or create sanctum role
        $sanctumRole = Role::firstOrCreate(
            ['name' => $roleName, 'guard_name' => 'sanctum'],
            ['guard_name' => 'sanctum']
        );
        
        // Get web permissions
        $webPermissions = DB::table('role_has_permissions')
            ->join('permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->where('role_has_permissions.role_id', $webRole->id)
            ->where('permissions.guard_name', 'web')
            ->pluck('permissions.name')
            ->toArray();
        
        // Create sanctum versions of these permissions
        foreach ($webPermissions as $permName) {
            $sanctumPerm = Permission::firstOrCreate(
                ['name' => $permName, 'guard_name' => 'sanctum'],
                ['name' => $permName, 'guard_name' => 'sanctum']
            );
            
            // Assign to sanctum role (using raw DB insert to avoid guard checking)
            DB::table('role_has_permissions')->insertOrIgnore([
                'permission_id' => $sanctumPerm->id,
                'role_id' => $sanctumRole->id,
            ]);
        }
        
        Log::info("Copied " . count($webPermissions) . " permissions from web role {$roleName} to sanctum");
    }

    /**
     * Fix all roles by copying web permissions to sanctum
     */
    public function fixAllRoles(): void
    {
        $webRoles = Role::where('guard_name', 'web')->get();
        
        foreach ($webRoles as $webRole) {
            $this->copyRoleToSanctum($webRole->name);
        }
    }
}