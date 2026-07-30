<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CorporatePlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'corporate_id' => $this->corporate_id,
            'corporate_name' => $this->corporate?->name,
            'plan_name' => $this->plan_name,
            'plan_code' => $this->plan_code,
            'annual_premium' => (float) $this->annual_premium,
            'max_benefit_value' => (float) $this->max_benefit_value,
            'employee_count' => $this->employee_count,
            'max_dependents' => $this->max_dependents,
            'covered_services' => $this->covered_services ?? [],
            'status' => $this->status,
            'is_active' => $this->status === 'active',
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    protected function getCoverageTypeLabel(): string
    {
        return match($this->coverage_type) {
            'individual' => 'Individual',
            'family' => 'Family',
            'comprehensive' => 'Comprehensive',
            default => ucfirst($this->coverage_type),
        };
    }
}