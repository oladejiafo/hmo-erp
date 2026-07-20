<?php

namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use BelongsToBranch, HasAuditLog;

    protected $fillable = [
        'branch_id', 'enrollee_id', 'dependent_id', 'hcp_id',
        'preferred_date', 'preferred_time_slot', 'reason', 'notes',
        'status', 'confirmed_date', 'confirmed_time', 'confirmed_by',
        'cancellation_reason',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'confirmed_date' => 'date',
    ];

    public function isCancellable(): bool
    {
        return in_array($this->status, ['requested', 'confirmed', 'rescheduled'], true);
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function dependent(): BelongsTo
    {
        return $this->belongsTo(Dependent::class);
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
