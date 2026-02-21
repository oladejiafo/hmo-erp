<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CorporateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'code'                => $this->code,
            'rc_number'           => $this->rc_number,
            'industry'            => $this->industry,
            'address'             => $this->address,
            'city'                => $this->city,
            'state'               => $this->state,
            'email'               => $this->email,
            'phone'               => $this->phone,
            'logo_path'           => $this->logo_path,
            'status'              => $this->status?->value,
            'status_label'        => $this->status?->label(),
            'status_color'        => $this->status?->color(),
            'contract_start_date' => $this->contract_start_date?->format('Y-m-d'),
            'contract_end_date'   => $this->contract_end_date?->format('Y-m-d'),
            'days_until_renewal'  => $this->daysUntilRenewal(),
            'is_contract_expired' => $this->isContractExpired(),
            'total_employees'     => $this->total_employees,
            'notes'               => $this->notes,
            'created_at'          => $this->created_at?->toISOString(),
            'updated_at'          => $this->updated_at?->toISOString(),

            // Conditionally loaded relationships
            'branch'          => $this->whenLoaded('branch', fn () => [
                'id'   => $this->branch->id,
                'name' => $this->branch->name,
                'code' => $this->branch->code,
            ]),
            'contacts'        => $this->whenLoaded('contacts'),
            'plans'           => $this->whenLoaded('activePlans'),
            'recent_invoices' => $this->whenLoaded('invoices'),

            // Counts (loaded via withCount)
            'enrollees_count'        => $this->whenNotNull($this->enrollees_count),
            'active_enrollees_count' => $this->whenNotNull($this->active_enrollees_count),
            'plans_count'            => $this->whenNotNull($this->plans_count),
        ];
    }
}