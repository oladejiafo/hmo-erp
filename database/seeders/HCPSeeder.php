<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\HealthCareProvider;
use App\Models\HcpTariff;
use App\Models\HcpContract;
use App\Models\HcpBankDetail;
use App\Models\HcpPerformanceScore;
use App\Models\User;
use Illuminate\Database\Seeder;

class HCPSeeder extends Seeder
{
    public function run(): void
    {
        $hq  = Branch::where('code', 'HQ-001')->first();
        $abj = Branch::where('code', 'ABJ-001')->first();
        $lag = Branch::where('code', 'LAG-001')->first();
        $kan = Branch::where('code', 'KAN-001')->first();
        $riv = Branch::where('code', 'RIV-001')->first();
        $admin = User::where('email', 'superadmin@hmosystem.ng')->first();

        $hcps = [
            // ── ABUJA ────────────────────────────────────────────────────────
            [
                'branch' => $abj,
                'hcp_code' => 'HCP-HOS-0001',
                'name'  => 'National Hospital Abuja',
                'type'  => 'hospital', 'tier' => 'tertiary',
                'address' => '1 Constitution Avenue, Central Area, Abuja',
                'city' => 'Abuja', 'state' => 'FCT Abuja', 'lga' => 'Municipal',
                'phone' => '+234-09-5238901', 'email' => 'records@nationalhospital.gov.ng',
                'nhis_accreditation_no' => 'NHIS-HOS-ABJ-001',
                'status' => 'active', 'performance_score' => 92.50,
                'accredited_at' => '2020-01-15', 'contract_expiry_date' => '2025-12-31',
                'bank' => ['bank_name' => 'First Bank of Nigeria', 'account_name' => 'National Hospital Abuja', 'account_number' => '2034567890'],
                'contract' => ['contract_number' => 'CONTR-HOS-0001', 'start_date' => '2024-01-01', 'end_date' => '2025-12-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 93.0, 120, 108, 1], [11, 2024, 92.0, 140, 125, 2], [12, 2024, 92.5, 130, 118, 1]],
            ],
            [
                'branch' => $abj,
                'hcp_code' => 'HCP-CLI-0001',
                'name'  => 'Garki Medical Centre',
                'type'  => 'clinic', 'tier' => 'secondary',
                'address' => '5 Gwani Street, Garki II, Abuja',
                'city' => 'Abuja', 'state' => 'FCT Abuja', 'lga' => 'Municipal',
                'phone' => '+234-09-2345001', 'email' => 'info@garkimedical.ng',
                'nhis_accreditation_no' => 'NHIS-CLI-ABJ-001',
                'status' => 'active', 'performance_score' => 85.00,
                'accredited_at' => '2021-03-10', 'contract_expiry_date' => '2025-06-30',
                'bank' => ['bank_name' => 'GTBank', 'account_name' => 'Garki Medical Centre Ltd', 'account_number' => '0123456789'],
                'contract' => ['contract_number' => 'CONTR-CLI-0001', 'start_date' => '2024-01-01', 'end_date' => '2025-06-30', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 84.0, 80, 70, 2], [11, 2024, 85.5, 95, 82, 1], [12, 2024, 85.0, 90, 79, 2]],
            ],
            [
                'branch' => $abj,
                'hcp_code' => 'HCP-PHM-0001',
                'name'  => 'Chemiron Pharmacy Wuse',
                'type'  => 'pharmacy', 'tier' => 'primary',
                'address' => '12 Wuse Zone 4, Abuja',
                'city' => 'Abuja', 'state' => 'FCT Abuja', 'lga' => 'Municipal',
                'phone' => '+234-09-3456002', 'email' => 'wuse@chemiron.ng',
                'nhis_accreditation_no' => 'NHIS-PHM-ABJ-001',
                'status' => 'active', 'performance_score' => 95.00,
                'accredited_at' => '2022-01-20', 'contract_expiry_date' => '2025-12-31',
                'bank' => ['bank_name' => 'Zenith Bank', 'account_name' => 'Chemiron Pharmacy Wuse', 'account_number' => '1023456780'],
                'contract' => ['contract_number' => 'CONTR-PHM-0001', 'start_date' => '2024-01-01', 'end_date' => '2025-12-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 95.0, 200, 198, 0], [11, 2024, 96.0, 220, 219, 0], [12, 2024, 95.0, 210, 209, 0]],
            ],
            [
                'branch' => $abj,
                'hcp_code' => 'HCP-LAB-0001',
                'name'  => 'Synlab Nigeria – Abuja',
                'type'  => 'lab', 'tier' => 'secondary',
                'address' => '3 Aminu Kano Crescent, Wuse II, Abuja',
                'city' => 'Abuja', 'state' => 'FCT Abuja', 'lga' => 'Municipal',
                'phone' => '+234-09-4567003', 'email' => 'abuja@synlab.ng',
                'nhis_accreditation_no' => 'NHIS-LAB-ABJ-001',
                'status' => 'active', 'performance_score' => 97.00,
                'accredited_at' => '2021-06-01', 'contract_expiry_date' => '2025-12-31',
                'bank' => ['bank_name' => 'Access Bank', 'account_name' => 'Synlab Nigeria Ltd', 'account_number' => '0987654321'],
                'contract' => ['contract_number' => 'CONTR-LAB-0001', 'start_date' => '2024-01-01', 'end_date' => '2025-12-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 97.0, 300, 299, 0], [11, 2024, 97.5, 320, 320, 0], [12, 2024, 97.0, 310, 308, 0]],
            ],
            // ── LAGOS ────────────────────────────────────────────────────────
            [
                'branch' => $lag,
                'hcp_code' => 'HCP-HOS-0002',
                'name'  => 'Lagos University Teaching Hospital',
                'type'  => 'hospital', 'tier' => 'tertiary',
                'address' => 'Idi-Araba, Surulere, Lagos',
                'city' => 'Lagos', 'state' => 'Lagos', 'lga' => 'Surulere',
                'phone' => '+234-01-5861520', 'email' => 'info@luth.gov.ng',
                'nhis_accreditation_no' => 'NHIS-HOS-LAG-001',
                'status' => 'active', 'performance_score' => 88.00,
                'accredited_at' => '2019-09-01', 'contract_expiry_date' => '2025-08-31',
                'bank' => ['bank_name' => 'First Bank of Nigeria', 'account_name' => 'LUTH – Teaching Hospital Fund', 'account_number' => '2089012345'],
                'contract' => ['contract_number' => 'CONTR-HOS-0002', 'start_date' => '2023-09-01', 'end_date' => '2025-08-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 87.5, 200, 178, 4], [11, 2024, 88.0, 215, 192, 3], [12, 2024, 88.5, 198, 178, 2]],
            ],
            [
                'branch' => $lag,
                'hcp_code' => 'HCP-CLI-0002',
                'name'  => 'Reddington Hospital',
                'type'  => 'clinic', 'tier' => 'secondary',
                'address' => '12 Idowu Martins Street, Victoria Island, Lagos',
                'city' => 'Lagos', 'state' => 'Lagos', 'lga' => 'Eti-Osa',
                'phone' => '+234-01-2715590', 'email' => 'info@reddingtonhospital.com',
                'nhis_accreditation_no' => 'NHIS-CLI-LAG-001',
                'status' => 'active', 'performance_score' => 91.00,
                'accredited_at' => '2020-06-15', 'contract_expiry_date' => '2025-06-14',
                'bank' => ['bank_name' => 'UBA', 'account_name' => 'Reddington Hospital Ltd', 'account_number' => '1056789012'],
                'contract' => ['contract_number' => 'CONTR-CLI-0002', 'start_date' => '2023-06-15', 'end_date' => '2025-06-14', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 90.5, 150, 138, 1], [11, 2024, 91.5, 165, 152, 1], [12, 2024, 91.0, 158, 145, 2]],
            ],
            [
                'branch' => $lag,
                'hcp_code' => 'HCP-LAB-0002',
                'name'  => 'Clinix Healthcare – Ikeja',
                'type'  => 'lab', 'tier' => 'secondary',
                'address' => '15 Obafemi Awolowo Way, Ikeja, Lagos',
                'city' => 'Lagos', 'state' => 'Lagos', 'lga' => 'Ikeja',
                'phone' => '+234-01-7654321', 'email' => 'ikeja@clinix.ng',
                'nhis_accreditation_no' => 'NHIS-LAB-LAG-001',
                'status' => 'active', 'performance_score' => 93.50,
                'accredited_at' => '2022-02-01', 'contract_expiry_date' => '2025-01-31',
                'bank' => ['bank_name' => 'Stanbic IBTC', 'account_name' => 'Clinix Healthcare Nigeria Ltd', 'account_number' => '0012345678'],
                'contract' => ['contract_number' => 'CONTR-LAB-0002', 'start_date' => '2024-02-01', 'end_date' => '2025-01-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 93.0, 400, 396, 1], [11, 2024, 94.0, 430, 428, 0], [12, 2024, 93.5, 420, 416, 1]],
            ],
            // ── KANO ─────────────────────────────────────────────────────────
            [
                'branch' => $kan,
                'hcp_code' => 'HCP-HOS-0003',
                'name'  => 'Murtala Mohammed Specialist Hospital',
                'type'  => 'hospital', 'tier' => 'tertiary',
                'address' => 'Hospital Road, Nassarawa GRA, Kano',
                'city' => 'Kano', 'state' => 'Kano', 'lga' => 'Nassarawa',
                'phone' => '+234-064-664422', 'email' => 'admin@mmsh.kn.gov.ng',
                'nhis_accreditation_no' => 'NHIS-HOS-KAN-001',
                'status' => 'active', 'performance_score' => 79.00,
                'accredited_at' => '2020-04-01', 'contract_expiry_date' => '2025-03-31',
                'bank' => ['bank_name' => 'First Bank of Nigeria', 'account_name' => 'Murtala Mohammed Specialist Hospital', 'account_number' => '2011223344'],
                'contract' => ['contract_number' => 'CONTR-HOS-0003', 'start_date' => '2024-04-01', 'end_date' => '2025-03-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 78.0, 90, 72, 5], [11, 2024, 79.5, 100, 82, 4], [12, 2024, 79.0, 95, 76, 6]],
            ],
            [
                'branch' => $kan,
                'hcp_code' => 'HCP-CLI-0003',
                'name'  => 'Kano Specialist Clinic',
                'type'  => 'clinic', 'tier' => 'primary',
                'address' => '22 Ahmadu Bello Way, Kano',
                'city' => 'Kano', 'state' => 'Kano', 'lga' => 'Municipal',
                'phone' => '+234-064-330011', 'email' => 'clinic@kanospecialist.ng',
                'nhis_accreditation_no' => 'NHIS-CLI-KAN-001',
                'status' => 'pending', 'performance_score' => 100.00,
                'accredited_at' => null, 'contract_expiry_date' => null,
                'bank' => null,
                'contract' => null,
                'perf_scores' => [],
            ],
            // ── RIVERS ───────────────────────────────────────────────────────
            [
                'branch' => $riv,
                'hcp_code' => 'HCP-HOS-0004',
                'name'  => 'University of Port Harcourt Teaching Hospital',
                'type'  => 'hospital', 'tier' => 'tertiary',
                'address' => 'East-West Road, Choba, Port Harcourt',
                'city' => 'Port Harcourt', 'state' => 'Rivers', 'lga' => 'Obio-Akpor',
                'phone' => '+234-084-230401', 'email' => 'info@upth.gov.ng',
                'nhis_accreditation_no' => 'NHIS-HOS-RIV-001',
                'status' => 'active', 'performance_score' => 82.50,
                'accredited_at' => '2019-01-01', 'contract_expiry_date' => '2025-12-31',
                'bank' => ['bank_name' => 'Ecobank Nigeria', 'account_name' => 'UPTH Revenue Account', 'account_number' => '8901234567'],
                'contract' => ['contract_number' => 'CONTR-HOS-0004', 'start_date' => '2024-01-01', 'end_date' => '2025-12-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 82.0, 110, 92, 3], [11, 2024, 83.0, 125, 105, 2], [12, 2024, 82.5, 118, 98, 3]],
            ],
            [
                'branch' => $riv,
                'hcp_code' => 'HCP-CLI-0004',
                'name'  => 'Braithwaite Memorial Specialist Hospital',
                'type'  => 'clinic', 'tier' => 'secondary',
                'address' => '1 Hospital Road, Port Harcourt',
                'city' => 'Port Harcourt', 'state' => 'Rivers', 'lga' => 'Port Harcourt',
                'phone' => '+234-084-231890', 'email' => 'bmsh@health.rivers.gov.ng',
                'nhis_accreditation_no' => 'NHIS-CLI-RIV-001',
                'status' => 'suspended', 'performance_score' => 55.00,
                'accredited_at' => '2020-01-01', 'contract_expiry_date' => '2024-12-31',
                'bank' => ['bank_name' => 'Polaris Bank', 'account_name' => 'BMSH Remittance Account', 'account_number' => '4412345678'],
                'contract' => ['contract_number' => 'CONTR-CLI-0004', 'start_date' => '2024-01-01', 'end_date' => '2024-12-31', 'status' => 'active', 'payment_model' => 'fee_for_service', 'capitation_rate' => 0],
                'perf_scores' => [[10, 2024, 58.0, 60, 38, 12], [11, 2024, 55.0, 70, 42, 15], [12, 2024, 55.0, 65, 39, 14]],
            ],
        ];

        // Standard tariffs to seed for each active HCP
        $standardTariffs = [
            ['service_code' => 'CONS-001',  'service_name' => 'General Outpatient Consultation',        'category' => 'consultation', 'agreed_price' => 5000,   'nhis_price' => 4500],
            ['service_code' => 'CONS-002',  'service_name' => 'Specialist Consultation',               'category' => 'consultation', 'agreed_price' => 15000,  'nhis_price' => 12000],
            ['service_code' => 'CONS-003',  'service_name' => 'Emergency Consultation',                'category' => 'consultation', 'agreed_price' => 25000,  'nhis_price' => 22000],
            ['service_code' => 'LAB-CBC',   'service_name' => 'Full Blood Count (CBC)',                'category' => 'laboratory',   'agreed_price' => 4500,   'nhis_price' => 4000],
            ['service_code' => 'LAB-LFT',   'service_name' => 'Liver Function Tests',                 'category' => 'laboratory',   'agreed_price' => 8000,   'nhis_price' => 7000],
            ['service_code' => 'LAB-RFT',   'service_name' => 'Renal Function Tests',                 'category' => 'laboratory',   'agreed_price' => 8000,   'nhis_price' => 7500],
            ['service_code' => 'LAB-MAL',   'service_name' => 'Malaria RDT',                          'category' => 'laboratory',   'agreed_price' => 2500,   'nhis_price' => 2000],
            ['service_code' => 'LAB-TYPH',  'service_name' => 'Typhoid (Widal) Test',                 'category' => 'laboratory',   'agreed_price' => 3500,   'nhis_price' => 3000],
            ['service_code' => 'RAD-XRAY',  'service_name' => 'X-Ray (Standard)',                     'category' => 'radiology',    'agreed_price' => 10000,  'nhis_price' => 9000],
            ['service_code' => 'RAD-USS',   'service_name' => 'Ultrasound Scan (Abdomen)',             'category' => 'radiology',    'agreed_price' => 18000,  'nhis_price' => 16000],
            ['service_code' => 'RAD-ECG',   'service_name' => 'Electrocardiogram (ECG)',              'category' => 'radiology',    'agreed_price' => 8500,   'nhis_price' => 8000],
            ['service_code' => 'DRUG-001',  'service_name' => 'Artemether/Lumefantrine 20/120mg',     'category' => 'drug',         'agreed_price' => 3500,   'nhis_price' => 3200],
            ['service_code' => 'DRUG-002',  'service_name' => 'Amoxicillin 500mg (10 caps)',          'category' => 'drug',         'agreed_price' => 1200,   'nhis_price' => 1100],
            ['service_code' => 'DRUG-003',  'service_name' => 'Metformin 500mg (30 tabs)',            'category' => 'drug',         'agreed_price' => 2200,   'nhis_price' => 2000],
            ['service_code' => 'DRUG-004',  'service_name' => 'Lisinopril 10mg (30 tabs)',            'category' => 'drug',         'agreed_price' => 3800,   'nhis_price' => 3500],
            ['service_code' => 'PROC-001',  'service_name' => 'Wound Dressing (Simple)',              'category' => 'procedure',    'agreed_price' => 3000,   'nhis_price' => 2800],
            ['service_code' => 'PROC-002',  'service_name' => 'IV Cannulation & Infusion Setup',     'category' => 'procedure',    'agreed_price' => 4500,   'nhis_price' => 4000],
            ['service_code' => 'PROC-003',  'service_name' => 'Suturing (per wound)',                 'category' => 'procedure',    'agreed_price' => 8000,   'nhis_price' => 7500],
            ['service_code' => 'SURG-001',  'service_name' => 'Appendectomy (Open)',                  'category' => 'surgery',      'agreed_price' => 250000, 'nhis_price' => 230000],
            ['service_code' => 'SURG-002',  'service_name' => 'Caesarean Section',                   'category' => 'surgery',      'agreed_price' => 350000, 'nhis_price' => 320000],
            ['service_code' => 'DENT-001',  'service_name' => 'Dental Consultation',                 'category' => 'dental',       'agreed_price' => 5000,   'nhis_price' => 4500],
            ['service_code' => 'DENT-002',  'service_name' => 'Tooth Extraction (Simple)',           'category' => 'dental',       'agreed_price' => 8500,   'nhis_price' => 8000],
            ['service_code' => 'OPT-001',   'service_name' => 'Eye Consultation & Refraction',       'category' => 'optical',      'agreed_price' => 6500,   'nhis_price' => 6000],
            ['service_code' => 'MAT-001',   'service_name' => 'Antenatal Care (per visit)',           'category' => 'maternity',    'agreed_price' => 8000,   'nhis_price' => 7500],
            ['service_code' => 'MAT-002',   'service_name' => 'Normal Vaginal Delivery',             'category' => 'maternity',    'agreed_price' => 120000, 'nhis_price' => 110000],
        ];

        foreach ($hcps as $data) {
            $hcp = HealthCareProvider::firstOrCreate(
                ['hcp_code' => $data['hcp_code']],
                [
                    'branch_id'              => $data['branch']->id,
                    'name'                   => $data['name'],
                    'type'                   => $data['type'],
                    'tier'                   => $data['tier'],
                    'address'                => $data['address'],
                    'city'                   => $data['city'],
                    'state'                  => $data['state'],
                    'lga'                    => $data['lga'],
                    'phone'                  => $data['phone'],
                    'email'                  => $data['email'],
                    'nhis_accreditation_no'  => $data['nhis_accreditation_no'],
                    'status'                 => $data['status'],
                    'performance_score'      => $data['performance_score'],
                    'accredited_at'          => $data['accredited_at'],
                    'contract_expiry_date'   => $data['contract_expiry_date'],
                ]
            );

            // Bank details
            if ($data['bank']) {
                HcpBankDetail::firstOrCreate(
                    ['hcp_id' => $hcp->id],
                    array_merge($data['bank'], [
                        'is_active'   => true,
                        'verified_by' => $admin->id,
                        'verified_at' => now()->subMonths(3),
                    ])
                );
            }

            // Contract
            if ($data['contract']) {
                HcpContract::firstOrCreate(
                    ['contract_number' => $data['contract']['contract_number']],
                    array_merge($data['contract'], [
                        'hcp_id'    => $hcp->id,
                        'signed_by' => $admin->id,
                        'signed_at' => now()->subMonths(12),
                        'terms_summary' => 'Fee-for-service contract. Payment within 30 days of approved claims batch.',
                    ])
                );
            }

            // Tariffs (only for active HCPs)
            if ($data['status'] === 'active') {
                foreach ($standardTariffs as $t) {
                    HcpTariff::firstOrCreate(
                        ['hcp_id' => $hcp->id, 'service_code' => $t['service_code']],
                        array_merge($t, [
                            'hcp_id'         => $hcp->id,
                            'is_active'      => true,
                            'effective_from' => '2024-01-01',
                            'effective_to'   => '2025-12-31',
                            'uploaded_by'    => $admin->id,
                        ])
                    );
                }
            }

            // Performance scores
            foreach ($data['perf_scores'] as [$month, $year, $score, $submitted, $approved, $flags]) {
                HcpPerformanceScore::firstOrCreate(
                    ['hcp_id' => $hcp->id, 'period_month' => $month, 'period_year' => $year],
                    [
                        'score'                   => $score,
                        'total_claims_submitted'  => $submitted,
                        'total_claims_approved'   => $approved,
                        'total_fraud_flags'       => $flags,
                        'avg_resolution_days'     => rand(3, 12),
                        'score_breakdown'         => json_encode([
                            'approval_rate'  => round($approved / max($submitted, 1) * 100, 1),
                            'fraud_rate'     => round($flags / max($submitted, 1) * 100, 2),
                            'timeliness'     => rand(70, 100),
                        ]),
                    ]
                );
            }

            $this->command->info("✔ HCP: {$data['name']} [{$data['status']}]");
        }
    }
}