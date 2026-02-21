<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DependentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'enrollee_id' => $this->enrollee_id,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'age' => $this->date_of_birth?->age,
            'gender' => $this->gender,
            'gender_label' => $this->gender === 'male' ? 'Male' : ($this->gender === 'female' ? 'Female' : 'Other'),
            'relationship' => $this->relationship,
            'relationship_label' => $this->getRelationshipLabel(),
            'blood_group' => $this->blood_group,
            'genotype' => $this->genotype,
            'status' => $this->status,
            'status_label' => $this->status === 'active' ? 'Active' : ($this->status === 'inactive' ? 'Inactive' : 'Suspended'),
            'added_by' => $this->added_by ? [
                'id' => $this->adder?->id,
                'name' => $this->adder?->name,
            ] : null,
            'added_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    protected function getRelationshipLabel(): string
    {
        return match($this->relationship) {
            'spouse' => 'Spouse',
            'child' => 'Child',
            'parent' => 'Parent',
            'sibling' => 'Sibling',
            'other' => 'Other',
            default => ucfirst($this->relationship),
        };
    }
}