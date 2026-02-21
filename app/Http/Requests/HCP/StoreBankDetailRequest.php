<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBankDetailRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Or add permission check: return $this->user()->can('manage hcps');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'bank_name'      => ['required', 'string', 'max:255'],
            'account_name'   => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:20', 'regex:/^[0-9]+$/'],
            'bank_code'      => ['required', 'string', 'max:20'],
            'account_type'   => ['nullable', 'string', Rule::in(['current', 'savings', 'domiciliary'])],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'account_number.regex' => 'Account number must contain only digits.',
        ];
    }
}