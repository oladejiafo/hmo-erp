<?php

namespace App\Models;

use App\Enums\ReimbursementStatus;
use App\Traits\BelongsToBranch;
use App\Traits\GeneratesUniqueId;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * VERIFIED against real app/Traits/{BelongsToBranch,HasAuditLog,GeneratesUniqueId}.php:
 * - BelongsToBranch: global scope + auto-fills branch_id on create from
 *   the authenticated user. No config needed here, it just works.
 * - HasAuditLog: model events (created/updated/deleted) auto-write to
 *   audit_logs. No config needed here either.
 * - GeneratesUniqueId: NOT automatic. It's a static helper
 *   (`static::generateUniqueId($prefix, $column, $padding, $branchCode)`)
 *   that must be called explicitly BEFORE create(), same as every other
 *   model in this codebase does (see EnrolleePortalController::submitReimbursement()).
 */
class ReimbursementRequest extends Model
{
    use BelongsToBranch, HasAuditLog, GeneratesUniqueId, SoftDeletes;

    protected $fillable = [
        'branch_id', 'reimbursement_number',
        'enrollee_id', 'dependent_id', 'claim_id',
        'amount_requested', 'amount_approved',
        'reason', 'receipt_path',
        'status',
        'reviewed_by', 'reviewed_at', 'reviewer_notes',
        'paid_at', 'payment_reference',
    ];

    protected $casts = [
        'status'           => ReimbursementStatus::class,
        'amount_requested' => 'decimal:2',
        'amount_approved'  => 'decimal:2',
        'reviewed_at'      => 'datetime',
        'paid_at'          => 'datetime',
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isEditable(): bool
    {
        return $this->status === ReimbursementStatus::PENDING;
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeForEnrollee($query, int $enrolleeId)
    {
        return $query->where('enrollee_id', $enrolleeId);
    }

    public function scopeByStatus($query, ReimbursementStatus|string $status)
    {
        $value = $status instanceof ReimbursementStatus ? $status->value : $status;
        return $query->where('status', $value);
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function dependent(): BelongsTo
    {
        return $this->belongsTo(Dependent::class);
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(Claim::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
