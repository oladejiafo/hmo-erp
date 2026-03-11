<?php

namespace App\Policies;

use App\Models\Enrollee;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class EnrolleePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool   { return $user->hasPermissionTo('enrollees.view'); }
    public function view(User $user, Enrollee $enrollee): bool { return $user->hasPermissionTo('enrollees.view'); }
    public function create(User $user): bool    { return $user->hasPermissionTo('enrollees.create'); }
    public function update(User $user, Enrollee $enrollee): bool { return $user->hasPermissionTo('enrollees.edit'); }
    public function delete(User $user, Enrollee $enrollee): bool { return $user->hasPermissionTo('enrollees.delete'); }
    public function restore(User $user, Enrollee $enrollee): bool { return $user->hasPermissionTo('enrollees.delete'); }
    public function forceDelete(User $user, Enrollee $enrollee): bool { return $user->hasPermissionTo('enrollees.delete'); }
}
