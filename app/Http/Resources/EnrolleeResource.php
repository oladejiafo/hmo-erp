<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnrolleeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'enrollee_id'         => $this->enrollee_id,
            'full_name'           => $this->full_name,
            'first_name'          => $this->first_name,
            'last_name'           => $this->last_name,
            'middle_name'         => $this->middle_name,
            'date_of_birth'       => $this->date_of_birth?->format('Y-m-d'),
            'age'                 => $this->age,
            'gender'              => $this->gender,
            'phone'               => $this->phone,
            'email'               => $this->email,
            'address'             => $this->address,
            'state_of_residence'  => $this->state_of_residence,
            'lga'                 => $this->lga,
            'nin'                 => $this->nin,
            'staff_id'            => $this->staff_id,
            'photo_path'          => $this->photo_path,
            'status'              => $this->status?->value,
            'status_label'        => $this->status?->label(),
            'status_color'        => $this->status?->color(),
            'enrollment_date'     => $this->enrollment_date?->format('Y-m-d'),
            'expiry_date'         => $this->expiry_date?->format('Y-m-d'),
            'is_expired'          => $this->isPlanExpired(),
            'can_make_claim'      => $this->canMakeClaim(),
            'benefit_balance'     => $this->benefit_balance,
            'created_at'          => $this->created_at?->toISOString(),

            'branch'      => $this->whenLoaded('branch', fn () => [
                'id'   => $this->branch->id,
                'name' => $this->branch->name,
                'code' => $this->branch->code,
            ]),
            'corporate'   => $this->whenLoaded('corporate', fn () => [
                'id'   => $this->corporate->id,
                'name' => $this->corporate->name,
                'code' => $this->corporate->code,
            ]),
            'plan'        => $this->whenLoaded('plan', fn () => $this->plan ? [
                'id'               => $this->plan->id,
                'plan_name'        => $this->plan->plan_name,
                'plan_code'        => $this->plan->plan_code,
                'max_benefit_value' => $this->plan->max_benefit_value,
            ] : null),
            'primary_hcp' => $this->whenLoaded('primaryHcp', fn () => $this->primaryHcp ? [
                'id'    => $this->primaryHcp->id,
                'name'  => $this->primaryHcp->name,
                'type'  => $this->primaryHcp->type?->value,
                'phone' => $this->primaryHcp->phone,
            ] : null),
            'dependents'  => $this->whenLoaded('activeDependents'),
            'active_card' => $this->whenLoaded('activeCard', fn () =>
                $this->activeCard ? new EnrolleeCardResource($this->activeCard) : null
            ),
        ];
    }
}