<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Claim;
use App\Models\HealthCareProvider;
use App\Models\LedgerEntry;
use App\Models\PaymentBatch;
use App\Models\ProviderPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class FinanceSeeder extends Seeder
{
    public function run(): void
    {
        $abj   = Branch::where('code', 'ABJ-001')->first();
        $lag   = Branch::where('code', 'LAG-001')->first();
        $admin = User::where('email', 'superadmin@hmosystem.ng')->first();
        $hqFin = User::where('email', 'hq.finance@hmosystem.ng')->first();
        $abjFin= User::where('email', 'abj.finance@hmosystem.ng')->first();

        // ── BATCH 1: ABJ – Completed (full lifecycle demo) ─────────────────
        $paidClaimsAbj = Claim::where('branch_id', $abj->id)
            ->whereIn('status', ['paid', 'approved'])
            ->get();

        $totalAbj = $paidClaimsAbj->sum('total_amount_approved');

        $batch1 = PaymentBatch::firstOrCreate(
            ['batch_number' => 'BATCH-ABJ-2024-001'],
            [
                'branch_id'       => $abj->id,
                'description'     => 'October 2024 – Abuja Claims Batch',
                'total_amount'    => $paidClaimsAbj->whereIn('status', ['paid'])->sum('total_amount_approved'),
                'claim_count'     => $paidClaimsAbj->where('status', 'paid')->count(),
                'provider_count'  => $paidClaimsAbj->where('status', 'paid')->pluck('hcp_id')->unique()->count(),
                'status'          => 'completed',
                'created_by'      => $abjFin->id,
                'approved_by'     => $admin->id,
                'approved_at'     => '2024-10-25 10:00:00',
                'processed_at'    => '2024-10-28 09:00:00',
                'bank_reference'  => 'GTBANK-BATCH-OCT24-0001',
            ]
        );

        // Provider payments for batch 1 (paid claims only)
        foreach ($paidClaimsAbj->where('status', 'paid') as $claim) {
            ProviderPayment::firstOrCreate(
                ['claim_id' => $claim->id],
                [
                    'batch_id'          => $batch1->id,
                    'hcp_id'            => $claim->hcp_id,
                    'amount'            => $claim->total_amount_approved,
                    'status'            => 'paid',
                    'payment_reference' => 'PAY-' . strtoupper(substr(md5($claim->claim_number), 0, 8)),
                    'paid_at'           => '2024-10-28 09:00:00',
                ]
            );
        }

        // ── BATCH 2: ABJ – Submitted (pending approval) ────────────────────
        $approvedClaimsAbj = Claim::where('branch_id', $abj->id)
            ->where('status', 'approved')
            ->get();

        if ($approvedClaimsAbj->count() > 0) {
            $batch2 = PaymentBatch::firstOrCreate(
                ['batch_number' => 'BATCH-ABJ-2024-002'],
                [
                    'branch_id'      => $abj->id,
                    'description'    => 'November 2024 – Abuja Claims Batch (Pending Approval)',
                    'total_amount'   => $approvedClaimsAbj->sum('total_amount_approved'),
                    'claim_count'    => $approvedClaimsAbj->count(),
                    'provider_count' => $approvedClaimsAbj->pluck('hcp_id')->unique()->count(),
                    'status'         => 'submitted',
                    'created_by'     => $abjFin->id,
                    'approved_by'    => null,
                    'approved_at'    => null,
                    'processed_at'   => null,
                ]
            );

            foreach ($approvedClaimsAbj as $claim) {
                ProviderPayment::firstOrCreate(
                    ['claim_id' => $claim->id],
                    [
                        'batch_id'  => $batch2->id,
                        'hcp_id'    => $claim->hcp_id,
                        'amount'    => $claim->total_amount_approved,
                        'status'    => 'pending',
                    ]
                );
            }
            $this->command->info("✔ Batch 2 (ABJ – submitted): BATCH-ABJ-2024-002");
        }

        // ── BATCH 3: ABJ – Draft ───────────────────────────────────────────
        PaymentBatch::firstOrCreate(
            ['batch_number' => 'BATCH-ABJ-2024-003'],
            [
                'branch_id'      => $abj->id,
                'description'    => 'December 2024 – Abuja Claims Batch (Draft)',
                'total_amount'   => 0,
                'claim_count'    => 0,
                'provider_count' => 0,
                'status'         => 'draft',
                'created_by'     => $abjFin->id,
            ]
        );
        $this->command->info("✔ Batch 3 (ABJ – draft): BATCH-ABJ-2024-003");

        // ── BATCH 4: LAGOS – Completed ─────────────────────────────────────
        $paidClaimsLag = Claim::where('branch_id', $lag->id)
            ->where('status', 'paid')
            ->get();

        if ($paidClaimsLag->count() > 0) {
            $batch4 = PaymentBatch::firstOrCreate(
                ['batch_number' => 'BATCH-LAG-2024-001'],
                [
                    'branch_id'       => $lag->id,
                    'description'     => 'August–September 2024 – Lagos Claims Batch',
                    'total_amount'    => $paidClaimsLag->sum('total_amount_approved'),
                    'claim_count'     => $paidClaimsLag->count(),
                    'provider_count'  => $paidClaimsLag->pluck('hcp_id')->unique()->count(),
                    'status'          => 'completed',
                    'created_by'      => $hqFin->id,
                    'approved_by'     => $admin->id,
                    'approved_at'     => '2024-09-10 11:00:00',
                    'processed_at'    => '2024-09-12 09:00:00',
                    'bank_reference'  => 'FIRSTBANK-BATCH-SEP24-0001',
                ]
            );

            foreach ($paidClaimsLag as $claim) {
                ProviderPayment::firstOrCreate(
                    ['claim_id' => $claim->id],
                    [
                        'batch_id'          => $batch4->id,
                        'hcp_id'            => $claim->hcp_id,
                        'amount'            => $claim->total_amount_approved,
                        'status'            => 'paid',
                        'payment_reference' => 'PAY-' . strtoupper(substr(md5($claim->claim_number), 0, 8)),
                        'paid_at'           => '2024-09-12 09:00:00',
                    ]
                );
            }
            $this->command->info("✔ Batch 4 (LAG – completed): BATCH-LAG-2024-001");
        }

        // ── BATCH 5: LAGOS – Approved (awaiting processing) ───────────────
        $approvedClaimsLag = Claim::where('branch_id', $lag->id)
            ->where('status', 'approved')
            ->get();

        if ($approvedClaimsLag->count() > 0) {
            $batch5 = PaymentBatch::firstOrCreate(
                ['batch_number' => 'BATCH-LAG-2024-002'],
                [
                    'branch_id'      => $lag->id,
                    'description'    => 'November 2024 – Lagos Claims Batch (Approved)',
                    'total_amount'   => $approvedClaimsLag->sum('total_amount_approved'),
                    'claim_count'    => $approvedClaimsLag->count(),
                    'provider_count' => $approvedClaimsLag->pluck('hcp_id')->unique()->count(),
                    'status'         => 'approved',
                    'created_by'     => $hqFin->id,
                    'approved_by'    => $admin->id,
                    'approved_at'    => '2024-11-20 14:00:00',
                    'processed_at'   => null,
                ]
            );

            foreach ($approvedClaimsLag as $claim) {
                ProviderPayment::firstOrCreate(
                    ['claim_id' => $claim->id],
                    [
                        'batch_id'  => $batch5->id,
                        'hcp_id'    => $claim->hcp_id,
                        'amount'    => $claim->total_amount_approved,
                        'status'    => 'pending',
                    ]
                );
            }
            $this->command->info("✔ Batch 5 (LAG – approved): BATCH-LAG-2024-002");
        }

        $this->command->info("✔ Batch 1 (ABJ – completed): BATCH-ABJ-2024-001");

        // ── LEDGER ENTRIES ─────────────────────────────────────────────────
        // Seed representative ledger entries for both branches

        $ledger = [
            // ABUJA
            ['branch' => $abj, 'type' => 'credit', 'cat' => 'premium_received',  'amount' => 59209000,  'desc' => 'Q1 2024 Premium – Zenith Technologies Ltd', 'ref_type' => 'App\Models\CorporateInvoice', 'ref_id' => 1, 'date' => '2024-01-18'],
            ['branch' => $abj, 'type' => 'credit', 'cat' => 'premium_received',  'amount' => 10625000,  'desc' => 'January 2024 Premium – FMOH',               'ref_type' => null, 'ref_id' => null, 'date' => '2024-01-28'],
            ['branch' => $abj, 'type' => 'debit',  'cat' => 'claim_payment',     'amount' => 14500,     'desc' => 'Claims batch OCT24 – Garki Medical Centre', 'ref_type' => 'App\Models\PaymentBatch', 'ref_id' => $batch1->id, 'date' => '2024-10-28'],
            ['branch' => $abj, 'type' => 'debit',  'cat' => 'claim_payment',     'amount' => 307600,    'desc' => 'Claims batch OCT24 – National Hospital Abuja','ref_type' => 'App\Models\PaymentBatch', 'ref_id' => $batch1->id, 'date' => '2024-10-28'],
            ['branch' => $abj, 'type' => 'debit',  'cat' => 'administrative_fee', 'amount' => 150000,  'desc' => 'October 2024 – Claims Processing Fee',        'ref_type' => null, 'ref_id' => null, 'date' => '2024-10-31'],
            // LAGOS
            ['branch' => $lag, 'type' => 'credit', 'cat' => 'premium_received',  'amount' => 207000000, 'desc' => 'H2 2024 Premium – Dangote Industries Group', 'ref_type' => 'App\Models\CorporateInvoice', 'ref_id' => 2, 'date' => '2024-06-25'],
            ['branch' => $lag, 'type' => 'debit',  'cat' => 'claim_payment',     'amount' => 133700,    'desc' => 'Claims batch SEP24 – LUTH',                  'ref_type' => 'App\Models\PaymentBatch', 'ref_id' => isset($batch4) ? $batch4->id : null, 'date' => '2024-09-12'],
            ['branch' => $lag, 'type' => 'debit',  'cat' => 'administrative_fee', 'amount' => 500000,  'desc' => 'September 2024 – Claims Processing Fee',      'ref_type' => null, 'ref_id' => null, 'date' => '2024-09-30'],
            ['branch' => $lag, 'type' => 'credit', 'cat' => 'refund',             'amount' => 25000,   'desc' => 'Claim CLM-LAG-2024-000002 Partial Refund',    'ref_type' => null, 'ref_id' => null, 'date' => '2024-09-20'],
        ];

        $runningBalAbj = 0;
        $runningBalLag = 0;

        foreach ($ledger as $entry) {
            $amount = $entry['amount'];
            if ($entry['branch']->id === $abj->id) {
                $runningBalAbj = $entry['type'] === 'credit'
                    ? $runningBalAbj + $amount
                    : $runningBalAbj - $amount;
                $balance = $runningBalAbj;
            } else {
                $runningBalLag = $entry['type'] === 'credit'
                    ? $runningBalLag + $amount
                    : $runningBalLag - $amount;
                $balance = $runningBalLag;
            }

            DB::table('ledger_entries')->insert([
                'branch_id'       => $entry['branch']->id,
                'entry_type'      => $entry['type'],
                'category'        => $entry['cat'],
                'amount'          => $amount,
                'running_balance' => $balance,
                'reference_type'  => $entry['ref_type'],
                'reference_id'    => $entry['ref_id'],
                'description'     => $entry['desc'],
                'created_by'      => $hqFin->id,
                'created_at'      => $entry['date'] . ' 09:00:00',
            ]);
        }

        $this->command->info('✔ Ledger entries seeded: ' . count($ledger));
    }
}