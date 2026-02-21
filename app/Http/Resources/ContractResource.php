<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'hcp_id' => $this->hcp_id,
            'contract_number' => $this->contract_number,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'payment_model' => $this->payment_model,
            'payment_model_label' => $this->getPaymentModelLabel(),
            'capitation_rate' => (float) $this->capitation_rate,
            'ffs_discount_rate' => (float) $this->ffs_discount_rate,
            'terms_summary' => $this->terms_summary,
            'special_terms' => $this->special_terms,
            'status' => $this->status,
            'status_label' => $this->getStatusLabel(),
            'document_path' => $this->document_path,
            
            'document_url' => $this->document_path 
                ? asset('storage/' . $this->document_path)
                : null,
                
            'submitted_at' => $this->submitted_at?->toISOString(),
            'approved_by' => $this->approved_by ? [
                'id' => $this->approvedBy?->id,
                'name' => $this->approvedBy?->name,
            ] : null,
            'approved_at' => $this->approved_at?->toISOString(),
            'terminated_at' => $this->terminated_at?->toISOString(),
            'termination_reason' => $this->termination_reason,
            'created_by' => $this->created_by ? [
                'id' => $this->createdBy?->id,
                'name' => $this->createdBy?->name,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    protected function getPaymentModelLabel(): string
    {
        return match($this->payment_model) {
            'capitation' => 'Capitation',
            'ffs' => 'Fee-for-Service',
            'hybrid' => 'Hybrid',
            default => ucfirst($this->payment_model),
        };
    }

    protected function getStatusLabel(): string
    {
        return match($this->status) {
            'draft' => 'Draft',
            'pending_approval' => 'Pending Approval',
            'active' => 'Active',
            'expired' => 'Expired',
            'terminated' => 'Terminated',
            default => ucfirst($this->status),
        };
    }
}