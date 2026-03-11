<?php

namespace App\Policies;

use App\Models\Corporate;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CorporatePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('corporates.view');
    }
    
    public function view(User $user, Corporate $corporate): bool
    {
        return $user->hasPermissionTo('corporates.view')
            && ($user->hasRole(['hq_manager','ceo']) || $user->branch_id === $corporate->branch_id);
    }
    
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('corporates.create');
    }
    
    public function update(User $user, Corporate $corporate): bool
    {
        return $user->hasPermissionTo('corporates.edit')
            && ($user->hasRole(['hq_manager','ceo']) || $user->branch_id === $corporate->branch_id);
    }
    
    public function delete(User $user, Corporate $corporate): bool
    {
        return $user->hasPermissionTo('corporates.delete');
    }
    
    public function restore(User $user, Corporate $corporate): bool
    {
        return $user->hasPermissionTo('corporates.delete');
    }
    
    public function forceDelete(User $user, Corporate $corporate): bool
    {
        return $user->hasPermissionTo('corporates.delete');
    }
}
