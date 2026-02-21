<?php

namespace App\Http\Requests\Enrollee;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDependentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('enrollees.edit');
    }

    public function rules(): array
    {
        return [
            'first_name'   => ['sometimes', 'string', 'max:80'],
            'last_name'    => ['sometimes', 'string', 'max:80'],
            'middle_name'  => ['nullable', 'string', 'max:80'],
            'phone'        => ['nullable', 'string', 'max:20'],
            'relationship' => ['sometimes', Rule::in(['spouse', 'child', 'parent', 'sibling'])],
            'status'       => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}