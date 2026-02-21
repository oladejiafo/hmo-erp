<?php

namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCorporateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('corporates.create');
    }

    public function rules(): array
    {
        return [
            'name'                => ['required', 'string', 'max:150'],
            'code'                => ['nullable', 'string', 'max:30', 'unique:corporates,code'],
            'rc_number'           => ['nullable', 'string', 'max:50'],
            'industry'            => ['nullable', 'string', 'max:80'],
            'address'             => ['nullable', 'string'],
            'city'                => ['nullable', 'string', 'max:80'],
            'state'               => ['nullable', 'string', 'max:50'],
            'email'               => ['nullable', 'email', 'max:150'],
            'phone'               => ['nullable', 'string', 'max:20'],
            'contract_start_date' => ['required', 'date'],
            'contract_end_date'   => ['required', 'date', 'after:contract_start_date'],
            'total_employees'     => ['nullable', 'integer', 'min:1'],
            'notes'               => ['nullable', 'string'],

            // Contacts (optional on creation)
            'contacts'            => ['nullable', 'array'],
            'contacts.*.name'     => ['required', 'string', 'max:100'],
            'contacts.*.title'    => ['nullable', 'string', 'max:80'],
            'contacts.*.email'    => ['nullable', 'email'],
            'contacts.*.phone'    => ['nullable', 'string', 'max:20'],
            'contacts.*.type'     => ['required', Rule::in(['primary', 'billing', 'hr', 'technical'])],
        ];
    }
}