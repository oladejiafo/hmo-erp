<?php

namespace App\Models;

use App\Traits\HasAuditLog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraudFlag extends Model
{
    use HasAuditLog;
    
    protected $fillable = [
        'claim_id', 'hcp_id', 'enrollee_id', 'flag_type',
        'flag_score', 'details', 'description', 'status',
        'reviewed_by', 'reviewed_at', 'reviewer_note',
    ];

    protected $casts = [
        'details'     => 'array',
        'flag_score'  => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }
}
