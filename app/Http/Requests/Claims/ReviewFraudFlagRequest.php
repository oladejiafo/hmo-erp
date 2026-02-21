<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewFraudFlagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.fraud_review');
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                Rule::in(['confirmed', 'dismissed']),
            ],
            'reviewer_note' => [
                'required',
                'string',
                'min:10',
                'max:1000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in'            => 'Status must be either "confirmed" or "dismissed".',
            'reviewer_note.min'    => 'Please provide a detailed reviewer note of at least 10 characters.',
            'reviewer_note.required' => 'A reviewer note is required when reviewing a fraud flag.',
        ];
    }
}