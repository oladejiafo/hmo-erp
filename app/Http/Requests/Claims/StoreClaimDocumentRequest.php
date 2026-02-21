<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClaimDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.submit');
    }

    public function rules(): array
    {
        return [
            'file'     => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'doc_type' => [
                'required',
                Rule::in([
                    'invoice',
                    'prescription',
                    'lab_result',
                    'discharge_summary',
                    'pre_auth_letter',
                    'referral_letter',
                    'x_ray_scan',
                    'other',
                ]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimes'    => 'Only PDF, JPG, JPEG, and PNG files are accepted.',
            'file.max'      => 'File size must not exceed 10MB.',
            'doc_type.in'   => 'Invalid document type.',
        ];
    }
}