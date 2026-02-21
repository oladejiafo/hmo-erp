<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTariffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('hcps.tariffs');
    }

    public function rules(): array
    {
        return [
            'service_code'   => ['nullable', 'string', 'max:30'],
            'service_name'   => ['required', 'string', 'max:200'],
            'category'       => ['required', Rule::in([
                'consultation', 'procedure', 'laboratory', 'radiology',
                'drug', 'surgery', 'dental', 'optical', 'physiotherapy',
                'maternity', 'emergency',
            ])],
            'agreed_price'   => ['required', 'numeric', 'min:0'],
            'nhis_price'     => ['nullable', 'numeric', 'min:0'],
            'effective_from' => ['required', 'date'],
            'effective_to'   => ['nullable', 'date', 'after:effective_from'],
            'is_active'      => ['nullable', 'boolean'],
        ];
    }
}