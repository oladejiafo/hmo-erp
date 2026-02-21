<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;

class ApproveClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.approve');
    }

    public function rules(): array
    {
        return [
            'approved_amount' => ['required', 'numeric', 'min:0'],
            'note'            => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'approved_amount.required' => 'An approved amount is required.',
            'approved_amount.min'      => 'Approved amount cannot be negative.',
        ];
    }
}