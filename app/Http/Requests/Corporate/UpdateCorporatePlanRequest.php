<?php

namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCorporatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('corporates.edit');
    }

    public function rules(): array
    {
        return [
            'plan_name'         => ['sometimes', 'string', 'max:100'],
            'annual_premium'    => ['sometimes', 'numeric', 'min:0'],
            'max_benefit_value' => ['sometimes', 'numeric', 'min:0'],
            'max_dependents'    => ['nullable', 'integer', 'min:0', 'max:10'],
            'covered_services'  => ['nullable', 'array'],
            'covered_services.*'=> ['string'],
            'effective_to'      => ['sometimes', 'date'],
            'status'            => ['sometimes', Rule::in(['active', 'expired', 'suspended'])],
        ];
    }
}