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
        'hcps.suspend', // ADDED - HCP suspend/reactivate

        // ── Claims ────────────────────────────────────────────────────────────
        'claims.view', 'claims.submit', 'claims.process',
        'claims.approve', 'claims.reject', 'claims.assign',
        'claims.fraud_view', 'claims.fraud_review', 'claims.reverse',
        'claims.import', // ADDED - Bulk claims import

        // ── Finance ───────────────────────────────────────────────────────────
        'finance.view', 'finance.batch_create', 'finance.batch_approve',
        'finance.ledger_view', 'finance.remittance', 'finance.capitation',
        'finance.ffs', // ADDED - Finance FFS

        // ── Reimbursements ────────────────────────────────────────────────────
        'reimbursements.view',     // See reimbursement request queue
        'reimbursements.review',   // Approve/reject/mark-paid

        // ── Ticketing - Phase 3 ────────────────────────────────────────────────
        'tickets.view',
        'tickets.manage',

        // ── Reports ───────────────────────────────────────────────────────────
        'reports.branch', 'reports.all_branches', 'reports.audit_logs',
        'reports.export', 'reports.fraud_heatmap',

        // ── Pre-Authorisation (PA) - Phase 2 ─────────────────────────────────
        'pa.view',               // See PA queue, detail, TAT report
        'pa.request',            // Submit a new PA request
        'pa.approve_standard',   // Desk Officer - first step for all tiers
        'pa.approve_high_value', // Medical Director - ₦500k–₦2M tier
        'pa.approve_critical',   // CEO - above ₦2M tier
        'pa.decline',            // Decline any active PA / revoke approved code

        // ── Compliance Calendar - Phase 4 ─────────────────────────────────────
        'compliance.view',       // See filings, calendar
        'compliance.manage',     // Create/update filings, mark complete, upload docs

        // ── Telemedicine - Phase 1 ────────────────────────────────────────────
        'telemedicine.view',     // HQ/branch staff oversight of encounters

        // ── Mini EMR - Phase 3 ─────────────────────────────────────────────────
        'emr.view',               // HQ/branch staff oversight of clinical records

        // ── Plans ─────────────────────────────────────────────────────────────
        'plans.view', 'plans.create', 'plans.edit',

        // ── Corporate Plan Requests ────────────────────────────────
        'plan_requests.view', 'plan_requests.review',

        // ── Portal Self-Service Access ─────────────────────────────────────────
        'portal.enrollee.access',
        'portal.corporate.access',
        'portal.provider.access',

        // ── AI Tools ──────────────────────────────────────────────────────────
        'ai.tools', // ADDED

        // ── Help Centre admin ─────────────────────────────────────────────────
        'help.admin', // ADDED

        // ── Bulk import (enrollees/tariffs/hcps) ─────────────────────────────
        'import.enrollees', // ADDED

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
                'hcps.tariffs', 'hcps.contracts', 'hcps.bank_details', 'hcps.suspend', // ADDED
                'claims.view', 'claims.process', 'claims.approve', 'claims.reject',
                'claims.assign', 'claims.fraud_view', 'claims.fraud_review', 'claims.import', // ADDED
                'finance.view', 'finance.batch_create', 'finance.batch_approve',
                'finance.ledger_view', 'finance.remittance', 'finance.capitation', 'finance.ffs', // ADDED
                'reimbursements.view', 'reimbursements.review',
                'reports.branch', 'reports.all_branches', 'reports.export', 'reports.fraud_heatmap',
                'tickets.view', 'tickets.manage',
                'plans.view', 'plans.create', 'plans.edit',
                'plan_requests.view', 'plan_requests.review',
                'ai.tools', // ADDED
                'help.admin', // ADDED
                'import.enrollees', // ADDED
                'telemedicine.view', // PHASE 1
                'emr.view', // PHASE 3
            ],
        ],
        'branch_manager' => [
            'permissions' => [
                'branches.view',
                'users.view', 'users.create', 'users.edit', 'users.assign_roles',
                'corporates.view', 'corporates.create', 'corporates.edit', 'corporates.invoices',
                'enrollees.view', 'enrollees.create', 'enrollees.edit',
                'hcps.view', 'hcps.create', 'hcps.edit', 'hcps.tariffs', 'hcps.suspend', // ADDED
                'claims.view', 'claims.process', 'claims.assign', 'claims.fraud_view', 'claims.import', // ADDED
                'finance.view', 'finance.ledger_view',
                'reimbursements.view', 'reimbursements.review',
                'reports.branch', 'reports.export',
                'pa.view', 'pa.approve_standard', 'pa.approve_high_value', 'pa.decline',
                'compliance.view', 'compliance.manage',
                'tickets.view', 'tickets.manage',
                'plans.view', 'plans.create', 'plans.edit',
                'plan_requests.view', 'plan_requests.review',
                'ai.tools', // ADDED
                'help.admin', // ADDED
                'import.enrollees', // ADDED
                'telemedicine.view', // PHASE 1
                'emr.view', // PHASE 3
            ],
        ],
        'claims_supervisor' => [
            'permissions' => [
                'enrollees.view',
                'hcps.view', 'hcps.tariffs',
                'claims.view', 'claims.process', 'claims.approve', 'claims.reject',
                'claims.assign', 'claims.fraud_view', 'claims.fraud_review', 'claims.import', // ADDED
                'finance.view', 'reimbursements.view',
                'reports.branch', 'reports.fraud_heatmap',
                'pa.view', 'pa.approve_standard', 'pa.decline',
                'tickets.view', 'tickets.manage',
                'ai.tools', // ADDED
            ],
        ],
        'claims_officer' => [
            'permissions' => [
                'enrollees.view',
                'hcps.view',
                'claims.view', 'claims.process', 'claims.reject',
                'reports.branch',
                'pa.view', 'pa.request', 'pa.approve_standard', 'pa.decline',
                'tickets.view',
                'ai.tools', // ADDED
            ],
        ],
        'finance_officer' => [
            'permissions' => [
                'corporates.view', 'corporates.invoices',
                'hcps.view', 'hcps.bank_details',
                'claims.view',
                'finance.view', 'finance.batch_create', 'finance.batch_approve',
                'finance.ledger_view', 'finance.remittance', 'finance.capitation', 'finance.ffs', // ADDED
                'reimbursements.view', 'reimbursements.review',
                'reports.branch', 'reports.export',
                'pa.view',
            ],
        ],
        'enrollment_officer' => [
            'permissions' => [
                'corporates.view', 'corporates.create', 'corporates.edit',
                'enrollees.view', 'enrollees.create', 'enrollees.edit',
                'hcps.view', 
                'plans.view', 'plans.create', 'plan_requests.view',
                'reports.branch',
                'pa.view', 
                'tickets.view',
                'import.enrollees', // ADDED
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
                'plans.view', 'plan_requests.view',
                'claims.view', 'claims.fraud_view',
                'finance.view', 'finance.ledger_view',
                'reports.branch', 'reports.all_branches',
                'reports.audit_logs', 'reports.export', 'reports.fraud_heatmap',
                'pa.view', 'compliance.view', 'reimbursements.view', 'tickets.view',
                'plans.view', // ADDED (was missing)
            ],
        ],
        'medical_director' => [
            'permissions' => [
                'enrollees.view',
                'hcps.view',
                'claims.view', 'claims.fraud_view',
                'reports.branch',
                'pa.view', 'pa.approve_standard', 'pa.approve_high_value', 'pa.decline',
                'ai.tools', // ADDED
            ],
        ],
        'ceo' => [
            'permissions' => [
                'branches.view',
                'corporates.view',
                'enrollees.view',
                'hcps.view',
                'claims.view',
                'finance.view', 'finance.ledger_view',
                'reports.branch', 'reports.all_branches', 'reports.export',
                'pa.view', 'pa.approve_critical', 'pa.decline',
            ],
        ],
        'enrollee_user' => [
            'permissions' => ['portal.enrollee.access'],
            'guard_name'  => 'sanctum',
            'description' => 'Self-service portal access for enrollees.',
        ],
        'corporate_user' => [
            'permissions' => ['portal.corporate.access'],
            'guard_name'  => 'sanctum',
            'description' => 'Self-service portal access for corporate HR contacts.',
        ],
        'hcp_user' => [
            'permissions' => ['portal.provider.access'],
            'guard_name'  => 'sanctum',
            'description' => 'Self-service portal access for healthcare providers.',
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