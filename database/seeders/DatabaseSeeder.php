<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * ORDER IS CRITICAL - foreign key dependencies must be respected.
     *
     * 1. BranchSeeder          - no deps
     * 2. RolePermissionSeeder  - no deps (Spatie)
     * 3. AdminUserSeeder       - needs: branches, roles
     * 4. UserSeeder            - needs: branches, roles
     * 5. CorporateSeeder       - needs: branches, users (created_by)
     * 6. HCPSeeder             - needs: branches, users
     * 7. EnrolleeSeeder        - needs: branches, corporates, plans, hcps, users
     * 8. ClaimSeeder           - needs: branches, hcps, enrollees, users, tariffs
     * 9. FinanceSeeder         - needs: branches, claims, hcps, users
     * 10. AuditLogSeeder       - needs: branches, users (references any model IDs)
     */
    public function run(): void
    {
        $this->call([
            BranchSeeder::class,
            RolePermissionSeeder::class,
            AdminUserSeeder::class,
            UserSeeder::class,
            CorporateSeeder::class,
            HCPSeeder::class,
            EnrolleeSeeder::class,
            ClaimSeeder::class,
            FinanceSeeder::class,
            AuditLogSeeder::class,
        ]);

        $this->command->newLine();
        $this->command->info('╔══════════════════════════════════════════════════════╗');
        $this->command->info('║          HMO ERP – DATABASE SEEDED SUCCESSFULLY      ║');
        $this->command->info('╠══════════════════════════════════════════════════════╣');
        $this->command->info('║  SUPERADMIN                                           ║');
        $this->command->info('║  Email:    superadmin@hmosystem.ng                    ║');
        $this->command->info('║  Password: HMO@SuperAdmin2024!                        ║');
        $this->command->info('╠══════════════════════════════════════════════════════╣');
        $this->command->info('║  TEST USERS (all password: HMO@Test2024!)             ║');
        $this->command->info('║  hqmanager@hmosystem.ng      hq_manager               ║');
        $this->command->info('║  auditor@hmosystem.ng         auditor                  ║');
        $this->command->info('║  abj.manager@hmosystem.ng    branch_manager (ABJ)     ║');
        $this->command->info('║  abj.supervisor@hmosystem.ng claims_supervisor (ABJ)  ║');
        $this->command->info('║  abj.officer1@hmosystem.ng   claims_officer (ABJ)     ║');
        $this->command->info('║  abj.finance@hmosystem.ng    finance_officer (ABJ)    ║');
        $this->command->info('║  lag.manager@hmosystem.ng    branch_manager (LAG)     ║');
        $this->command->info('║  abj.enroll@hmosystem.ng     enrollment_officer (ABJ) ║');
        $this->command->info('╠══════════════════════════════════════════════════════╣');
        $this->command->info('║  DATA SUMMARY                                         ║');
        $this->command->info('║  5 branches · 8 roles · 40+ permissions               ║');
        $this->command->info('║  6 corporates · 14 plans · 6 invoices                 ║');
        $this->command->info('║  11 HCPs · 25 tariffs/HCP · 11 contracts              ║');
        $this->command->info('║  18 enrollees · 18 cards · 15+ dependents             ║');
        $this->command->info('║  14 claims · all statuses covered                     ║');
        $this->command->info('║  5 payment batches · 18 audit log entries             ║');
        $this->command->info('╚══════════════════════════════════════════════════════╝');
    }
}