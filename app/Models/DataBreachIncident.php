<?php
/**
 * FILE: app/Models/DataBreachIncident.php
 */
namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataBreachIncident extends Model
{
    use HasAuditLog;

    protected $fillable = [
        'branch_id', 'title', 'description', 'data_categories_affected',
        'affected_records_count', 'severity', 'occurred_at', 'discovered_at',
        'regulator_notified', 'regulator_notified_at',
        'data_subjects_notified', 'data_subjects_notified_at',
        'remediation_actions', 'status', 'reported_by',
    ];

    protected $casts = [
        'occurred_at'                => 'datetime',
        'discovered_at'               => 'datetime',
        'regulator_notified'          => 'boolean',
        'regulator_notified_at'       => 'datetime',
        'data_subjects_notified'      => 'boolean',
        'data_subjects_notified_at'   => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * NDPA (and most data protection regimes) expect breach notification
     * to the regulator within a fixed window of discovery, commonly 72
     * hours. Surfacing this on the model so the frontend can flag
     * approaching/missed deadlines without duplicating the calculation.
     */
    public function notificationDeadline(): \Carbon\Carbon
    {
        return $this->discovered_at->copy()->addHours(72);
    }

    public function isNotificationOverdue(): bool
    {
        return ! $this->regulator_notified && now()->gt($this->notificationDeadline());
    }
}
