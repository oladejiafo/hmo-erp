<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClaimStatusLog extends Model
{
    protected $table = 'claim_status_logs';

    protected $fillable = [
        'claim_id',
        'from_status',
        'to_status',
        'changed_by',
        'reason',
    ];

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}