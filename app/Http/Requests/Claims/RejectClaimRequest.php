<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RejectClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.reject');
    }

    public function rules(): array
    {
        return [
            'reason' => [
                'required',
                'string',
                'min:10',
                'max:1000',
            ],
            'rejection_code' => [
                'nullable',
                Rule::in([
                    'not_covered',
                    'pre_auth_required',
                    'duplicate_claim',
                    'insufficient_documentation',
                    'enrollee_not_eligible',
                    'hcp_not_accredited',
                    'exceeds_benefit_limit',
                    'fraud_suspected',
                    'other',
                ]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.min'     => 'Rejection reason must be at least 10 characters. Please provide a clear explanation.',
            'reason.required'=> 'A rejection reason is required. This will be recorded in the claim history.',
        ];
    }
}