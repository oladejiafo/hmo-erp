<?php

namespace App\Models;

use App\Enums\TicketStatus;
use App\Enums\TicketPriority;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use App\Traits\HasSlaClock;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId, SoftDeletes, HasSlaClock;

    protected $fillable = [
        'branch_id', 'ticket_number', 'subject', 'description', 'category', 'priority',
        'status', 'source', 'raised_by_user_id',
        'enrollee_id', 'corporate_id', 'hcp_id', 'hcp_name',
        'sla_target_hours',
        'assigned_to', 'assigned_by', 'assigned_at',
        'resolution_note', 'resolved_at', 'resolved_by', 'closed_at',
    ];

    protected $casts = [
        'status'       => TicketStatus::class,
        'priority'     => TicketPriority::class,
        'assigned_at'  => 'datetime',
        'resolved_at'  => 'datetime',
        'closed_at'    => 'datetime',
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Required by HasSlaClock - "active" here means the clock is still running. */
    public function isSlaActive(): bool
    {
        return $this->status->isActive();
    }

    public function isEditableByRaiser(): bool
    {
        return in_array($this->status, [TicketStatus::OPEN, TicketStatus::IN_PROGRESS], true);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeForEnrollee($query, int $enrolleeId)
    {
        return $query->where('enrollee_id', $enrolleeId);
    }

    public function scopeForCorporate($query, int $corporateId)
    {
        return $query->where('corporate_id', $corporateId);
    }

    public function scopeForHcp($query, int $hcpId)
    {
        return $query->where('hcp_id', $hcpId);
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', [TicketStatus::OPEN->value, TicketStatus::IN_PROGRESS->value]);
    }

    public function scopeUnassigned($query)
    {
        return $query->whereNull('assigned_to');
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function raisedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'raised_by_user_id');
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function corporate(): BelongsTo
    {
        return $this->belongsTo(Corporate::class);
    }

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function assignedToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)->orderBy('created_at');
    }

    /** Messages visible to the portal user who raised it - internal notes excluded. */
    public function publicMessages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)
            ->where('is_internal_note', false)
            ->orderBy('created_at');
    }
}
