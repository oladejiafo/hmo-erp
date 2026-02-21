<?php

namespace App\Http\Requests\Enrollee;

use Illuminate\Foundation\Http\FormRequest;

class TransferEnrolleeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('enrollees.transfer');
    }

    public function rules(): array
    {
        return [
            'to_branch_id' => ['required', 'exists:branches,id'],
            'reason'       => ['required', 'string', 'min:10', 'max:500'],
        ];
    }
}