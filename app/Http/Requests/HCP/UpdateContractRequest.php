<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'payment_model' => ['sometimes', 'string', 'in:capitation,ffs,hybrid'],
            'capitation_rate' => ['required_if:payment_model,capitation,hybrid', 'nullable', 'numeric', 'min:0'],
            'ffs_discount_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'terms_summary' => ['sometimes', 'string'],
            'special_terms' => ['nullable', 'string'],
        ];
    }
}