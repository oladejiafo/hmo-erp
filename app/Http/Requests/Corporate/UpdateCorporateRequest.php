<?php

namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCorporateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('corporates.edit');
    }

    public function rules(): array
    {
        return [
            'name'                => ['sometimes', 'string', 'max:150'],
            'code'                => ['sometimes', 'string', 'max:30',
                                      Rule::unique('corporates', 'code')->ignore($this->corporate)],
            'rc_number'           => ['nullable', 'string', 'max:50'],
            'industry'            => ['nullable', 'string', 'max:80'],
            'address'             => ['nullable', 'string'],
            'city'                => ['nullable', 'string', 'max:80'],
            'state'               => ['nullable', 'string', 'max:50'],
            'email'               => ['nullable', 'email', 'max:150'],
            'phone'               => ['nullable', 'string', 'max:20'],
            'contract_start_date' => ['sometimes', 'date'],
            'contract_end_date'   => ['sometimes', 'date', 'after:contract_start_date'],
            'total_employees'     => ['nullable', 'integer', 'min:1'],
            'notes'               => ['nullable', 'string'],
        ];
    }
}