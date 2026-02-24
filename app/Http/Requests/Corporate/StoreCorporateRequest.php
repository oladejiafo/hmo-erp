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

            // ✅ Fixed: Use 'sometimes' instead of 'required_with' for better UX
            'primary_contact_name' => ['sometimes', 'required_with:primary_contact_email', 'string', 'max:255'],
            'primary_contact_email' => ['sometimes', 'required_with:primary_contact_name', 'email', 'unique:users,email'],
            
            // Contacts (optional on creation)
            'contacts'            => ['nullable', 'array'],
            'contacts.*.name'     => ['required_with:contacts', 'string', 'max:100'],
            'contacts.*.title'    => ['nullable', 'string', 'max:80'],
            'contacts.*.email'    => ['nullable', 'email', 'unique:users,email'], // Optional: also check uniqueness
            'contacts.*.phone'    => ['nullable', 'string', 'max:20'],
            'contacts.*.type'     => ['required_with:contacts', Rule::in(['primary', 'billing', 'hr', 'technical'])],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'primary_contact_email.unique' => 'This email is already registered. Please use a different email or contact support.',
            'contacts.*.email.unique' => 'One of the contact emails is already registered.',
        ];
    }
}