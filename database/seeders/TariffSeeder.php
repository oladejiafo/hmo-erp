<?php
// database/seeders/TariffSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TariffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tariffs = [
            // Evaluation and Management (CPT codes)
            [
                'procedure_code' => '99201',
                'procedure_name' => 'Office Visit New Patient - Level 1',
                'procedure_type' => 'CPT',
                'amount' => 45.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Consultation',
                'specialty' => 'General Practice',
                'description' => 'Office visit for new patient, 10 minutes'
            ],
            [
                'procedure_code' => '99202',
                'procedure_name' => 'Office Visit New Patient - Level 2',
                'procedure_type' => 'CPT',
                'amount' => 75.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Consultation',
                'specialty' => 'General Practice',
                'description' => 'Office visit for new patient, 20 minutes'
            ],
            [
                'procedure_code' => '99203',
                'procedure_name' => 'Office Visit New Patient - Level 3',
                'procedure_type' => 'CPT',
                'amount' => 110.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Consultation',
                'specialty' => 'General Practice',
                'description' => 'Office visit for new patient, 30 minutes'
            ],
            [
                'procedure_code' => '99213',
                'procedure_name' => 'Office Visit Established Patient - Level 3',
                'procedure_type' => 'CPT',
                'amount' => 75.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Consultation',
                'specialty' => 'General Practice',
                'description' => 'Office visit for established patient, 15 minutes'
            ],
            [
                'procedure_code' => '99214',
                'procedure_name' => 'Office Visit Established Patient - Level 4',
                'procedure_type' => 'CPT',
                'amount' => 110.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Consultation',
                'specialty' => 'General Practice',
                'description' => 'Office visit for established patient, 25 minutes'
            ],
            [
                'procedure_code' => '99215',
                'procedure_name' => 'Office Visit Established Patient - Level 5',
                'procedure_type' => 'CPT',
                'amount' => 150.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Consultation',
                'specialty' => 'General Practice',
                'description' => 'High complexity office visit'
            ],

            // Surgical Procedures
            [
                'procedure_code' => '44970',
                'procedure_name' => 'Laparoscopic Appendectomy',
                'procedure_type' => 'CPT',
                'amount' => 1250.00,
                'tolerance' => 10.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Surgery',
                'specialty' => 'General Surgery',
                'requires_pre_auth' => true,
                'description' => 'Removal of appendix laparoscopically'
            ],
            [
                'procedure_code' => '47562',
                'procedure_name' => 'Laparoscopic Cholecystectomy',
                'procedure_type' => 'CPT',
                'amount' => 1500.00,
                'tolerance' => 10.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Surgery',
                'specialty' => 'General Surgery',
                'requires_pre_auth' => true,
                'description' => 'Gallbladder removal'
            ],

            // Radiology/Imaging
            [
                'procedure_code' => '71045',
                'procedure_name' => 'Chest X-Ray - 1 View',
                'procedure_type' => 'CPT',
                'amount' => 45.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Radiology',
                'specialty' => 'Radiology',
                'description' => 'Single view chest x-ray'
            ],
            [
                'procedure_code' => '71046',
                'procedure_name' => 'Chest X-Ray - 2 Views',
                'procedure_type' => 'CPT',
                'amount' => 65.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Radiology',
                'specialty' => 'Radiology',
                'description' => 'Two view chest x-ray'
            ],
            [
                'procedure_code' => '74177',
                'procedure_name' => 'CT Abdomen and Pelvis with Contrast',
                'procedure_type' => 'CPT',
                'amount' => 550.00,
                'tolerance' => 8.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Radiology',
                'specialty' => 'Radiology',
                'requires_pre_auth' => true,
                'description' => 'CT scan of abdomen and pelvis with contrast'
            ],

            // Laboratory
            [
                'procedure_code' => '80053',
                'procedure_name' => 'Comprehensive Metabolic Panel',
                'procedure_type' => 'CPT',
                'amount' => 25.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Laboratory',
                'specialty' => 'Pathology',
                'description' => '14 tests including glucose, electrolytes, liver function'
            ],
            [
                'procedure_code' => '80061',
                'procedure_name' => 'Lipid Panel',
                'procedure_type' => 'CPT',
                'amount' => 20.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Laboratory',
                'specialty' => 'Pathology',
                'description' => 'Cholesterol, HDL, LDL, triglycerides'
            ],
            [
                'procedure_code' => '85025',
                'procedure_name' => 'Complete Blood Count (CBC)',
                'procedure_type' => 'CPT',
                'amount' => 15.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Laboratory',
                'specialty' => 'Pathology',
                'description' => 'Complete blood count with differential'
            ],

            // Injections/Medications (HCPCS codes)
            [
                'procedure_code' => 'J1100',
                'procedure_name' => 'Dexamethasone Injection',
                'procedure_type' => 'HCPCS',
                'amount' => 12.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Medication',
                'specialty' => 'General',
                'description' => 'Dexamethasone sodium phosphate injection'
            ],
            [
                'procedure_code' => 'J3301',
                'procedure_name' => 'Kenalog Injection',
                'procedure_type' => 'HCPCS',
                'amount' => 25.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Medication',
                'specialty' => 'Rheumatology',
                'description' => 'Triamcinolone acetonide injection'
            ],

            // Physical Therapy
            [
                'procedure_code' => '97110',
                'procedure_name' => 'Therapeutic Exercise',
                'procedure_type' => 'CPT',
                'amount' => 35.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Therapy',
                'specialty' => 'Physical Therapy',
                'description' => 'Therapeutic exercises to develop strength and endurance'
            ],
            [
                'procedure_code' => '97140',
                'procedure_name' => 'Manual Therapy',
                'procedure_type' => 'CPT',
                'amount' => 40.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Therapy',
                'specialty' => 'Physical Therapy',
                'description' => 'Manual therapy techniques'
            ],

            // Emergency Services
            [
                'procedure_code' => '99281',
                'procedure_name' => 'Emergency Visit - Level 1',
                'procedure_type' => 'CPT',
                'amount' => 50.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Emergency',
                'specialty' => 'Emergency Medicine',
                'description' => 'Emergency department visit for minor problem'
            ],
            [
                'procedure_code' => '99285',
                'procedure_name' => 'Emergency Visit - Level 5',
                'procedure_type' => 'CPT',
                'amount' => 250.00,
                'tolerance' => 5.00,
                'effective_from' => '2024-01-01',
                'effective_to' => null,
                'category' => 'Emergency',
                'specialty' => 'Emergency Medicine',
                'requires_pre_auth' => false,
                'description' => 'Critical emergency department visit'
            ],
        ];

        foreach ($tariffs as $tariff) {
            DB::table('tariffs')->insert(array_merge($tariff, [
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                'is_active' => true,
                'currency' => 'USD'
            ]));
        }
    }
}