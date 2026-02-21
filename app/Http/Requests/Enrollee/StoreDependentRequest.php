<?php

namespace App\Http\Requests\Enrollee;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDependentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('enrollees.edit');
    }

    public function rules(): array
    {
        return [
            'first_name'    => ['required', 'string', 'max:80'],
            'last_name'     => ['required', 'string', 'max:80'],
            'middle_name'   => ['nullable', 'string', 'max:80'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'gender'        => ['required', Rule::in(['M', 'F'])],
            'relationship'  => ['required', Rule::in(['spouse', 'child', 'parent', 'sibling'])],
            'phone'         => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_of_birth.before' => 'Date of birth must be in the past.',
            'relationship.in'      => 'Relationship must be: spouse, child, parent, or sibling.',
        ];
    }
}