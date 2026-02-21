<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Corporate;
use App\Models\CorporatePlan;
use App\Models\Dependent;
use App\Models\Enrollee;
use App\Models\EnrolleeCard;
use App\Models\HealthCareProvider;
use App\Models\User;
use Illuminate\Database\Seeder;

class EnrolleeSeeder extends Seeder
{
    private int $counter = 0;

    private function nextId(): string
    {
        $this->counter++;
        return 'HMO-2024-' . str_pad($this->counter, 6, '0', STR_PAD_LEFT);
    }

    private function cardNumber(string $enrolleeId): string
    {
        return 'CARD-' . strtoupper(substr(md5($enrolleeId), 0, 12));
    }

    public function run(): void
    {
        $admin = User::where('email', 'superadmin@hmosystem.ng')->first();
        $abj   = Branch::where('code', 'ABJ-001')->first();
        $lag   = Branch::where('code', 'LAG-001')->first();
        $kan   = Branch::where('code', 'KAN-001')->first();
        $riv   = Branch::where('code', 'RIV-001')->first();

        // HCPs for primary assignment
        $hcpAbj = HealthCareProvider::where('hcp_code', 'HCP-CLI-0001')->first();
        $hcpLag = HealthCareProvider::where('hcp_code', 'HCP-CLI-0002')->first();
        $hcpKan = HealthCareProvider::where('hcp_code', 'HCP-HOS-0003')->first();
        $hcpRiv = HealthCareProvider::where('hcp_code', 'HCP-HOS-0004')->first();

        // Corporates
        $zenith  = Corporate::where('code', 'CORP-0001')->first();
        $dangote = Corporate::where('code', 'CORP-0002')->first();
        $fmoh    = Corporate::where('code', 'CORP-0003')->first();
        $access  = Corporate::where('code', 'CORP-0004')->first();
        $ksth    = Corporate::where('code', 'CORP-0005')->first();
        $shell   = Corporate::where('code', 'CORP-0006')->first();

        // Plans
        $zenithGold   = CorporatePlan::where('plan_code', 'ZTL-GOLD-001')->first();
        $zenithSilver = CorporatePlan::where('plan_code', 'ZTL-SILV-001')->first();
        $dangDiamond  = CorporatePlan::where('plan_code', 'DIG-DIAM-001')->first();
        $dangGold     = CorporatePlan::where('plan_code', 'DIG-GOLD-001')->first();
        $dangBronze   = CorporatePlan::where('plan_code', 'DIG-BRNZ-001')->first();
        $fmohComp     = CorporatePlan::where('plan_code', 'GOV-COMP-001')->first();
        $accessPlat   = CorporatePlan::where('plan_code', 'ABP-PLAT-001')->first();
        $accessPrem   = CorporatePlan::where('plan_code', 'ABP-PREM-001')->first();
        $ksthElite    = CorporatePlan::where('plan_code', 'KST-ELIT-001')->first();
        $shellComp    = CorporatePlan::where('plan_code', 'SHE-COMP-001')->first();

        $raw = [
            // ── Zenith Technologies – ABJ ─────────────────────────────────
            ['branch' => $abj, 'corp' => $zenith, 'plan' => $zenithGold,   'hcp' => $hcpAbj, 'first' => 'Chukwuemeka', 'last' => 'Obiora',  'mid' => 'Francis',   'dob' => '1980-03-15', 'gender' => 'M', 'phone' => '+2348011001001', 'staff_id' => 'ZTL-EMP-001', 'benefit_balance' => 1800000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Adaeze',  'last' => 'Obiora', 'dob' => '1983-07-22', 'gender' => 'F', 'relationship' => 'spouse'],
                 ['first' => 'Chidubem','last' => 'Obiora', 'dob' => '2010-11-05', 'gender' => 'M', 'relationship' => 'child'],
                 ['first' => 'Somtochi','last' => 'Obiora', 'dob' => '2013-04-18', 'gender' => 'F', 'relationship' => 'child'],
             ]],
            ['branch' => $abj, 'corp' => $zenith, 'plan' => $zenithGold,   'hcp' => $hcpAbj, 'first' => 'Fatima',      'last' => 'Abdulkadir','mid' => 'Binta',    'dob' => '1975-09-20', 'gender' => 'F', 'phone' => '+2348011001002', 'staff_id' => 'ZTL-EMP-002', 'benefit_balance' => 1750000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Musa',   'last' => 'Abdulkadir', 'dob' => '1972-04-10', 'gender' => 'M', 'relationship' => 'spouse'],
             ]],
            ['branch' => $abj, 'corp' => $zenith, 'plan' => $zenithSilver, 'hcp' => $hcpAbj, 'first' => 'Seun',        'last' => 'Adeyemi',  'mid' => 'Abiola',    'dob' => '1992-06-11', 'gender' => 'M', 'phone' => '+2348011001003', 'staff_id' => 'ZTL-EMP-003', 'benefit_balance' => 620000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Toyin', 'last' => 'Adeyemi', 'dob' => '1994-02-28', 'gender' => 'F', 'relationship' => 'spouse'],
             ]],
            ['branch' => $abj, 'corp' => $zenith, 'plan' => $zenithSilver, 'hcp' => $hcpAbj, 'first' => 'Ngozi',       'last' => 'Okonkwo',  'mid' => 'Chioma',    'dob' => '1988-12-30', 'gender' => 'F', 'phone' => '+2348011001004', 'staff_id' => 'ZTL-EMP-004', 'benefit_balance' => 580000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => []],
            ['branch' => $abj, 'corp' => $zenith, 'plan' => $zenithSilver, 'hcp' => $hcpAbj, 'first' => 'Ifeanyi',     'last' => 'Nwosu',    'mid' => null,         'dob' => '1995-04-22', 'gender' => 'M', 'phone' => '+2348011001005', 'staff_id' => 'ZTL-EMP-005', 'benefit_balance' => 0, 'enrollment_date' => '2023-01-01', 'expiry_date' => '2023-12-31', 'status' => 'inactive',
             'dependents' => []],

            // ── Dangote – Lagos ───────────────────────────────────────────
            ['branch' => $lag, 'corp' => $dangote, 'plan' => $dangDiamond, 'hcp' => $hcpLag, 'first' => 'Aliko',       'last' => 'Bello',    'mid' => 'Muhammed',  'dob' => '1965-04-03', 'gender' => 'M', 'phone' => '+2348022001001', 'staff_id' => 'DIG-EXE-001', 'benefit_balance' => 4500000, 'enrollment_date' => '2023-07-01', 'expiry_date' => '2025-06-30', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Mariam',  'last' => 'Bello', 'dob' => '1970-08-15', 'gender' => 'F', 'relationship' => 'spouse'],
                 ['first' => 'Ibrahim', 'last' => 'Bello', 'dob' => '1998-03-20', 'gender' => 'M', 'relationship' => 'child'],
                 ['first' => 'Halima',  'last' => 'Bello', 'dob' => '2000-11-11', 'gender' => 'F', 'relationship' => 'child'],
                 ['first' => 'Fatima',  'last' => 'Bello', 'dob' => '2005-06-07', 'gender' => 'F', 'relationship' => 'child'],
             ]],
            ['branch' => $lag, 'corp' => $dangote, 'plan' => $dangGold,    'hcp' => $hcpLag, 'first' => 'Tunde',       'last' => 'Fashola',  'mid' => 'Adewale',   'dob' => '1978-02-25', 'gender' => 'M', 'phone' => '+2348022001002', 'staff_id' => 'DIG-MID-001', 'benefit_balance' => 1200000, 'enrollment_date' => '2023-07-01', 'expiry_date' => '2025-06-30', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Yetunde', 'last' => 'Fashola', 'dob' => '1980-09-14', 'gender' => 'F', 'relationship' => 'spouse'],
             ]],
            ['branch' => $lag, 'corp' => $dangote, 'plan' => $dangGold,    'hcp' => $hcpLag, 'first' => 'Chidinma',    'last' => 'Eze',      'mid' => 'Blessing',  'dob' => '1990-07-16', 'gender' => 'F', 'phone' => '+2348022001003', 'staff_id' => 'DIG-MID-002', 'benefit_balance' => 950000, 'enrollment_date' => '2023-07-01', 'expiry_date' => '2025-06-30', 'status' => 'active',
             'dependents' => []],
            ['branch' => $lag, 'corp' => $dangote, 'plan' => $dangBronze,  'hcp' => $hcpLag, 'first' => 'Emeka',       'last' => 'Okafor',   'mid' => null,         'dob' => '1985-11-08', 'gender' => 'M', 'phone' => '+2348022001004', 'staff_id' => 'DIG-SUP-001', 'benefit_balance' => 250000, 'enrollment_date' => '2023-07-01', 'expiry_date' => '2025-06-30', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Adaeze', 'last' => 'Okafor', 'dob' => '1987-05-30', 'gender' => 'F', 'relationship' => 'spouse'],
             ]],
            ['branch' => $lag, 'corp' => $dangote, 'plan' => $dangBronze,  'hcp' => $hcpLag, 'first' => 'Lanre',       'last' => 'Williams', 'mid' => null,         'dob' => '1993-03-05', 'gender' => 'M', 'phone' => '+2348022001005', 'staff_id' => 'DIG-SUP-002', 'benefit_balance' => 180000, 'enrollment_date' => '2023-07-01', 'expiry_date' => '2025-06-30', 'status' => 'suspended',
             'dependents' => []],

            // ── Federal Ministry of Health – ABJ ─────────────────────────
            ['branch' => $abj, 'corp' => $fmoh, 'plan' => $fmohComp,   'hcp' => $hcpAbj, 'first' => 'Yemi',        'last' => 'Afolabi',  'mid' => 'Adewale',   'dob' => '1970-06-12', 'gender' => 'M', 'phone' => '+2348033001001', 'staff_id' => 'FMOH-DIR-001', 'benefit_balance' => 550000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Funke',  'last' => 'Afolabi', 'dob' => '1973-09-18', 'gender' => 'F', 'relationship' => 'spouse'],
                 ['first' => 'Kola',   'last' => 'Afolabi', 'dob' => '2001-12-01', 'gender' => 'M', 'relationship' => 'child'],
             ]],
            ['branch' => $abj, 'corp' => $fmoh, 'plan' => $fmohComp,   'hcp' => $hcpAbj, 'first' => 'Bola',        'last' => 'Kuti',     'mid' => 'Ajoke',     'dob' => '1982-01-25', 'gender' => 'F', 'phone' => '+2348033001002', 'staff_id' => 'FMOH-ACC-001', 'benefit_balance' => 480000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => []],

            // ── Access Bank – Lagos ───────────────────────────────────────
            ['branch' => $lag, 'corp' => $access, 'plan' => $accessPlat, 'hcp' => $hcpLag, 'first' => 'Herbert',     'last' => 'Wigwe',    'mid' => 'Onyeali',   'dob' => '1966-12-20', 'gender' => 'M', 'phone' => '+2348044001001', 'staff_id' => 'ABP-EXE-001', 'benefit_balance' => 3800000, 'enrollment_date' => '2024-03-01', 'expiry_date' => '2025-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Chinyere', 'last' => 'Wigwe', 'dob' => '1969-04-11', 'gender' => 'F', 'relationship' => 'spouse'],
                 ['first' => 'Gerald',   'last' => 'Wigwe', 'dob' => '1995-07-25', 'gender' => 'M', 'relationship' => 'child'],
             ]],
            ['branch' => $lag, 'corp' => $access, 'plan' => $accessPrem, 'hcp' => $hcpLag, 'first' => 'Funke',       'last' => 'Osaghae',  'mid' => null,         'dob' => '1985-03-14', 'gender' => 'F', 'phone' => '+2348044001002', 'staff_id' => 'ABP-STF-001', 'benefit_balance' => 1100000, 'enrollment_date' => '2024-03-01', 'expiry_date' => '2025-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Kolade',  'last' => 'Osaghae', 'dob' => '1983-10-22', 'gender' => 'M', 'relationship' => 'spouse'],
             ]],
            ['branch' => $lag, 'corp' => $access, 'plan' => $accessPrem, 'hcp' => $hcpLag, 'first' => 'Gbenga',      'last' => 'Shokunbi', 'mid' => null,         'dob' => '1989-08-05', 'gender' => 'M', 'phone' => '+2348044001003', 'staff_id' => 'ABP-STF-002', 'benefit_balance' => 890000, 'enrollment_date' => '2024-03-01', 'expiry_date' => '2025-12-31', 'status' => 'active',
             'dependents' => []],

            // ── KSTH – Kano ───────────────────────────────────────────────
            ['branch' => $kan, 'corp' => $ksth,   'plan' => $ksthElite,  'hcp' => $hcpKan, 'first' => 'Adamu',       'last' => 'Yusuf',    'mid' => 'Tanko',     'dob' => '1968-05-30', 'gender' => 'M', 'phone' => '+2348055001001', 'staff_id' => 'KSTH-CMD-001', 'benefit_balance' => 900000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => [
                 ['first' => 'Hafsat', 'last' => 'Yusuf', 'dob' => '1970-11-15', 'gender' => 'F', 'relationship' => 'spouse'],
             ]],
            ['branch' => $kan, 'corp' => $ksth,   'plan' => $ksthElite,  'hcp' => $hcpKan, 'first' => 'Zainab',      'last' => 'Mahmoud',  'mid' => 'Aisha',     'dob' => '1980-09-08', 'gender' => 'F', 'phone' => '+2348055001002', 'staff_id' => 'KSTH-DOC-001', 'benefit_balance' => 750000, 'enrollment_date' => '2024-01-01', 'expiry_date' => '2024-12-31', 'status' => 'active',
             'dependents' => []],

            // ── Shell – Rivers ────────────────────────────────────────────
            ['branch' => $riv, 'corp' => $shell,  'plan' => $shellComp,  'hcp' => $hcpRiv, 'first' => 'Chinyere',    'last' => 'Obi',      'mid' => null,         'dob' => '1977-02-14', 'gender' => 'F', 'phone' => '+2348066001001', 'staff_id' => 'SHE-MGR-001', 'benefit_balance' => 0, 'enrollment_date' => '2023-01-01', 'expiry_date' => '2024-06-30', 'status' => 'inactive',
             'dependents' => [
                 ['first' => 'Tonye', 'last' => 'Obi', 'dob' => '1975-06-20', 'gender' => 'M', 'relationship' => 'spouse'],
             ]],
            ['branch' => $riv, 'corp' => $shell,  'plan' => $shellComp,  'hcp' => $hcpRiv, 'first' => 'Dickson',     'last' => 'Amadi',    'mid' => 'Daniel',    'dob' => '1990-10-19', 'gender' => 'M', 'phone' => '+2348066001002', 'staff_id' => 'SHE-ENG-001', 'benefit_balance' => 0, 'enrollment_date' => '2023-01-01', 'expiry_date' => '2024-06-30', 'status' => 'inactive',
             'dependents' => []],
        ];

        $depCounter = 1;

        foreach ($raw as $data) {
            if (Enrollee::where('staff_id', $data['staff_id'])->exists()) {
                $this->command->line("  skip: {$data['staff_id']} already exists");
                continue;
            }

            $enrolleeId = $this->nextId();

            $enrollee = Enrollee::create([
                'branch_id'         => $data['branch']->id,
                'corporate_id'      => $data['corp']->id,
                'plan_id'           => $data['plan']->id,
                'primary_hcp_id'    => $data['hcp']->id,
                'enrollee_id'       => $enrolleeId,
                'first_name'        => $data['first'],
                'last_name'         => $data['last'],
                'middle_name'       => $data['mid'],
                'date_of_birth'     => $data['dob'],
                'gender'            => $data['gender'],
                'phone'             => $data['phone'],
                'staff_id'          => $data['staff_id'],
                'status'            => $data['status'],
                'enrollment_date'   => $data['enrollment_date'],
                'expiry_date'       => $data['expiry_date'],
                'benefit_balance'   => $data['benefit_balance'],
            ]);

            // Card
            EnrolleeCard::create([
                'enrollee_id'        => $enrollee->id,
                'card_number'        => $this->cardNumber($enrolleeId),
                'qr_code_data'       => json_encode(['id' => $enrolleeId, 'plan' => $data['plan']->plan_code, 'expiry' => $data['expiry_date']]),
                'status'             => in_array($data['status'], ['active', 'suspended']) ? 'active' : 'expired',
                'issued_at'          => $data['enrollment_date'],
                'expires_at'         => $data['expiry_date'],
                'issued_by'          => $admin->id,
            ]);

            // Dependents
            foreach ($data['dependents'] as $dep) {
                $depId = $enrolleeId . '-D' . $depCounter++;
                Dependent::create([
                    'enrollee_id'   => $enrollee->id,
                    'dependent_id'  => $depId,
                    'first_name'    => $dep['first'],
                    'last_name'     => $dep['last'],
                    'date_of_birth' => $dep['dob'],
                    'gender'        => $dep['gender'],
                    'relationship'  => $dep['relationship'],
                    'status'        => 'active',
                ]);
            }

            $this->command->info("✔ Enrollee: {$data['first']} {$data['last']} ({$enrolleeId}) + " . count($data['dependents']) . ' deps');
        }
    }
}