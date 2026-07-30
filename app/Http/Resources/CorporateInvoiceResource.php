<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CorporateInvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $amountPaid = $this->whenLoaded('payments', function () {
            return $this->payments->where('status', 'paid')->sum('amount');
        }, 0.0);

        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'corporate_id' => $this->corporate_id,
            'corporate_name' => $this->corporate?->name,
            'plan_id' => $this->plan_id,
            'plan_name' => $this->plan?->plan_name,
            'period_start' => $this->period_start?->toDateString(),
            'period_end' => $this->period_end?->toDateString(),
            'issue_date' => $this->issue_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'total_amount' => (float) $this->total_amount,
            'amount_paid' => (float) $amountPaid,
            'balance' => (float) ($this->total_amount - $amountPaid),
            'status' => $this->status,
            'status_label' => $this->getStatusLabel(),
            'is_overdue' => $this->isOverdue(),
            'paid_at' => $this->paid_at?->toDateString(),
            'payment_reference' => $this->payment_reference,
            'sent_at' => $this->sent_at?->toISOString(),
            'description' => $this->description,
            'payments' => InvoicePaymentResource::collection($this->whenLoaded('payments')),
            'created_by' => $this->created_by ? [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            // use Storage::url to avoid undefined method issues with disk adapter in some static analyzers
            'download_url' => $this->pdf_path ? Storage::url($this->pdf_path) : null,
        ];
    }

    protected function getStatusLabel(): string
    {
        return match($this->status) {
            'draft' => 'Draft',
            'sent' => 'Sent',
            'overdue' => 'Overdue',
            'paid' => 'Paid',
            'partial' => 'Partially Paid',
            'cancelled' => 'Cancelled',
            default => ucfirst($this->status),
        };
    }
}