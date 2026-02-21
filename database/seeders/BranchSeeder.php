<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    private array $branches = [
        [
            'name'    => 'Head Office',
            'code'    => 'HQ-001',
            'state'   => 'Lagos',
            'address' => '10 Admiralty Way, Lekki Phase 1, Lagos',
            'phone'   => '+234-01-2345678',
            'email'   => 'hq@hmosystem.ng',
            'type'    => 'HQ',
            'status'  => 'active',
        ],
        [
            'name'    => 'Abuja State Branch',
            'code'    => 'ABJ-001',
            'state'   => 'FCT Abuja',
            'address' => '5 Constitution Avenue, Central Business District, Abuja',
            'phone'   => '+234-09-1234567',
            'email'   => 'abuja@hmosystem.ng',
            'type'    => 'STATE',
            'status'  => 'active',
        ],
        [
            'name'    => 'Lagos State Branch',
            'code'    => 'LAG-001',
            'state'   => 'Lagos',
            'address' => '25 Broad Street, Lagos Island, Lagos',
            'phone'   => '+234-01-9876543',
            'email'   => 'lagos@hmosystem.ng',
            'type'    => 'STATE',
            'status'  => 'active',
        ],
        [
            'name'    => 'Kano State Branch',
            'code'    => 'KAN-001',
            'state'   => 'Kano',
            'address' => '12 Murtala Mohammed Way, Kano',
            'phone'   => '+234-064-123456',
            'email'   => 'kano@hmosystem.ng',
            'type'    => 'STATE',
            'status'  => 'active',
        ],
        [
            'name'    => 'Rivers State Branch',
            'code'    => 'RIV-001',
            'state'   => 'Rivers',
            'address' => '3 Forces Avenue, Port Harcourt, Rivers',
            'phone'   => '+234-084-234567',
            'email'   => 'portharcourt@hmosystem.ng',
            'type'    => 'STATE',
            'status'  => 'active',
        ],
    ];

    public function run(): void
    {
        foreach ($this->branches as $branch) {
            Branch::firstOrCreate(['code' => $branch['code']], $branch);
            $this->command->info("✔ Branch: {$branch['name']}");
        }
    }
}