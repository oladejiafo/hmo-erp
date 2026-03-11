<?php

namespace App\Policies;

use App\Models\Claim;
use App\Models\User;

class ClaimPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('claims.view');
    }

    public function view(User $user, Claim $claim): bool
    {
        return $user->hasPermissionTo('claims.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('claims.create');
    }

    public function update(User $user, Claim $claim): bool
    {
        return $user->hasPermissionTo('claims.edit');
    }

    public function delete(User $user, Claim $claim): bool
    {
        return $user->hasPermissionTo('claims.delete');
    }

    public function restore(User $user, Claim $claim): bool
    {
        return $user->hasPermissionTo('claims.edit');
    }

    public function forceDelete(User $user, Claim $claim): bool
    {
        return $user->hasPermissionTo('claims.delete');
    }
}