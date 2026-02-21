<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        $admin    = User::where('email', 'superadmin@hmosystem.ng')->first();
        $hqMgr    = User::where('email', 'hqmanager@hmosystem.ng')->first();
        $abjMgr   = User::where('email', 'abj.manager@hmosystem.ng')->first();
        $abjOff1  = User::where('email', 'abj.officer1@hmosystem.ng')->first();
        $lagOff   = User::where('email', 'lag.officer@hmosystem.ng')->first();
        $auditor  = User::where('email', 'auditor@hmosystem.ng')->first();

        $hq  = Branch::where('code', 'HQ-001')->first();
        $abj = Branch::where('code', 'ABJ-001')->first();
        $lag = Branch::where('code', 'LAG-001')->first();

        $logs = [
            ['user' => $admin,   'branch' => $hq,  'action' => 'created',        'model_type' => 'App\Models\Branch',             'model_id' => 1,  'desc' => 'Head Office branch created during initial system setup.',                            'date' => '2024-01-01 08:00:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'created',        'model_type' => 'App\Models\User',               'model_id' => 1,  'desc' => 'Super admin account created during system initialization.',                           'date' => '2024-01-01 08:05:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'created',        'model_type' => 'App\Models\Corporate',          'model_id' => 1,  'desc' => 'Corporate CORP-0001 (Zenith Technologies Ltd) registered by super admin.',           'date' => '2024-01-02 09:15:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'created',        'model_type' => 'App\Models\CorporatePlan',      'model_id' => 1,  'desc' => 'Plan ZTL-GOLD-001 (Executive Gold) created for Zenith Technologies.',               'date' => '2024-01-02 09:20:00', 'old' => null, 'new' => null],
            ['user' => $abjMgr,  'branch' => $abj, 'action' => 'created',        'model_type' => 'App\Models\HealthCareProvider', 'model_id' => 2,  'desc' => 'HCP HCP-CLI-0001 (Garki Medical Centre) registered and submitted for accreditation.','date' => '2024-01-05 10:30:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'status_changed', 'model_type' => 'App\Models\HealthCareProvider', 'model_id' => 2,  'desc' => 'HCP HCP-CLI-0001 accredited. Status changed: pending → active.',                    'date' => '2024-01-08 14:00:00', 'old' => ['status' => 'pending'], 'new' => ['status' => 'active']],
            ['user' => $abjMgr,  'branch' => $abj, 'action' => 'created',        'model_type' => 'App\Models\Enrollee',           'model_id' => 1,  'desc' => 'Enrollee HMO-2024-000001 (Chukwuemeka Obiora) registered for Zenith Technologies.', 'date' => '2024-01-10 11:00:00', 'old' => null, 'new' => null],
            ['user' => $abjOff1, 'branch' => $abj, 'action' => 'created',        'model_type' => 'App\Models\Claim',              'model_id' => 1,  'desc' => 'Claim CLM-ABJ-2024-000001 submitted for processing.',                                'date' => '2024-10-07 08:30:00', 'old' => null, 'new' => null],
            ['user' => $abjOff1, 'branch' => $abj, 'action' => 'status_changed', 'model_type' => 'App\Models\Claim',              'model_id' => 1,  'desc' => 'Claim CLM-ABJ-2024-000001 status: submitted → under_review.',                       'date' => '2024-10-07 09:00:00', 'old' => ['status' => 'submitted'], 'new' => ['status' => 'under_review']],
            ['user' => $admin,   'branch' => $abj, 'action' => 'status_changed', 'model_type' => 'App\Models\Claim',              'model_id' => 1,  'desc' => 'Claim CLM-ABJ-2024-000001 approved. Amount: ₦11,000.',                              'date' => '2024-10-09 10:15:00', 'old' => ['status' => 'under_review'], 'new' => ['status' => 'approved', 'total_amount_approved' => 11000]],
            ['user' => $lagOff,  'branch' => $lag, 'action' => 'created',        'model_type' => 'App\Models\Claim',              'model_id' => 8,  'desc' => 'Claim CLM-LAG-2024-000001 for maternity – LUTH Lagos.',                             'date' => '2024-08-20 09:00:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'status_changed', 'model_type' => 'App\Models\Corporate',          'model_id' => 6,  'desc' => 'Corporate CORP-0006 (Shell SPDC) suspended. Reason: contract expiry & outstanding invoice.', 'date' => '2024-07-15 11:00:00', 'old' => ['status' => 'active'], 'new' => ['status' => 'suspended']],
            ['user' => $admin,   'branch' => $hq,  'action' => 'status_changed', 'model_type' => 'App\Models\HealthCareProvider', 'model_id' => 11, 'desc' => 'HCP HCP-CLI-0004 (Braithwaite Memorial) suspended. High fraud score and multiple unresolved flags.', 'date' => '2024-11-20 16:00:00', 'old' => ['status' => 'active'], 'new' => ['status' => 'suspended']],
            ['user' => $auditor, 'branch' => $hq,  'action' => 'updated',        'model_type' => 'App\Models\FraudFlag',          'model_id' => 2,  'desc' => 'Fraud flag reviewed by auditor Fatima Lawal. Status: open → confirmed.',           'date' => '2024-12-03 14:30:00', 'old' => ['status' => 'open'], 'new' => ['status' => 'confirmed']],
            ['user' => $hqMgr,   'branch' => $hq,  'action' => 'created',        'model_type' => 'App\Models\PaymentBatch',       'model_id' => 1,  'desc' => 'Payment batch BATCH-ABJ-2024-001 created and submitted for HQ approval.',          'date' => '2024-10-20 10:00:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'status_changed', 'model_type' => 'App\Models\PaymentBatch',       'model_id' => 1,  'desc' => 'Payment batch BATCH-ABJ-2024-001 approved. Processed to bank.',                    'date' => '2024-10-25 10:00:00', 'old' => ['status' => 'submitted'], 'new' => ['status' => 'approved']],
            ['user' => null,     'branch' => $hq,  'action' => 'created',        'model_type' => null,                            'model_id' => null, 'desc' => 'Scheduled job: Monthly HCP performance scores recalculated for October 2024.',  'date' => '2024-11-01 02:00:00', 'old' => null, 'new' => null],
            ['user' => $admin,   'branch' => $hq,  'action' => 'logged_in',      'model_type' => 'App\Models\User',               'model_id' => 1,  'desc' => 'User superadmin@hmosystem.ng logged in successfully.',                              'date' => '2024-12-05 08:02:00', 'old' => null, 'new' => null],
        ];

        foreach ($logs as $log) {
            // Use DB insert to bypass the immutability boot guard and timestamp auto-set
            DB::table('audit_logs')->insert([
                'user_id'    => $log['user']?->id,
                'branch_id'  => $log['branch']->id,
                'action'     => $log['action'],
                'model_type' => $log['model_type'],
                'model_id'   => $log['model_id'],
                'old_values' => isset($log['old']) && $log['old'] ? json_encode($log['old']) : null,
                'new_values' => isset($log['new']) && $log['new'] ? json_encode($log['new']) : null,
                'ip_address' => '102.89.' . rand(1, 254) . '.' . rand(1, 254),
                'user_agent' => 'Mozilla/5.0 (HMO-ERP-Seeder/2024)',
                'description'=> $log['desc'],
                'created_at' => $log['date'],
            ]);
        }

        $this->command->info('✔ Audit log entries seeded: ' . count($logs));
    }
}