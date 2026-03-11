<?php

namespace App\Policies;

use App\Models\HealthCareProvider;
use App\Models\User;

class HcpPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('hcps.view');
    }

    public function view(User $user, HealthCareProvider $healthCareProvider): bool
    {
        return $user->hasPermissionTo('hcps.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('hcps.create');
    }

    public function update(User $user, HealthCareProvider $healthCareProvider): bool
    {
        return $user->hasPermissionTo('hcps.edit');
    }

    public function delete(User $user, HealthCareProvider $healthCareProvider): bool
    {
        return $user->hasPermissionTo('hcps.delete');
    }

    public function restore(User $user, HealthCareProvider $healthCareProvider): bool
    {
        return $user->hasPermissionTo('hcps.edit');
    }

    public function forceDelete(User $user, HealthCareProvider $healthCareProvider): bool
    {
        return $user->hasPermissionTo('hcps.delete');
    }
}