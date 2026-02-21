<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClaimResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'claim_number'           => $this->claim_number,
            'claim_type'             => $this->claim_type?->value,
            'claim_type_label'       => $this->claim_type?->label(),
            'service_date'           => $this->service_date?->format('Y-m-d'),
            'submission_date'        => $this->submission_date?->format('Y-m-d'),
            'admission_date'         => $this->admission_date?->format('Y-m-d'),
            'discharge_date'         => $this->discharge_date?->format('Y-m-d'),
            'diagnosis_codes'        => $this->diagnosis_codes,
            'diagnosis_description'  => $this->diagnosis_description,
            'total_amount_claimed'   => $this->total_amount_claimed,
            'total_amount_approved'  => $this->total_amount_approved,
            'total_amount_paid'      => $this->total_amount_paid,
            'discrepancy'            => $this->discrepancy,
            'status'                 => $this->status?->value,
            'status_label'           => $this->status?->label(),
            'status_color'           => $this->status?->color(),
            'risk_score'             => $this->risk_score,
            'is_high_risk'           => $this->isHighRisk(),
            'is_high_value'          => $this->isHighValue(),
            'requires_supervisor'    => $this->requiresSupervisorReview(),
            'is_pre_authorized'      => $this->is_pre_authorized,
            'pre_auth_code'          => $this->pre_auth_code,
            'reviewer_notes'         => $this->reviewer_notes,
            'rejection_reason'       => $this->rejection_reason,
            'auto_validated_at'      => $this->auto_validated_at?->toISOString(),
            'approved_at'            => $this->approved_at?->toISOString(),
            'rejected_at'            => $this->rejected_at?->toISOString(),
            'paid_at'                => $this->paid_at?->toISOString(),
            'created_at'             => $this->created_at?->toISOString(),

            // Relationships
            'hcp'               => $this->whenLoaded('hcp', fn () => $this->hcp ? [
                'id'   => $this->hcp->id,
                'name' => $this->hcp->name,
                'type' => $this->hcp->type?->value,
                'tier' => $this->hcp->tier,
            ] : null),
            'enrollee'          => $this->whenLoaded('enrollee', fn () => $this->enrollee ? [
                'id'          => $this->enrollee->id,
                'enrollee_id' => $this->enrollee->enrollee_id,
                'full_name'   => $this->enrollee->full_name,
            ] : null),
            'dependent'         => $this->whenLoaded('dependent', fn () => $this->dependent ? [
                'id'           => $this->dependent->id,
                'full_name'    => $this->dependent->first_name . ' ' . $this->dependent->last_name,
                'relationship' => $this->dependent->relationship,
            ] : null),
            'items'             => ClaimItemResource::collection($this->whenLoaded('items')),
            'documents'         => $this->whenLoaded('documents'),
            'fraud_flags'       => FraudFlagResource::collection($this->whenLoaded('openFraudFlags')),
            'status_logs'       => $this->whenLoaded('statusLogs'),
            'active_assignment' => $this->whenLoaded('activeAssignment'),
        ];
    }
}