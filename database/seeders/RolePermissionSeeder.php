<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * All permissions in the system, organized by module.
     * Slug format: module.action
     */
    private array $permissions = [
        // ── Branches ──────────────────────────────────────────────────────────
        'branches.view', 'branches.create', 'branches.edit', 'branches.delete',

        // ── Users ─────────────────────────────────────────────────────────────
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'users.assign_roles', 'users.suspend',

        // ── Roles ─────────────────────────────────────────────────────────────
        'roles.view', 'roles.manage',

        // ── Corporates ────────────────────────────────────────────────────────
        'corporates.view', 'corporates.create', 'corporates.edit', 'corporates.delete',
        'corporates.invoices', 'corporates.suspend',

        // ── Enrollees ─────────────────────────────────────────────────────────
        'enrollees.view', 'enrollees.create', 'enrollees.edit',
        'enrollees.transfer', 'enrollees.suspend',

        // ── HCPs ──────────────────────────────────────────────────────────────
        'hcps.view', 'hcps.create', 'hcps.edit', 'hcps.delete',
        'hcps.accredit', 'hcps.blacklist', 'hcps.tariffs', 'hcps.contracts',
        'hcps.bank_details',

        // ── Claims ────────────────────────────────────────────────────────────
        'claims.view', 'claims.submit', 'claims.process',
        'claims.approve', 'claims.reject', 'claims.assign',
        'claims.fraud_view', 'claims.fraud_review', 'claims.reverse',

        // ── Finance ───────────────────────────────────────────────────────────
        'finance.view', 'finance.batch_create', 'finance.batch_approve',
        'finance.ledger_view', 'finance.remittance', 'finance.capitation',

        // ── Reports ───────────────────────────────────────────────────────────
        'reports.branch', 'reports.all_branches', 'reports.audit_logs',
        'reports.export', 'reports.fraud_heatmap',
    ];

    /**
     * Role definitions.
     * 'permissions' => '*' means ALL permissions (super admin).
     */
    private array $roles = [
        'super_admin' => [
            'permissions' => '*',
            'guard_name'  => 'sanctum',
            'description' => 'Full unrestricted system access. HQ only.',
        ],
        'hq_manager' => [
            'permissions' => [
                'branches.view',
                'users.view', 'users.create', 'users.edit', 'users.assign_roles', 'users.suspend',
                'roles.view',
                'corporates.view', 'corporates.create', 'corporates.edit', 'corporates.invoices', 'corporates.suspend',
                'enrollees.view', 'enrollees.create', 'enrollees.edit', 'enrollees.transfer', 'enrollees.suspend',
                'hcps.view', 'hcps.create', 'hcps.edit', 'hcps.accredit', 'hcps.blacklist',
                'hcps.tariffs', 'hcps.contracts', 'hcps.bank_details',
                'claims.view', 'claims.process', 'claims.approve', 'claims.reject',
                'claims.assign', 'claims.fraud_view', 'claims.fraud_review',
                'finance.view', 'finance.batch_create', 'finance.batch_approve',
                'finance.ledger_view', 'finance.remittance', 'finance.capitation',
                'reports.branch', 'reports.all_branches', 'reports.export', 'reports.fraud_heatmap',
            ],
        ],
        'branch_manager' => [
            'permissions' => [
                'branches.view',
                'users.view', 'users.create', 'users.edit', 'users.assign_roles',
                'corporates.view', 'corporates.create', 'corporates.edit', 'corporates.invoices',
                'enrollees.view', 'enrollees.create', 'enrollees.edit',
                'hcps.view', 'hcps.create', 'hcps.edit', 'hcps.tariffs',
                'claims.view', 'claims.process', 'claims.assign', 'claims.fraud_view',
                'finance.view', 'finance.ledger_view',
                'reports.branch', 'reports.export',
            ],
        ],
        'claims_supervisor' => [
            'permissions' => [
                'enrollees.view',
                'hcps.view', 'hcps.tariffs',
                'claims.view', 'claims.process', 'claims.approve', 'claims.reject',
                'claims.assign', 'claims.fraud_view', 'claims.fraud_review',
                'finance.view',
                'reports.branch', 'reports.fraud_heatmap',
            ],
        ],
        'claims_officer' => [
            'permissions' => [
                'enrollees.view',
                'hcps.view',
                'claims.view', 'claims.process', 'claims.reject',
                'reports.branch',
            ],
        ],
        'finance_officer' => [
            'permissions' => [
                'corporates.view', 'corporates.invoices',
                'hcps.view', 'hcps.bank_details',
                'claims.view',
                'finance.view', 'finance.batch_create', 'finance.batch_approve',
                'finance.ledger_view', 'finance.remittance', 'finance.capitation',
                'reports.branch', 'reports.export',
            ],
        ],
        'enrollment_officer' => [
            'permissions' => [
                'corporates.view', 'corporates.create', 'corporates.edit',
                'enrollees.view', 'enrollees.create', 'enrollees.edit',
                'hcps.view',
                'reports.branch',
            ],
        ],
        'auditor' => [
            'permissions' => [
                'branches.view',
                'users.view',
                'roles.view',
                'corporates.view',
                'enrollees.view',
                'hcps.view',
                'claims.view', 'claims.fraud_view',
                'finance.view', 'finance.ledger_view',
                'reports.branch', 'reports.all_branches',
                'reports.audit_logs', 'reports.export', 'reports.fraud_heatmap',
            ],
        ],
    ];

    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create all permissions
        foreach ($this->permissions as $permissionSlug) {
            Permission::firstOrCreate([
                'name'       => $permissionSlug,
                'guard_name' => 'sanctum',
            ]);
        }

        $this->command->info('✔ Permissions seeded: ' . count($this->permissions));

        // Create roles and attach permissions
        foreach ($this->roles as $slug => $definition) {
            $role = Role::firstOrCreate([
                'name'       => $slug,
                'guard_name' => 'sanctum',
            ]);

            if ($definition['permissions'] === '*') {
                $allPermissions = Permission::where('guard_name', 'sanctum')->get();
                $role->syncPermissions($allPermissions);
            } else {
                $role->syncPermissions($definition['permissions']);
            }

            $this->command->info("✔ Role seeded: {$slug} (" . count($definition['permissions'] === '*' ? ['*'] : $definition['permissions']) . " permissions)");
        }

        $this->command->info('✔ All roles and permissions seeded successfully.');
    }
}