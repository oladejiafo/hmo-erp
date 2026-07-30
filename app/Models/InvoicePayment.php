<?php
// NEW FILE — app/Models/InvoicePayment.php

namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoicePayment extends Model
{
    use HasAuditLog;

    protected $fillable = ['corporate_invoice_id', 'tx_ref', 'gateway_reference', 'amount', 'status', 'payment_link', 'response_payload', 'paid_at'];
    protected $casts = ['amount' => 'decimal:2', 'response_payload' => 'array', 'paid_at' => 'datetime'];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(CorporateInvoice::class, 'corporate_invoice_id');
    }
}
