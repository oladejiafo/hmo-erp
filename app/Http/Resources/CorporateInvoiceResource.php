<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CorporateInvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOverdue = $this->status === 'sent' && $this->due_date < now();

        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'corporate_id' => $this->corporate_id,
            'corporate_name' => $this->corporate?->name,
            'plan' => new CorporatePlanResource($this->whenLoaded('plan')),
            'plan_name' => $this->plan?->name,
            'period_start' => $this->period_start?->toDateString(),
            'period_end' => $this->period_end?->toDateString(),
            'invoice_date' => $this->invoice_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'amount_subtotal' => (float) $this->amount_subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'amount_due' => (float) $this->amount_due,
            'amount_paid' => (float) ($this->payments_sum_amount ?? 0),
            'balance' => (float) ($this->amount_due - ($this->payments_sum_amount ?? 0)),
            'status' => $this->status,
            'status_label' => $this->getStatusLabel(),
            'is_overdue' => $isOverdue,
            'payment_method' => $this->payment_method,
            'payment_date' => $this->payment_date?->toDateString(),
            'transaction_reference' => $this->transaction_reference,
            'description' => $this->description,
            'items' => $this->items,
            'payments' => $this->whenLoaded('payments', fn() => $this->payments),
            'created_by' => $this->created_by ? [
                'id' => $this->creator?->id,
                'name' => $this->creator?->name,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'download_url' => route('corporates.invoices.download', [
                'corporate' => $this->corporate_id,
                'invoice' => $this->id
            ]),
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