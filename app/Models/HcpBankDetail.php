<?php

namespace App\Models;

use App\Traits\HasAuditLog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * HcpBankDetail
 *
 * MAKER-CHECKER PATTERN:
 *   - `added_by`   → the user who submitted this bank account record (the "maker")
 *   - `verified_by` → a DIFFERENT user who approved it (the "checker")
 *   - `is_verified` → true only after a checker approves it
 *
 * PAYMENT ELIGIBILITY:
 *   Only records with is_verified = true can be used in payment batch exports.
 *   The HealthCareProvider::activeBankDetail() scope enforces this.
 *
 * COLUMNS:
 *   id, hcp_id, added_by, bank_name, bank_code, account_name,
 *   account_number, account_type, sort_code, is_verified,
 *   verified_by, verified_at, created_at, updated_at
 */
class HcpBankDetail extends Model
{
    use HasAuditLog;
    
    protected $table = 'hcp_bank_details';

    protected $fillable = [
        'hcp_id',
        'added_by',
        'bank_name',
        'bank_code',
        'account_name',
        'account_number',
        'account_type',
        'sort_code',
        'is_verified',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'account_number' => 'encrypted',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    /** The user who submitted/created this bank detail (the "maker"). */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    /** The user who verified/approved this bank detail (the "checker"). */
    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Whether this bank detail is awaiting verification.
     * A record is pending when it has been added but not yet verified.
     */
    public function isPending(): bool
    {
        return ! $this->is_verified;
    }

    /**
     * Whether the given user is the one who added this bank detail.
     * Used to enforce maker-checker: the verifier must NOT be the adder.
     */
    public function wasAddedBy(int $userId): bool
    {
        return $this->added_by === $userId;
    }

    /**
     * Masked account number for display in lists (non-finance views).
     * Full number is still available via $record->account_number for authorized users.
     */
    public function getMaskedAccountAttribute(): string
    {
        return '****' . substr($this->account_number, -4);
    }
}