<?php

namespace App\Observers;

use App\Models\Enrollee;
use Illuminate\Support\Facades\Log;

class EnrolleeObserver
{
    /**
     * When an enrollee's status changes to suspended,
     * deactivate their active card so it cannot be scanned at HCPs.
     */
    public function updated(Enrollee $enrollee): void
    {
        if ($enrollee->isDirty('status') && $enrollee->status->value === 'suspended') {
            $enrollee->cards()
                ->where('status', 'active')
                ->update(['status' => 'cancelled']);

            Log::info("Enrollee {$enrollee->enrollee_id} suspended - active card cancelled.");
        }

        // When reactivated, log it - a new card must be manually issued
        if ($enrollee->isDirty('status') && $enrollee->status->value === 'active') {
            Log::info("Enrollee {$enrollee->enrollee_id} reactivated. New card required.");
        }
    }
}