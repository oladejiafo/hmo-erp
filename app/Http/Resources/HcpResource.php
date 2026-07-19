<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HcpResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'code'              => $this->code,
            'type'              => $this->type instanceof \BackedEnum ? $this->type->value : $this->type,
            'status'       => $this->status->value,
            'status_label' => ucfirst($this->status->value),
            'status_color' => match($this->status->value) {
                'active'      => 'success',
                'pending'     => 'warning',
                'suspended'   => 'secondary',
                'blacklisted' => 'danger',
                default       => 'secondary',
            },

            // Contact
            'email'             => $this->email,
            'phone'             => $this->phone,
            'address'           => $this->address,
            'state'             => $this->state,
            'lga'               => $this->lga,

            // Raw FKs - needed for edit form selects
            'branch_id'         => $this->branch_id,
            'branch'            => $this->whenLoaded('branch', fn () => [
                'id'   => $this->branch->id,
                'name' => $this->branch->name,
            ]),

            // Payment
            'payment_model'     => $this->payment_model,
            'account_number'    => $this->account_number,
            'bank_name'         => $this->bank_name,

            // Accreditation
            'accreditation_date'    => $this->accreditation_date,
            'accreditation_expiry'  => $this->accreditation_expiry,
            'blacklist_reason'      => $this->blacklist_reason,
            'suspension_reason'     => $this->suspension_reason,

            // Relations
            'active_contract'   => $this->whenLoaded('activeContract'),
            'capitation_rates'  => $this->whenLoaded('capitationRates'),

            // Timestamps
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}