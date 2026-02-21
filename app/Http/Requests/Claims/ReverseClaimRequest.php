<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;

class ReverseClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.reverse');
    }

    public function rules(): array
    {
        return [
            'reason' => [
                'required',
                'string',
                'min:20',
                'max:1000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'A reversal reason is mandatory. This is a permanent financial action.',
            'reason.min'      => 'Reversal reason must be at least 20 characters. Reversals require thorough documentation.',
        ];
    }
}