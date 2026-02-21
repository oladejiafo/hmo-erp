<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Claim;
use App\Models\ClaimItem;
use App\Models\ClaimStatusLog;
use App\Models\ClaimAssignment;
use App\Models\FraudFlag;
use App\Models\Enrollee;
use App\Models\HealthCareProvider;
use App\Models\HcpTariff;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ClaimSeeder extends Seeder
{
    private int $claimSeq = 0;

    private function nextClaimNumber(string $branchCode): string
    {
        $this->claimSeq++;
        return 'CLM-' . $branchCode . '-2024-' . str_pad($this->claimSeq, 6, '0', STR_PAD_LEFT);
    }

    public function run(): void
    {
        $abj = Branch::where('code', 'ABJ-001')->first();
        $lag = Branch::where('code', 'LAG-001')->first();
        $kan = Branch::where('code', 'KAN-001')->first();
        $riv = Branch::where('code', 'RIV-001')->first();

        // Officers to assign claims to
        $abjOfficer1  = User::where('email', 'abj.officer1@hmosystem.ng')->first();
        $abjOfficer2  = User::where('email', 'abj.officer2@hmosystem.ng')->first();
        $abjSuper     = User::where('email', 'abj.supervisor@hmosystem.ng')->first();
        $lagOfficer   = User::where('email', 'lag.officer@hmosystem.ng')->first();
        $lagSuper     = User::where('email', 'lag.supervisor@hmosystem.ng')->first();
        $admin        = User::where('email', 'superadmin@hmosystem.ng')->first();

        // HCPs
        $hcpNHA   = HealthCareProvider::where('hcp_code', 'HCP-HOS-0001')->first(); // National Hosp Abuja
        $hcpGMC   = HealthCareProvider::where('hcp_code', 'HCP-CLI-0001')->first(); // Garki Medical
        $hcpChem  = HealthCareProvider::where('hcp_code', 'HCP-PHM-0001')->first(); // Chemiron Pharmacy
        $hcpSynl  = HealthCareProvider::where('hcp_code', 'HCP-LAB-0001')->first(); // Synlab Abuja
        $hcpLUTH  = HealthCareProvider::where('hcp_code', 'HCP-HOS-0002')->first(); // LUTH
        $hcpRedd  = HealthCareProvider::where('hcp_code', 'HCP-CLI-0002')->first(); // Reddington
        $hcpClinx = HealthCareProvider::where('hcp_code', 'HCP-LAB-0002')->first(); // Clinix Lagos
        $hcpMMSH  = HealthCareProvider::where('hcp_code', 'HCP-HOS-0003')->first(); // Murtala Kano
        $hcpUPTH  = HealthCareProvider::where('hcp_code', 'HCP-HOS-0004')->first(); // UPTH PH

        // Enrollees
        $e = Enrollee::orderBy('id')->get()->keyBy('staff_id');

        $claimsData = [
            // ════════════════════════════════════════════════════════════════
            // ABUJA – various statuses to demonstrate full workflow
            // ════════════════════════════════════════════════════════════════

            // 1. PAID – completed full lifecycle
            [
                'branch' => $abj, 'hcp' => $hcpGMC,
                'enrollee' => $e['ZTL-EMP-001'] ?? null,
                'claim_type' => 'outpatient', 'service_date' => '2024-10-05', 'submission_date' => '2024-10-07',
                'status' => 'paid', 'risk_score' => 8.50,
                'diagnosis_codes' => ['J06.9'], 'diagnosis_description' => 'Acute upper respiratory infection, unspecified',
                'items' => [
                    ['code' => 'CONS-001', 'name' => 'General Outpatient Consultation', 'cat' => 'consultation', 'qty' => 1, 'price' => 5000],
                    ['code' => 'LAB-MAL',  'name' => 'Malaria RDT',                     'cat' => 'laboratory',   'qty' => 1, 'price' => 2500],
                    ['code' => 'DRUG-001', 'name' => 'Artemether/Lumefantrine 20/120mg', 'cat' => 'drug',         'qty' => 1, 'price' => 3500],
                ],
                'officer' => $abjOfficer1, 'reviewer' => $abjSuper,
                'reviewer_notes' => 'All items verified against tariff. Approved.',
                'approved_at' => '2024-10-09', 'paid_at' => '2024-10-18',
            ],

            // 2. PAID – inpatient with surgery
            [
                'branch' => $abj, 'hcp' => $hcpNHA,
                'enrollee' => $e['ZTL-EMP-002'] ?? null,
                'claim_type' => 'inpatient', 'service_date' => '2024-09-12', 'submission_date' => '2024-09-20',
                'admission_date' => '2024-09-12', 'discharge_date' => '2024-09-16',
                'status' => 'paid', 'risk_score' => 22.00,
                'diagnosis_codes' => ['K35.2'], 'diagnosis_description' => 'Acute appendicitis with generalized peritonitis',
                'items' => [
                    ['code' => 'CONS-003', 'name' => 'Emergency Consultation',            'cat' => 'consultation', 'qty' => 1,  'price' => 25000],
                    ['code' => 'SURG-001', 'name' => 'Appendectomy (Open)',               'cat' => 'surgery',      'qty' => 1,  'price' => 250000],
                    ['code' => 'LAB-CBC',  'name' => 'Full Blood Count (CBC)',            'cat' => 'laboratory',   'qty' => 1,  'price' => 4500],
                    ['code' => 'RAD-XRAY', 'name' => 'X-Ray (Abdomen)',                   'cat' => 'radiology',    'qty' => 1,  'price' => 10000],
                    ['code' => 'DRUG-002', 'name' => 'Amoxicillin 500mg (10 caps)',       'cat' => 'drug',         'qty' => 3,  'price' => 1200],
                    ['code' => 'PROC-002', 'name' => 'IV Cannulation & Infusion Setup',  'cat' => 'procedure',    'qty' => 4,  'price' => 4500],
                ],
                'officer' => $abjOfficer1, 'reviewer' => $abjSuper,
                'reviewer_notes' => 'Emergency surgery verified. Pre-auth waived under emergency clause.',
                'approved_at' => '2024-09-22', 'paid_at' => '2024-10-02',
            ],

            // 3. APPROVED – ready for payment batch
            [
                'branch' => $abj, 'hcp' => $hcpSynl,
                'enrollee' => $e['ZTL-EMP-003'] ?? null,
                'claim_type' => 'laboratory', 'service_date' => '2024-11-15', 'submission_date' => '2024-11-18',
                'status' => 'approved', 'risk_score' => 5.00,
                'diagnosis_codes' => ['E11.9'], 'diagnosis_description' => 'Type 2 diabetes mellitus without complications',
                'items' => [
                    ['code' => 'LAB-RFT', 'name' => 'Renal Function Tests',  'cat' => 'laboratory', 'qty' => 1, 'price' => 8000],
                    ['code' => 'LAB-LFT', 'name' => 'Liver Function Tests',  'cat' => 'laboratory', 'qty' => 1, 'price' => 8000],
                    ['code' => 'LAB-CBC', 'name' => 'Full Blood Count (CBC)', 'cat' => 'laboratory', 'qty' => 1, 'price' => 4500],
                ],
                'officer' => $abjOfficer2, 'reviewer' => $abjSuper,
                'reviewer_notes' => 'Routine diabetic monitoring. All approved.',
                'approved_at' => '2024-11-20', 'paid_at' => null,
            ],

            // 4. UNDER_REVIEW – assigned to officer
            [
                'branch' => $abj, 'hcp' => $hcpNHA,
                'enrollee' => $e['ZTL-EMP-001'] ?? null,
                'claim_type' => 'outpatient', 'service_date' => '2024-11-28', 'submission_date' => '2024-12-01',
                'status' => 'under_review', 'risk_score' => 35.00,
                'diagnosis_codes' => ['I10'], 'diagnosis_description' => 'Essential (primary) hypertension',
                'items' => [
                    ['code' => 'CONS-002', 'name' => 'Specialist Consultation', 'cat' => 'consultation', 'qty' => 1, 'price' => 15000],
                    ['code' => 'RAD-ECG',  'name' => 'ECG',                     'cat' => 'radiology',    'qty' => 1, 'price' => 8500],
                    ['code' => 'DRUG-004', 'name' => 'Lisinopril 10mg (30 tabs)','cat' => 'drug',        'qty' => 2, 'price' => 3800],
                    ['code' => 'DRUG-003', 'name' => 'Metformin 500mg (30 tabs)','cat' => 'drug',        'qty' => 1, 'price' => 2200],
                ],
                'officer' => $abjOfficer2, 'reviewer' => null,
                'reviewer_notes' => null, 'approved_at' => null, 'paid_at' => null,
            ],

            // 5. FLAGGED – fraud flag raised
            [
                'branch' => $abj, 'hcp' => $hcpGMC,
                'enrollee' => $e['ZTL-EMP-003'] ?? null,
                'claim_type' => 'outpatient', 'service_date' => '2024-12-01', 'submission_date' => '2024-12-02',
                'status' => 'flagged', 'risk_score' => 78.50,
                'diagnosis_codes' => ['Z00.0'], 'diagnosis_description' => 'General adult medical examination',
                'items' => [
                    ['code' => 'CONS-002', 'name' => 'Specialist Consultation',       'cat' => 'consultation', 'qty' => 1, 'price' => 35000], // price MUCH higher than tariff 15k
                    ['code' => 'LAB-CBC',  'name' => 'Full Blood Count (CBC)',         'cat' => 'laboratory',   'qty' => 1, 'price' => 4500],
                    ['code' => 'RAD-USS',  'name' => 'Ultrasound Scan (Abdomen)',      'cat' => 'radiology',    'qty' => 1, 'price' => 45000], // price higher than tariff 18k
                ],
                'officer' => $abjOfficer1, 'reviewer' => null,
                'reviewer_notes' => null, 'approved_at' => null, 'paid_at' => null,
                'fraud_flags' => [
                    ['type' => 'tariff_mismatch',     'score' => 40.0, 'desc' => 'Specialist Consultation billed at ₦35,000 vs agreed tariff of ₦15,000 (133% above tariff)'],
                    ['type' => 'tariff_mismatch',     'score' => 38.5, 'desc' => 'Ultrasound Scan billed at ₦45,000 vs agreed tariff of ₦18,000 (150% above tariff)'],
                ],
            ],

            // 6. SUBMITTED – fresh, just came in
            [
                'branch' => $abj, 'hcp' => $hcpChem,
                'enrollee' => $e['FMOH-ACC-001'] ?? null,
                'claim_type' => 'drug_refill', 'service_date' => '2024-12-05', 'submission_date' => '2024-12-05',
                'status' => 'submitted', 'risk_score' => 3.00,
                'diagnosis_codes' => ['E11.9'], 'diagnosis_description' => 'Diabetes mellitus drug refill',
                'items' => [
                    ['code' => 'DRUG-003', 'name' => 'Metformin 500mg (30 tabs)',  'cat' => 'drug', 'qty' => 2, 'price' => 2200],
                    ['code' => 'DRUG-004', 'name' => 'Lisinopril 10mg (30 tabs)',  'cat' => 'drug', 'qty' => 1, 'price' => 3800],
                ],
                'officer' => null, 'reviewer' => null,
                'reviewer_notes' => null, 'approved_at' => null, 'paid_at' => null,
            ],

            // 7. REJECTED
            [
                'branch' => $abj, 'hcp' => $hcpGMC,
                'enrollee' => $e['ZTL-EMP-005'] ?? null,  // inactive enrollee
                'claim_type' => 'outpatient', 'service_date' => '2024-01-20', 'submission_date' => '2024-01-22',
                'status' => 'rejected', 'risk_score' => 90.00,
                'diagnosis_codes' => ['J06.9'], 'diagnosis_description' => 'URTI',
                'items' => [
                    ['code' => 'CONS-001', 'name' => 'General Outpatient Consultation', 'cat' => 'consultation', 'qty' => 1, 'price' => 5000],
                ],
                'officer' => $abjOfficer1, 'reviewer' => $abjSuper,
                'reviewer_notes' => null,
                'rejection_reason' => 'Enrollee plan expired as of 31-Dec-2023. Service date (20-Jan-2024) is outside coverage period.',
                'approved_at' => null, 'paid_at' => null,
                'fraud_flags' => [
                    ['type' => 'expired_plan', 'score' => 90.0, 'desc' => 'Enrollee plan expired 2023-12-31. Service rendered on 2024-01-20 is outside coverage period.', 'status' => 'confirmed'],
                ],
            ],

            // ════════════════════════════════════════════════════════════════
            // LAGOS claims
            // ════════════════════════════════════════════════════════════════

            // 8. PAID – maternity
            [
                'branch' => $lag, 'hcp' => $hcpLUTH,
                'enrollee' => $e['DIG-MID-002'] ?? null,
                'claim_type' => 'maternity', 'service_date' => '2024-08-14', 'submission_date' => '2024-08-20',
                'admission_date' => '2024-08-14', 'discharge_date' => '2024-08-16',
                'status' => 'paid', 'risk_score' => 10.00,
                'diagnosis_codes' => ['Z37.0'], 'diagnosis_description' => 'Single live birth – normal vaginal delivery',
                'items' => [
                    ['code' => 'MAT-002', 'name' => 'Normal Vaginal Delivery',       'cat' => 'maternity',    'qty' => 1, 'price' => 120000],
                    ['code' => 'MAT-001', 'name' => 'Antenatal Care (final visit)',  'cat' => 'maternity',    'qty' => 1, 'price' => 8000],
                    ['code' => 'LAB-CBC', 'name' => 'Full Blood Count (CBC)',        'cat' => 'laboratory',   'qty' => 1, 'price' => 4500],
                    ['code' => 'DRUG-002','name' => 'Amoxicillin 500mg (10 caps)',   'cat' => 'drug',         'qty' => 1, 'price' => 1200],
                ],
                'officer' => $lagOfficer, 'reviewer' => $lagSuper,
                'reviewer_notes' => 'Maternity claim – all items verified. Approved.',
                'approved_at' => '2024-08-22', 'paid_at' => '2024-09-05',
            ],

            // 9. APPROVED – dental
            [
                'branch' => $lag, 'hcp' => $hcpRedd,
                'enrollee' => $e['ABP-STF-001'] ?? null,
                'claim_type' => 'dental', 'service_date' => '2024-11-10', 'submission_date' => '2024-11-12',
                'status' => 'approved', 'risk_score' => 6.00,
                'diagnosis_codes' => ['K02.1'], 'diagnosis_description' => 'Dental caries in dentine',
                'items' => [
                    ['code' => 'DENT-001', 'name' => 'Dental Consultation',        'cat' => 'dental', 'qty' => 1, 'price' => 5000],
                    ['code' => 'DENT-002', 'name' => 'Tooth Extraction (Simple)',  'cat' => 'dental', 'qty' => 2, 'price' => 8500],
                ],
                'officer' => $lagOfficer, 'reviewer' => $lagSuper,
                'reviewer_notes' => 'Dental extraction x2 verified against dental chart.',
                'approved_at' => '2024-11-14', 'paid_at' => null,
            ],

            // 10. SUPERVISOR_REVIEW – escalated high value
            [
                'branch' => $lag, 'hcp' => $hcpLUTH,
                'enrollee' => $e['DIG-DIAM-001'] ?? null,  // use first Dangote enrollee
                'claim_type' => 'inpatient', 'service_date' => '2024-11-20', 'submission_date' => '2024-11-28',
                'admission_date' => '2024-11-20', 'discharge_date' => '2024-11-25',
                'status' => 'supervisor_review', 'risk_score' => 52.00,
                'diagnosis_codes' => ['I21.9'], 'diagnosis_description' => 'Acute myocardial infarction, unspecified',
                'items' => [
                    ['code' => 'CONS-003', 'name' => 'Emergency Consultation',         'cat' => 'consultation', 'qty' => 1, 'price' => 25000],
                    ['code' => 'RAD-ECG',  'name' => 'ECG',                            'cat' => 'radiology',    'qty' => 3, 'price' => 8500],
                    ['code' => 'LAB-CBC',  'name' => 'Full Blood Count (CBC)',          'cat' => 'laboratory',   'qty' => 2, 'price' => 4500],
                    ['code' => 'LAB-LFT',  'name' => 'Cardiac Enzymes / LFT',          'cat' => 'laboratory',   'qty' => 2, 'price' => 8000],
                    ['code' => 'PROC-002', 'name' => 'IV Cannulation & Infusion Setup','cat' => 'procedure',    'qty' => 6, 'price' => 4500],
                    ['code' => 'SURG-001', 'name' => 'Coronary Angioplasty',           'cat' => 'surgery',      'qty' => 1, 'price' => 800000],
                ],
                'officer' => $lagOfficer, 'reviewer' => $lagSuper,
                'reviewer_notes' => 'High-value claim. Escalated to supervisor for cardiac procedure verification. Pre-auth requested.',
                'approved_at' => null, 'paid_at' => null,
            ],

            // 11. UNDER_REVIEW – Lagos lab claim
            [
                'branch' => $lag, 'hcp' => $hcpClinx,
                'enrollee' => $e['ABP-STF-002'] ?? null,
                'claim_type' => 'laboratory', 'service_date' => '2024-12-02', 'submission_date' => '2024-12-03',
                'status' => 'under_review', 'risk_score' => 12.00,
                'diagnosis_codes' => ['N18.3'], 'diagnosis_description' => 'Chronic kidney disease stage 3',
                'items' => [
                    ['code' => 'LAB-RFT', 'name' => 'Renal Function Tests',    'cat' => 'laboratory', 'qty' => 1, 'price' => 8000],
                    ['code' => 'LAB-LFT', 'name' => 'Liver Function Tests',    'cat' => 'laboratory', 'qty' => 1, 'price' => 8000],
                    ['code' => 'RAD-USS', 'name' => 'Ultrasound Scan (Renal)', 'cat' => 'radiology',  'qty' => 1, 'price' => 18000],
                ],
                'officer' => $lagOfficer, 'reviewer' => null,
                'reviewer_notes' => null, 'approved_at' => null, 'paid_at' => null,
            ],

            // 12. SUBMITTED – fresh Lagos claim
            [
                'branch' => $lag, 'hcp' => $hcpRedd,
                'enrollee' => $e['ABP-EXE-001'] ?? null,
                'claim_type' => 'optical', 'service_date' => '2024-12-06', 'submission_date' => '2024-12-06',
                'status' => 'submitted', 'risk_score' => 2.50,
                'diagnosis_codes' => ['H52.1'], 'diagnosis_description' => 'Myopia – routine eye check and spectacle prescription',
                'items' => [
                    ['code' => 'OPT-001', 'name' => 'Eye Consultation & Refraction', 'cat' => 'optical', 'qty' => 1, 'price' => 6500],
                ],
                'officer' => null, 'reviewer' => null,
                'reviewer_notes' => null, 'approved_at' => null, 'paid_at' => null,
            ],

            // ════════════════════════════════════════════════════════════════
            // KANO claim
            // ════════════════════════════════════════════════════════════════

            // 13. PAID – Kano hospital
            [
                'branch' => $kan, 'hcp' => $hcpMMSH,
                'enrollee' => $e['KSTH-CMD-001'] ?? null,
                'claim_type' => 'outpatient', 'service_date' => '2024-10-20', 'submission_date' => '2024-10-22',
                'status' => 'paid', 'risk_score' => 14.00,
                'diagnosis_codes' => ['B54'], 'diagnosis_description' => 'Unspecified malaria',
                'items' => [
                    ['code' => 'CONS-001', 'name' => 'General Outpatient Consultation', 'cat' => 'consultation', 'qty' => 1, 'price' => 5000],
                    ['code' => 'LAB-MAL',  'name' => 'Malaria RDT',                     'cat' => 'laboratory',   'qty' => 1, 'price' => 2500],
                    ['code' => 'LAB-TYPH', 'name' => 'Typhoid (Widal) Test',            'cat' => 'laboratory',   'qty' => 1, 'price' => 3500],
                    ['code' => 'DRUG-001', 'name' => 'Artemether/Lumefantrine',          'cat' => 'drug',         'qty' => 1, 'price' => 3500],
                ],
                'officer' => User::where('email', 'kan.officer@hmosystem.ng')->first(),
                'reviewer' => User::where('email', 'kan.manager@hmosystem.ng')->first(),
                'reviewer_notes' => 'Malaria treatment – verified.',
                'approved_at' => '2024-10-24', 'paid_at' => '2024-11-01',
            ],

            // 14. FLAGGED with multiple fraud indicators (for fraud module demo)
            [
                'branch' => $kan, 'hcp' => $hcpMMSH,
                'enrollee' => $e['KSTH-DOC-001'] ?? null,
                'claim_type' => 'inpatient', 'service_date' => '2024-11-01', 'submission_date' => '2024-11-05',
                'admission_date' => '2024-11-01', 'discharge_date' => '2024-11-04',
                'status' => 'flagged', 'risk_score' => 85.00,
                'diagnosis_codes' => ['K35.2'], 'diagnosis_description' => 'Acute appendicitis',
                'items' => [
                    ['code' => 'CONS-003', 'name' => 'Emergency Consultation',             'cat' => 'consultation', 'qty' => 1, 'price' => 25000],
                    ['code' => 'SURG-001', 'name' => 'Appendectomy',                       'cat' => 'surgery',      'qty' => 1, 'price' => 250000],
                    ['code' => 'SURG-002', 'name' => 'Caesarean Section (also billed)',    'cat' => 'surgery',      'qty' => 1, 'price' => 350000], // suspicious – different procedure
                    ['code' => 'LAB-CBC',  'name' => 'FBC x3',                             'cat' => 'laboratory',   'qty' => 3, 'price' => 4500],
                ],
                'officer' => User::where('email', 'kan.officer@hmosystem.ng')->first(),
                'reviewer' => null, 'reviewer_notes' => null, 'approved_at' => null, 'paid_at' => null,
                'fraud_flags' => [
                    ['type' => 'pattern_deviation',   'score' => 45.0, 'desc' => 'Both appendectomy and C-section billed in single inpatient episode – anatomically inconsistent procedures for same patient.'],
                    ['type' => 'frequency_anomaly',   'score' => 25.0, 'desc' => 'This HCP has submitted 3 appendectomy claims in 30 days for the same corporate – statistical outlier (expected: 0.5/month).'],
                    ['type' => 'tariff_mismatch',     'score' => 15.0, 'desc' => 'FBC billed 3 times in single admission without clinical justification note.'],
                ],
            ],
        ];

        // helper to get Dangote enrollee
        $dangEnrollee = Enrollee::whereHas('corporate', fn($q) => $q->where('code', 'CORP-0002'))
            ->where('staff_id', 'DIG-EXE-001')
            ->first();

        foreach ($claimsData as &$cd) {
            if (!$cd['enrollee']) {
                // try the Dangote enrollee for #10
                $cd['enrollee'] = $dangEnrollee;
            }
        }
        unset($cd);

        foreach ($claimsData as $data) {
            if (!$data['enrollee'] || !$data['hcp'] || !$data['branch']) {
                $this->command->warn("  skip: missing enrollee/hcp/branch");
                continue;
            }

            $enrollee = $data['enrollee'];
            $hcp      = $data['hcp'];
            $branch   = $data['branch'];
            $branchShort = explode('-', $branch->code)[0]; // ABJ, LAG etc.

            // Compute totals from items
            $totalClaimed  = collect($data['items'])->sum(fn($i) => $i['price'] * $i['qty']);
            $isApproved    = in_array($data['status'], ['approved', 'paid']);
            $totalApproved = $isApproved ? $totalClaimed : 0;
            $totalPaid     = $data['status'] === 'paid' ? $totalClaimed : 0;

            $claim = Claim::create([
                'branch_id'               => $branch->id,
                'claim_number'            => $this->nextClaimNumber($branchShort),
                'hcp_id'                  => $hcp->id,
                'enrollee_id'             => $enrollee->id,
                'service_date'            => $data['service_date'],
                'submission_date'         => $data['submission_date'],
                'admission_date'          => $data['admission_date'] ?? null,
                'discharge_date'          => $data['discharge_date'] ?? null,
                'diagnosis_codes'         => $data['diagnosis_codes'],
                'diagnosis_description'   => $data['diagnosis_description'],
                'total_amount_claimed'    => $totalClaimed,
                'total_amount_approved'   => $totalApproved,
                'total_amount_paid'       => $totalPaid,
                'status'                  => $data['status'],
                'claim_type'              => $data['claim_type'],
                'risk_score'              => $data['risk_score'],
                'reviewer_notes'          => $data['reviewer_notes'] ?? null,
                'rejection_reason'        => $data['rejection_reason'] ?? null,
                'approved_at'             => $data['approved_at'] ?? null,
                'paid_at'                 => $data['paid_at'] ?? null,
            ]);

            // Items
            foreach ($data['items'] as $item) {
                $tariff = HcpTariff::where('hcp_id', $hcp->id)->where('service_code', $item['code'])->first();
                $approved = $isApproved ? ($item['price'] * $item['qty']) : null;

                ClaimItem::create([
                    'claim_id'            => $claim->id,
                    'tariff_id'           => $tariff?->id,
                    'service_code'        => $item['code'],
                    'service_name'        => $item['name'],
                    'category'            => $item['cat'],
                    'quantity'            => $item['qty'],
                    'unit_price_claimed'  => $item['price'],
                    'total_price_claimed' => $item['price'] * $item['qty'],
                    'tariff_unit_price'   => $tariff?->agreed_price,
                    'amount_approved'     => $approved,
                    'status'              => $isApproved ? 'approved' : ($data['status'] === 'rejected' ? 'rejected' : 'pending'),
                ]);
            }

            // Status log chain
            $this->seedStatusLogs($claim, $data);

            // Assignment
            if ($data['officer']) {
                ClaimAssignment::create([
                    'claim_id'        => $claim->id,
                    'assigned_to'     => $data['officer']->id,
                    'assigned_by'     => $admin->id,
                    'assignment_type' => 'officer',
                    'is_active'       => !in_array($data['status'], ['approved', 'paid', 'rejected']),
                    'assigned_at'     => now()->subDays(10),
                    'completed_at'    => in_array($data['status'], ['approved','paid','rejected']) ? now()->subDays(5) : null,
                ]);
            }

            // Fraud flags
            foreach ($data['fraud_flags'] ?? [] as $ff) {
                FraudFlag::create([
                    'claim_id'    => $claim->id,
                    'hcp_id'      => $hcp->id,
                    'enrollee_id' => $enrollee->id,
                    'flag_type'   => $ff['type'],
                    'flag_score'  => $ff['score'],
                    'description' => $ff['desc'],
                    'status'      => $ff['status'] ?? 'open',
                    'details'     => json_encode(['auto_detected' => true, 'engine' => 'FraudScoringService v2']),
                ]);
            }

            $this->command->info("✔ Claim: {$claim->claim_number} [{$data['status']}] ₦" . number_format($totalClaimed));
        }
    }

    private function seedStatusLogs(Claim $claim, array $data): void
    {
        $admin = User::where('email', 'superadmin@hmosystem.ng')->first();
        $logs  = [['from' => 'new', 'to' => 'submitted', 'triggered_by' => 'system', 'note' => 'Claim received from HCP portal.', 'user' => null]];

        $s = $data['status'];

        if (in_array($s, ['auto_validating','auto_validated','flagged','under_review','supervisor_review','approved','rejected','paid','reversed'])) {
            $logs[] = ['from' => 'submitted', 'to' => 'auto_validating', 'triggered_by' => 'system', 'note' => 'Auto-validation engine started.', 'user' => null];
        }
        if (in_array($s, ['auto_validated','flagged','under_review','supervisor_review','approved','rejected','paid','reversed'])) {
            if ($data['risk_score'] >= 70 || $s === 'flagged') {
                $logs[] = ['from' => 'auto_validating', 'to' => 'flagged', 'triggered_by' => 'fraud_engine', 'note' => 'Risk score above threshold. Fraud flags raised.', 'user' => null];
            } else {
                $logs[] = ['from' => 'auto_validating', 'to' => 'auto_validated', 'triggered_by' => 'system', 'note' => 'Auto-validation passed. No anomalies detected.', 'user' => null];
            }
        }
        if (in_array($s, ['under_review','supervisor_review','approved','rejected','paid']) && isset($data['officer'])) {
            $logs[] = ['from' => $s === 'flagged' ? 'flagged' : 'auto_validated', 'to' => 'under_review', 'triggered_by' => 'user', 'note' => 'Assigned to claims officer for review.', 'user' => $data['officer']?->id];
        }
        if (in_array($s, ['supervisor_review']) && isset($data['reviewer'])) {
            $logs[] = ['from' => 'under_review', 'to' => 'supervisor_review', 'triggered_by' => 'user', 'note' => 'Escalated to supervisor – high-value claim requires secondary approval.', 'user' => $data['officer']?->id];
        }
        if ($s === 'approved' && isset($data['reviewer'])) {
            $logs[] = ['from' => 'under_review', 'to' => 'approved', 'triggered_by' => 'user', 'note' => $data['reviewer_notes'] ?? 'Approved.', 'user' => $data['reviewer']?->id];
        }
        if ($s === 'rejected') {
            $logs[] = ['from' => 'under_review', 'to' => 'rejected', 'triggered_by' => 'user', 'note' => $data['rejection_reason'] ?? 'Rejected.', 'user' => $data['reviewer']?->id ?? $admin->id];
        }
        if ($s === 'paid') {
            $logs[] = ['from' => 'approved', 'to' => 'paid', 'triggered_by' => 'system', 'note' => 'Payment processed via batch. Funds transferred to HCP.', 'user' => null];
        }

        foreach ($logs as $log) {
            ClaimStatusLog::create([
                'claim_id'     => $claim->id,
                'user_id'      => $log['user'],
                'from_status'  => $log['from'],
                'to_status'    => $log['to'],
                'note'         => $log['note'],
                'triggered_by' => $log['triggered_by'],
            ]);
        }
    }
}