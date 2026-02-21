<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Corporate;
use App\Models\CorporateContact;
use App\Models\CorporatePlan;
use App\Models\CorporateInvoice;
use App\Models\User;
use Illuminate\Database\Seeder;

class CorporateSeeder extends Seeder
{
    public function run(): void
    {
        $hq  = Branch::where('code', 'HQ-001')->first();
        $abj = Branch::where('code', 'ABJ-001')->first();
        $lag = Branch::where('code', 'LAG-001')->first();
        $kan = Branch::where('code', 'KAN-001')->first();
        $riv = Branch::where('code', 'RIV-001')->first();
        $admin = User::where('email', 'superadmin@hmosystem.ng')->first();

        $corporatesData = [
            [
                'branch' => $abj,
                'name'   => 'Zenith Technologies Ltd',
                'code'   => 'CORP-0001',
                'rc_number' => 'RC-1234567',
                'industry'  => 'Information Technology',
                'address'   => '15 Independence Avenue, Garki, Abuja',
                'city'      => 'Abuja', 'state' => 'FCT Abuja',
                'email'     => 'hr@zenithtechnologies.ng',
                'phone'     => '+234-09-2345678',
                'status'    => 'active',
                'contract_start_date' => '2024-01-01',
                'contract_end_date'   => '2025-12-31',
                'total_employees'     => 320,
                'notes' => 'Premium corporate client. Tier 1 plan.',
                'contacts' => [
                    ['name' => 'Adaeze Nwofor', 'title' => 'Head of HR', 'email' => 'adaeze@zenithtechnologies.ng', 'phone' => '+2348012345001', 'type' => 'primary'],
                    ['name' => 'Emeka Eze',      'title' => 'CFO',        'email' => 'emeka@zenithtechnologies.ng',  'phone' => '+2348012345002', 'type' => 'billing'],
                ],
                'plans' => [
                    ['plan_name' => 'Executive Gold', 'plan_code' => 'ZTL-GOLD-001', 'annual_premium' => 350000, 'max_benefit_value' => 2000000, 'employee_count' => 20, 'max_dependents' => 4, 'effective_from' => '2024-01-01', 'effective_to' => '2024-12-31', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','surgery','emergency']],
                    ['plan_name' => 'Silver Plus',    'plan_code' => 'ZTL-SILV-001', 'annual_premium' => 180000, 'max_benefit_value' => 800000,  'employee_count' => 300,'max_dependents' => 3, 'effective_from' => '2024-01-01', 'effective_to' => '2024-12-31', 'covered_services' => ['outpatient','inpatient','dental','emergency']],
                ],
                'invoice' => ['description' => 'Q1 2024 Premium Invoice', 'subtotal' => 54320000, 'tax_amount' => 4889000, 'total_amount' => 59209000, 'status' => 'paid', 'issue_date' => '2024-01-05', 'due_date' => '2024-01-20', 'paid_at' => '2024-01-18', 'payment_reference' => 'TRF-2024-ZTL-001'],
            ],
            [
                'branch' => $lag,
                'name'   => 'Dangote Industries Group',
                'code'   => 'CORP-0002',
                'rc_number' => 'RC-9876543',
                'industry'  => 'Manufacturing & Commodities',
                'address'   => '1 Dangote Plaza, Victoria Island, Lagos',
                'city'      => 'Lagos', 'state' => 'Lagos',
                'email'     => 'benefits@dangoteindustries.ng',
                'phone'     => '+234-01-4567890',
                'status'    => 'active',
                'contract_start_date' => '2023-07-01',
                'contract_end_date'   => '2025-06-30',
                'total_employees'     => 1500,
                'notes' => 'Largest corporate client. Multi-tier plan.',
                'contacts' => [
                    ['name' => 'Ifeanyi Mba', 'title' => 'Group HR Director', 'email' => 'ifeanyi@dangote.ng', 'phone' => '+2348023456001', 'type' => 'primary'],
                ],
                'plans' => [
                    ['plan_name' => 'Diamond Elite',  'plan_code' => 'DIG-DIAM-001', 'annual_premium' => 500000, 'max_benefit_value' => 5000000, 'employee_count' => 50,   'max_dependents' => 4, 'effective_from' => '2023-07-01', 'effective_to' => '2025-06-30', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','surgery','emergency','laboratory','radiology']],
                    ['plan_name' => 'Gold Standard',  'plan_code' => 'DIG-GOLD-001', 'annual_premium' => 280000, 'max_benefit_value' => 1500000, 'employee_count' => 450,  'max_dependents' => 4, 'effective_from' => '2023-07-01', 'effective_to' => '2025-06-30', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','emergency']],
                    ['plan_name' => 'Bronze Basic',   'plan_code' => 'DIG-BRNZ-001', 'annual_premium' => 90000,  'max_benefit_value' => 400000,  'employee_count' => 1000, 'max_dependents' => 2, 'effective_from' => '2023-07-01', 'effective_to' => '2025-06-30', 'covered_services' => ['outpatient','inpatient','emergency']],
                ],
                'invoice' => ['description' => 'H2 2024 Semi-Annual Premium', 'subtotal' => 180000000, 'tax_amount' => 27000000, 'total_amount' => 207000000, 'status' => 'paid', 'issue_date' => '2024-06-01', 'due_date' => '2024-06-30', 'paid_at' => '2024-06-25', 'payment_reference' => 'TRF-2024-DIG-002'],
            ],
            [
                'branch' => $abj,
                'name'   => 'Federal Ministry of Health',
                'code'   => 'CORP-0003',
                'rc_number' => 'GOV-FMOH-001',
                'industry'  => 'Government / Public Sector',
                'address'   => 'New Federal Secretariat Complex, Abuja',
                'city'      => 'Abuja', 'state' => 'FCT Abuja',
                'email'     => 'welfare@health.gov.ng',
                'phone'     => '+234-09-5551234',
                'status'    => 'active',
                'contract_start_date' => '2024-01-01',
                'contract_end_date'   => '2024-12-31',
                'total_employees'     => 850,
                'notes' => 'Government client. Monthly invoicing. Budget cycle dependent.',
                'contacts' => [
                    ['name' => 'Dr. Yemi Afolabi', 'title' => 'Director of HR Services', 'email' => 'yemi.afolabi@health.gov.ng', 'phone' => '+2348034567001', 'type' => 'primary'],
                    ['name' => 'Mrs. Bola Kuti',   'title' => 'Accounts Officer',         'email' => 'bola.kuti@health.gov.ng',   'phone' => '+2348034567002', 'type' => 'billing'],
                ],
                'plans' => [
                    ['plan_name' => 'Civil Service Comprehensive', 'plan_code' => 'GOV-COMP-001', 'annual_premium' => 150000, 'max_benefit_value' => 600000, 'employee_count' => 850, 'max_dependents' => 4, 'effective_from' => '2024-01-01', 'effective_to' => '2024-12-31', 'covered_services' => ['outpatient','inpatient','dental','maternity','emergency','laboratory']],
                ],
                'invoice' => ['description' => 'January 2024 Monthly Premium', 'subtotal' => 10625000, 'tax_amount' => 0, 'total_amount' => 10625000, 'status' => 'paid', 'issue_date' => '2024-01-01', 'due_date' => '2024-01-31', 'paid_at' => '2024-01-28', 'payment_reference' => 'TSAPAYMENT-FMOH-JAN24'],
            ],
            [
                'branch' => $lag,
                'name'   => 'Access Bank PLC',
                'code'   => 'CORP-0004',
                'rc_number' => 'RC-0125384',
                'industry'  => 'Banking & Financial Services',
                'address'   => '14/15 Prince Alaba Oniru Street, Victoria Island, Lagos',
                'city'      => 'Lagos', 'state' => 'Lagos',
                'email'     => 'staffwelfare@accessbankplc.com',
                'phone'     => '+234-01-2712005',
                'status'    => 'active',
                'contract_start_date' => '2024-03-01',
                'contract_end_date'   => '2025-12-31',
                'total_employees'     => 4800,
                'notes' => 'Very large client. Nation-wide employees covered across branches.',
                'contacts' => [
                    ['name' => 'Funke Osaghae', 'title' => 'Group Head, HR', 'email' => 'f.osaghae@accessbankplc.com', 'phone' => '+2348045678001', 'type' => 'primary'],
                ],
                'plans' => [
                    ['plan_name' => 'Executive Platinum', 'plan_code' => 'ABP-PLAT-001', 'annual_premium' => 480000, 'max_benefit_value' => 4000000, 'employee_count' => 200,  'max_dependents' => 4, 'effective_from' => '2024-03-01', 'effective_to' => '2025-12-31', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','surgery','emergency','laboratory','radiology']],
                    ['plan_name' => 'Staff Premium',      'plan_code' => 'ABP-PREM-001', 'annual_premium' => 220000, 'max_benefit_value' => 1200000, 'employee_count' => 2000, 'max_dependents' => 3, 'effective_from' => '2024-03-01', 'effective_to' => '2025-12-31', 'covered_services' => ['outpatient','inpatient','dental','optical','emergency','maternity']],
                    ['plan_name' => 'Support Staff',      'plan_code' => 'ABP-SUPP-001', 'annual_premium' => 85000,  'max_benefit_value' => 350000,  'employee_count' => 2600, 'max_dependents' => 2, 'effective_from' => '2024-03-01', 'effective_to' => '2025-12-31', 'covered_services' => ['outpatient','inpatient','emergency']],
                ],
                'invoice' => ['description' => 'Q2 2024 Premium Invoice', 'subtotal' => 300000000, 'tax_amount' => 45000000, 'total_amount' => 345000000, 'status' => 'sent', 'issue_date' => '2024-04-01', 'due_date' => '2024-04-30', 'paid_at' => null, 'payment_reference' => null],
            ],
            [
                'branch' => $kan,
                'name'   => 'Kano State Teaching Hospital Board',
                'code'   => 'CORP-0005',
                'rc_number' => 'GOV-KSTH-001',
                'industry'  => 'Healthcare (Public)',
                'address'   => 'Bayero University Road, Kano',
                'city'      => 'Kano', 'state' => 'Kano',
                'email'     => 'admin@ksth.gov.ng',
                'phone'     => '+234-064-668822',
                'status'    => 'active',
                'contract_start_date' => '2024-01-01',
                'contract_end_date'   => '2024-12-31',
                'total_employees'     => 2200,
                'notes' => 'State hospital board staff. Complex coverage needs for healthcare workers.',
                'contacts' => [
                    ['name' => 'Prof. Adamu Yusuf', 'title' => 'Chief Medical Director', 'email' => 'cmd@ksth.gov.ng', 'phone' => '+2348056789001', 'type' => 'primary'],
                ],
                'plans' => [
                    ['plan_name' => 'Medical Staff Elite', 'plan_code' => 'KST-ELIT-001', 'annual_premium' => 200000, 'max_benefit_value' => 1000000, 'employee_count' => 400, 'max_dependents' => 4, 'effective_from' => '2024-01-01', 'effective_to' => '2024-12-31', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','surgery','emergency','laboratory']],
                    ['plan_name' => 'Support Staff Basic',  'plan_code' => 'KST-BSIC-001', 'annual_premium' => 80000,  'max_benefit_value' => 350000,  'employee_count' => 1800,'max_dependents' => 2, 'effective_from' => '2024-01-01', 'effective_to' => '2024-12-31', 'covered_services' => ['outpatient','inpatient','emergency']],
                ],
                'invoice' => ['description' => 'FY2024 Annual Premium', 'subtotal' => 224000000, 'tax_amount' => 0, 'total_amount' => 224000000, 'status' => 'overdue', 'issue_date' => '2024-01-01', 'due_date' => '2024-02-01', 'paid_at' => null, 'payment_reference' => null],
            ],
            [
                'branch' => $riv,
                'name'   => 'Shell Petroleum Development Company',
                'code'   => 'CORP-0006',
                'rc_number' => 'RC-0023456',
                'industry'  => 'Oil & Gas',
                'address'   => '21 Amadi Creek Road, Port Harcourt',
                'city'      => 'Port Harcourt', 'state' => 'Rivers',
                'email'     => 'benefits.ng@shell.com',
                'phone'     => '+234-084-336000',
                'status'    => 'suspended',
                'contract_start_date' => '2023-01-01',
                'contract_end_date'   => '2024-06-30',
                'total_employees'     => 3200,
                'notes' => 'Contract under renegotiation. Suspended pending new terms.',
                'contacts' => [
                    ['name' => 'Chinyere Obi', 'title' => 'HR Business Partner', 'email' => 'chinyere.obi@shell.com', 'phone' => '+2348067890001', 'type' => 'primary'],
                ],
                'plans' => [
                    ['plan_name' => 'Expatriate Platinum', 'plan_code' => 'SHE-EXPAT-001', 'annual_premium' => 1200000, 'max_benefit_value' => 15000000, 'employee_count' => 200,  'max_dependents' => 4, 'effective_from' => '2023-01-01', 'effective_to' => '2024-06-30', 'status' => 'expired', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','surgery','emergency','laboratory','radiology']],
                    ['plan_name' => 'Staff Comprehensive',  'plan_code' => 'SHE-COMP-001',  'annual_premium' => 350000,  'max_benefit_value' => 2500000,  'employee_count' => 3000, 'max_dependents' => 4, 'effective_from' => '2023-01-01', 'effective_to' => '2024-06-30', 'status' => 'expired', 'covered_services' => ['outpatient','inpatient','dental','optical','maternity','emergency']],
                ],
                'invoice' => ['description' => 'Final Invoice Before Suspension', 'subtotal' => 75000000, 'tax_amount' => 11250000, 'total_amount' => 86250000, 'status' => 'overdue', 'issue_date' => '2024-05-01', 'due_date' => '2024-05-31', 'paid_at' => null, 'payment_reference' => null],
            ],
        ];

        foreach ($corporatesData as $data) {
            $corporate = Corporate::firstOrCreate(
                ['code' => $data['code']],
                [
                    'branch_id'           => $data['branch']->id,
                    'name'                => $data['name'],
                    'rc_number'           => $data['rc_number'],
                    'industry'            => $data['industry'],
                    'address'             => $data['address'],
                    'city'                => $data['city'],
                    'state'               => $data['state'],
                    'email'               => $data['email'],
                    'phone'               => $data['phone'],
                    'status'              => $data['status'],
                    'contract_start_date' => $data['contract_start_date'],
                    'contract_end_date'   => $data['contract_end_date'],
                    'total_employees'     => $data['total_employees'],
                    'notes'               => $data['notes'],
                ]
            );

            // Contacts
            foreach ($data['contacts'] as $c) {
                CorporateContact::firstOrCreate(
                    ['corporate_id' => $corporate->id, 'email' => $c['email']],
                    ['name' => $c['name'], 'title' => $c['title'], 'phone' => $c['phone'], 'type' => $c['type']]
                );
            }

            // Plans
            foreach ($data['plans'] as $p) {
                CorporatePlan::firstOrCreate(
                    ['plan_code' => $p['plan_code']],
                    [
                        'corporate_id'     => $corporate->id,
                        'plan_name'        => $p['plan_name'],
                        'annual_premium'   => $p['annual_premium'],
                        'max_benefit_value'=> $p['max_benefit_value'],
                        'employee_count'   => $p['employee_count'],
                        'max_dependents'   => $p['max_dependents'],
                        'covered_services' => $p['covered_services'],
                        'status'           => $p['status'] ?? 'active',
                        'effective_from'   => $p['effective_from'],
                        'effective_to'     => $p['effective_to'],
                    ]
                );
            }

            // Invoice
            $inv = $data['invoice'];
            CorporateInvoice::firstOrCreate(
                ['invoice_number' => 'INV-' . $data['code'] . '-001'],
                [
                    'corporate_id'      => $corporate->id,
                    'branch_id'         => $data['branch']->id,
                    'description'       => $inv['description'],
                    'subtotal'          => $inv['subtotal'],
                    'tax_amount'        => $inv['tax_amount'],
                    'total_amount'      => $inv['total_amount'],
                    'status'            => $inv['status'],
                    'issue_date'        => $inv['issue_date'],
                    'due_date'          => $inv['due_date'],
                    'paid_at'           => $inv['paid_at'],
                    'payment_reference' => $inv['payment_reference'],
                    'created_by'        => $admin->id,
                ]
            );

            $this->command->info("✔ Corporate: {$data['name']} [{$data['status']}]");
        }
    }
}