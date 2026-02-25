<?php

namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Models/ComplianceFiling.php
 *
 * A single compliance obligation/deadline on the calendar.
 *
 * @property int         $id
 * @property int         $branch_id
 * @property string      $category
 * @property string      $title
 * @property string|null $description
 * @property Carbon      $due_date
 * @property Carbon|null $reminder_date
 * @property Carbon|null $completed_date
 * @property string      $status
 * @property string      $priority
 * @property string      $recurrence
 * @property int|null    $assigned_to
 * @property int|null    $created_by
 * @property int|null    $completed_by
 * @property string|null $submission_reference
 * @property string|null $completion_notes
 * @property string|null $notes
 */
class ComplianceFiling extends Model
{
    use BelongsToBranch, HasAuditLog;

    protected $table = 'compliance_filings';

    protected $fillable = [
        'branch_id', 'category', 'title', 'description',
        'due_date', 'reminder_date', 'completed_date',
        'status', 'priority', 'recurrence',
        'assigned_to', 'created_by', 'completed_by',
        'submission_reference', 'completion_notes', 'notes',
        'related_entity_type', 'related_entity_id',
    ];

    protected $casts = [
        'due_date'       => 'date',
        'reminder_date'  => 'date',
        'completed_date' => 'date',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ComplianceDocument::class, 'filing_id')->orderByDesc('created_at');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeUpcoming(Builder $q, int $days = 30): Builder
    {
        return $q->whereIn('status', ['upcoming', 'in_progress'])
                 ->where('due_date', '<=', now()->addDays($days));
    }

    public function scopeOverdue(Builder $q): Builder
    {
        return $q->whereNotIn('status', ['completed', 'waived'])
                 ->where('due_date', '<', now());
    }

    public function scopeDueThisMonth(Builder $q): Builder
    {
        return $q->whereMonth('due_date', now()->month)
                 ->whereYear('due_date', now()->year);
    }

    // ── Computed Attributes ───────────────────────────────────────────────────

    public function getDaysUntilDueAttribute(): int
    {
        return (int) now()->startOfDay()->diffInDays($this->due_date->startOfDay(), false);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date->isPast()
            && ! in_array($this->status, ['completed', 'waived']);
    }

    public function getUrgencyAttribute(): string
    {
        $days = $this->days_until_due;
        if ($this->is_overdue)       return 'overdue';
        if ($days <= 3)              return 'critical';
        if ($days <= 7)              return 'warning';
        return 'normal';
    }

    // ── Business Logic ────────────────────────────────────────────────────────

    /**
     * Mark filing as completed and stamp the completed date.
     */
    public function complete(int $userId, ?string $reference = null, ?string $notes = null): void
    {
        $this->update([
            'status'               => 'completed',
            'completed_date'       => today(),
            'completed_by'         => $userId,
            'submission_reference' => $reference ?? $this->submission_reference,
            'completion_notes'     => $notes ?? $this->completion_notes,
        ]);
    }

    /**
     * Spawn the next occurrence for a recurring filing.
     * Called after marking a recurring filing complete.
     */
    public function spawnNextOccurrence(): ?self
    {
        if ($this->recurrence === 'none') {
            return null;
        }

        $nextDue = match ($this->recurrence) {
            'monthly'   => $this->due_date->copy()->addMonth(),
            'quarterly' => $this->due_date->copy()->addMonths(3),
            'biannual'  => $this->due_date->copy()->addMonths(6),
            'annual'    => $this->due_date->copy()->addYear(),
            default     => null,
        };

        if (! $nextDue) return null;

        return static::create([
            'branch_id'   => $this->branch_id,
            'category'    => $this->category,
            'title'       => $this->title,
            'description' => $this->description,
            'due_date'    => $nextDue,
            'reminder_date' => $this->reminder_date
                ? $nextDue->copy()->subDays($this->due_date->diffInDays($this->reminder_date))
                : $nextDue->copy()->subDays(7),
            'priority'    => $this->priority,
            'recurrence'  => $this->recurrence,
            'assigned_to' => $this->assigned_to,
            'created_by'  => $this->created_by,
            'status'      => 'upcoming',
        ]);
    }
}