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
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'premium_amount' => (float) $this->premium_amount,
            'max_benefit' => (float) $this->max_benefit,
            'max_dependents' => $this->max_dependents,
            'coverage_type' => $this->coverage_type,
            'coverage_type_label' => $this->getCoverageTypeLabel(),
            'covered_services' => $this->covered_services ?? [],
            'exclusions' => $this->exclusions ?? [],
            'waiting_period_days' => $this->waiting_period_days,
            'is_active' => (bool) $this->is_active,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'enrollees_count' => $this->whenCounted('enrollees'),
            'active_enrollees_count' => $this->enrollees()
                ->where('status', 'active')
                ->count(),
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