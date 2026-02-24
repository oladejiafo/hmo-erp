<?php
// create_enrollee_users.php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Enrollee;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

echo "Starting to create user accounts for enrollees...\n\n";

// ✅ FIXED: Get enrollees that don't have a user_id set
$enrollees = Enrollee::whereNull('user_id')->get();

if ($enrollees->count() === 0) {
    echo "All enrollees already have user accounts!\n";
    return;
}

echo "Found " . $enrollees->count() . " enrollees without user accounts.\n\n";

// Create a file to save the passwords
$passwordFile = fopen('enrollee_passwords.csv', 'w');
fputcsv($passwordFile, ['Name', 'Email', 'Temporary Password', 'User ID']);

foreach ($enrollees as $enrollee) {
    // Generate a simple, readable temporary password
    // Example: "John23@45" or "Mary78#12"
    $firstName = explode(' ', trim($enrollee->first_name))[0];
    $randomNum = rand(10, 99);
    $specialChar = ['@', '#', '$', '%'][rand(0, 3)];
    $tempPassword = $firstName . $randomNum . $specialChar . rand(10, 99);
    
    try {
        // Create the user account
        $user = User::create([
            'name' => $enrollee->first_name . ' ' . $enrollee->last_name,
            'email' => $enrollee->email,
            'password' => Hash::make($tempPassword),
            'branch_id' => $enrollee->branch_id,
            'user_type' => 'enrollee_user',
            'enrollee_id' => $enrollee->id,
            'status' => 'active',
            'password_changed_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Assign the enrollee role (if you have this role)
        try {
            $user->assignRole('enrollee_user');
        } catch (\Exception $e) {
            echo "  ⚠ Could not assign role: " . $e->getMessage() . "\n";
        }
        
        // ✅ FIXED: Update the enrollee record with the user_id
        $enrollee->user_id = $user->id;
        $enrollee->save();
        
        // Save to CSV file
        fputcsv($passwordFile, [
            $user->name,
            $user->email,
            $tempPassword,
            $user->id
        ]);
        
        echo "✓ Created user for: " . $user->email . " (ID: " . $user->id . ", Password: " . $tempPassword . ")\n";
        
    } catch (\Exception $e) {
        echo "✗ Failed to create user for " . $enrollee->email . ": " . $e->getMessage() . "\n";
    }
}

fclose($passwordFile);

echo "\n=====================================\n";
echo "✅ COMPLETE! Created " . $enrollees->count() . " user accounts.\n";
echo "📁 Passwords saved to: enrollee_passwords.csv\n";
echo "=====================================\n";