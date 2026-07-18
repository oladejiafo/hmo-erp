<?php

namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HcpCheckin extends Model
{
    use BelongsToBranch, HasAuditLog;

    protected $fillable = [
        'branch_id', 'hcp_id', 'enrollee_id', 'dependent_id',
        'status', 'acknowledged_by', 'acknowledged_at',
    ];

    protected $casts = [
        'acknowledged_at' => 'datetime',
    ];

    public function isExpired(): bool
    {
        // A check-in nobody acknowledged in 30 minutes isn't useful anymore —
        // the member's either already been seen at the desk or gave up and
        // walked to the counter directly. Auto-expired at read time (see
        // ProviderPortalController::checkins()), no scheduled job needed for
        // a first pass.
        return $this->status === 'pending' && $this->created_at->diffInMinutes(now()) > 30;
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function dependent(): BelongsTo
    {
        return $this->belongsTo(Dependent::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }
}
