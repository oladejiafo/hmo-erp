<?php

namespace App\Policies;

use App\Models\PreAuthorisation;
use App\Models\User;

/**
 * FILE LOCATION: app/Policies/PAPolicy.php
 *
 * Gates/policy for Pre-Authorisation.
 * Register in App\Providers\AuthServiceProvider:
 *
 *   protected $policies = [
 *       PreAuthorisation::class => PAPolicy::class,
 *   ];
 *
 * Assumes users have permissions through roles via a `can(string $permission)` helper.
 * Compatible with spatie/laravel-permission:
 *   $user->can('pa.view')  ← checks permission string
 */
class PAPolicy
{
    /**
     * Anyone with pa.view can list PAs.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('pa.view');
    }

    /**
     * View a specific PA - must belong to user's branch.
     */
    public function view(User $user, PreAuthorisation $pa): bool
    {
        return $user->can('pa.view')
            && $user->branch_id === $pa->branch_id;
    }

    /**
     * Submit a new PA request.
     */
    public function create(User $user): bool
    {
        return $user->can('pa.request');
    }

    /**
     * Approve: checks the correct permission for the PA's current stage.
     *
     * pending / emergency_retrospective → pa.approve_standard
     * awaiting_md                       → pa.approve_high_value
     * awaiting_ceo                      → pa.approve_critical
     */
    public function approve(User $user, PreAuthorisation $pa): bool
    {
        if ($user->branch_id !== $pa->branch_id) {
            return false;
        }

        return match ($pa->status) {
            'pending', 'emergency_retrospective' => $user->can('pa.approve_standard'),
            'awaiting_md'                         => $user->can('pa.approve_high_value'),
            'awaiting_ceo'                        => $user->can('pa.approve_critical'),
            default                               => false,
        };
    }

    /**
     * Decline any active PA.
     */
    public function decline(User $user, PreAuthorisation $pa): bool
    {
        return $user->can('pa.decline')
            && $user->branch_id === $pa->branch_id
            && in_array($pa->status, PreAuthorisation::ACTIVE_STATUSES);
    }

    /**
     * Revoke an approved (unused) PA code.
     * Requires pa.decline permission + PA must be approved with no linked claim.
     */
    public function revoke(User $user, PreAuthorisation $pa): bool
    {
        return $user->can('pa.decline')
            && $user->branch_id === $pa->branch_id
            && $pa->status === 'approved'
            && is_null($pa->claim_id);
    }

    /**
     * Download approval letter PDF.
     */
    public function downloadLetter(User $user, PreAuthorisation $pa): bool
    {
        return $user->can('pa.view')
            && $user->branch_id === $pa->branch_id
            && ! is_null($pa->pa_code);
    }
}