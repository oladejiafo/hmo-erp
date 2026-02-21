<?php

namespace App\Http\Requests\Branch;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only HQ users with branch creation permission
        return $this->user()->isHQ() && $this->user()->hasPermissionTo('branches.create');
    }

    public function rules(): array
    {
        return [
            'name'    => ['required', 'string', 'max:100'],
            'code'    => ['required', 'string', 'max:20', 'uppercase', 'unique:branches,code'],
            'type'    => ['required', Rule::in(['HQ', 'STATE', 'REGIONAL'])],
            'state'   => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:20'],
            'email'   => ['nullable', 'email', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'This branch code is already in use. Each branch must have a unique code (e.g. ABJ, LAG, KAN).',
        ];
    }
}