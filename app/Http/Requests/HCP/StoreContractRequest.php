<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;

class StoreContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'payment_model' => ['required', 'string', 'in:capitation,ffs,hybrid'],
            'capitation_rate' => ['required_if:payment_model,capitation,hybrid', 'nullable', 'numeric', 'min:0'],
            'ffs_discount_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'terms_summary' => ['required', 'string'],
            'special_terms' => ['nullable', 'string'],
            'document' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'capitation_rate.required_if' => 'Capitation rate is required for capitation/hybrid models',
            'document.max' => 'Document size must not exceed 5MB',
        ];
    }
}