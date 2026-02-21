<?php
// app/Models/ClaimState.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Enums\ClaimStatus;

class ClaimState extends Model
{
    protected $fillable = [
        'claim_id',
        'from_status',
        'to_status',
        'changed_by',
        'changed_at',
        'notes',
    ];

    protected $casts = [
        'from_status' => ClaimStatus::class,
        'to_status' => ClaimStatus::class,
        'changed_at' => 'datetime',
    ];

    public function claim()
    {
        return $this->belongsTo(Claim::class);
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}