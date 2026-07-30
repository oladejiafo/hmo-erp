<?php
/**
 * FILE: app/Models/CorporateInvoice.php
 *
 * FIX: had neither $fillable nor $guarded, meaning Eloquent's base
 * default ($guarded = ['*']) blocked ALL mass assignment - every
 * ::create() call threw MassAssignmentException. Rebuilt to match the
 * real, currently-migrated corporate_invoices schema (see the docblock
 * on 2026_09_02_000001 for the full story of how this got out of sync).
 */
namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CorporateInvoice extends Model
{
    use HasAuditLog;

    protected $fillable = [
        'branch_id', 'corporate_id', 'plan_id', 'invoice_number', 'description',
        'subtotal', 'tax_amount', 'total_amount',
        'status', 'issue_date', 'due_date', 'period_start', 'period_end',
        'paid_at', 'payment_reference', 'sent_at', 'created_by', 'pdf_path',
    ];

    protected $casts = [
        'subtotal'     => 'decimal:2',
        'tax_amount'   => 'decimal:2',
        'total_amount' => 'decimal:2',
        'issue_date'   => 'date',
        'due_date'     => 'date',
        'period_start' => 'date',
        'period_end'   => 'date',
        'paid_at'      => 'datetime',
        'sent_at'      => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function corporate(): BelongsTo
    {
        return $this->belongsTo(Corporate::class);
    }

    public function plan(): BelongsTo
    {
        // FIX: originally targeted CorporatePlan/corporate_plans, which turns
        // out to be dead, orphaned code - see the migration docblock. The
        // real, actively-used corporate plan system is the Plan model
        // (plans table has its own corporate_id column; CorporatePlanController
        // manages Plan records, not CorporatePlan ones).
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class, 'corporate_invoice_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isOverdue(): bool
    {
        return in_array($this->status, ['sent', 'overdue']) && $this->due_date?->isPast();
    }
}
