<?php

namespace App\Models;

use App\Traits\HasAuditLog; 
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LedgerEntry extends Model
{
    use HasAuditLog;
    public $timestamps = false;  // only has created_at

    protected $fillable = [
        'branch_id',
        'entry_type',       // credit | debit
        'category',         // claim_payment, capitation, refund, etc.
        'amount',
        'running_balance',
        'reference_type',   // e.g. App\Models\PaymentBatch
        'reference_id',
        'description',
        'created_by',
        'created_at',
    ];

    protected $casts = [
        'amount'          => 'decimal:2',
        'running_balance' => 'decimal:2',
        'created_at'      => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'reference_type', 'reference_id');
    }

    // ── Scopes ────────────────────────────────────────────────────────────

    public function scopeCredits($query)
    {
        return $query->where('entry_type', 'credit');
    }

    public function scopeDebits($query)
    {
        return $query->where('entry_type', 'debit');
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}