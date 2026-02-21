<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LedgerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'entry_number' => $this->entry_number,
            'entry_type' => $this->entry_type,
            'entry_type_label' => $this->entry_type === 'debit' ? 'Debit' : 'Credit',
            'category' => $this->category,
            'category_label' => $this->getCategoryLabel(),
            'amount' => (float) $this->amount,
            'description' => $this->description,
            'entry_date' => $this->entry_date?->toDateString(),
            'reference' => $this->reference,
            'source_type' => $this->source_type,
            'source' => $this->when($this->sourceable, fn() => [
                'id' => $this->sourceable?->id,
                'type' => class_basename($this->sourceable),
                'reference' => $this->sourceable?->reference ?? $this->sourceable?->id,
            ]),
            'branch' => $this->whenLoaded('branch', fn() => [
                'id' => $this->branch?->id,
                'name' => $this->branch?->name,
                'code' => $this->branch?->code,
            ]),
            'created_by' => $this->created_by ? [
                'id' => $this->createdBy?->id,
                'name' => $this->createdBy?->name,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    protected function getCategoryLabel(): string
    {
        return match($this->category) {
            'premium' => 'Premium Collection',
            'claim_payment' => 'Claim Payment',
            'capitation' => 'Capitation Payment',
            'refund' => 'Refund',
            'adjustment' => 'Adjustment',
            'fee' => 'Service Fee',
            default => ucfirst(str_replace('_', ' ', $this->category)),
        };
    }
}