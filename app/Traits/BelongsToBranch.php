<?php

namespace App\Traits;

use App\Models\Branch;
use App\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Apply this trait to any model that belongs to a branch.
 * Automatically:
 *   1. Attaches the BranchScope global query scope
 *   2. Auto-fills branch_id from the authenticated user on create
 *   3. Exposes the branch() relationship
 */
trait BelongsToBranch
{
    public static function bootBelongsToBranch(): void
    {
        static::addGlobalScope(new BranchScope());

        static::creating(function ($model) {
            if (empty($model->branch_id) && Auth::check()) {
                $model->branch_id = Auth::user()->branch_id;
            }
        });
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}