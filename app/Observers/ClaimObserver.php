<?php

namespace App\Observers;

use App\Jobs\ProcessClaimValidation;
use App\Models\Claim;
use Illuminate\Support\Facades\Log;

class ClaimObserver
{
    /**
     * After a claim is created, immediately dispatch the validation job.
     * The job runs in the 'claims' queue — separate from the default queue
     * so high-volume claim submissions don't block other queue jobs.
     */
    public function created(Claim $claim): void
    {
        Log::info("Claim created: {$claim->claim_number}. Dispatching validation job.");

        ProcessClaimValidation::dispatch($claim)
            ->onQueue('claims')
            ->delay(now()->addSeconds(2)); // 2s delay allows the DB transaction to fully commit
    }

    /**
     * Log significant status changes for operations awareness.
     */
    public function updated(Claim $claim): void
    {
        if ($claim->isDirty('status')) {
            $old = $claim->getOriginal('status');
            $new = $claim->status;
    
            Log::info(sprintf(
                'Claim %s status changed: %s → %s',
                $claim->claim_number,
                $old instanceof \BackedEnum ? $old->value : (string) $old,  // ← fix
                $new instanceof \BackedEnum ? $new->value : (string) $new,  // ← fix
            ));
        }
    }
}