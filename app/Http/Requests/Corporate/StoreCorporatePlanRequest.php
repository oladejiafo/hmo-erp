<?php

namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;

class StoreCorporatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('corporates.edit');
    }

    public function rules(): array
    {
        return [
            'plan_name'         => ['required', 'string', 'max:100'],
            'annual_premium'    => ['required', 'numeric', 'min:0'],
            'max_benefit_value' => ['required', 'numeric', 'min:0'],
            'employee_count'    => ['nullable', 'integer', 'min:0'],
            'covered_services'  => ['nullable', 'array'],
            'covered_services.*'=> ['string'],
            'max_dependents'    => ['nullable', 'integer', 'min:0', 'max:10'],
            'effective_from'    => ['required', 'date'],
            'effective_to'      => ['required', 'date', 'after:effective_from'],
        ];
    }

    public function messages(): array
    {
        return [
            'effective_to.after' => 'Plan expiry date must be after the effective start date.',
            'annual_premium.min' => 'Annual premium cannot be negative.',
            'max_benefit_value.min' => 'Maximum benefit value cannot be negative.',
        ];
    }
}