<?php

namespace App\Http\Requests\Branch;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isHQ() && $this->user()->hasPermissionTo('branches.edit');
    }

    public function rules(): array
    {
        return [
            'name'    => ['sometimes', 'string', 'max:100'],
            'code'    => ['sometimes', 'string', 'max:20', 'uppercase',
                          Rule::unique('branches', 'code')->ignore($this->branch)],
            'state'   => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:20'],
            'email'   => ['nullable', 'email', 'max:150'],
            // type and HQ status cannot be changed after creation
        ];
    }
}