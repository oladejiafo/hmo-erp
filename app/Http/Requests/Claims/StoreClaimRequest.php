<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.submit');
    }

    public function rules(): array
    {
        return [
            'hcp_id'               => ['required', 'exists:health_care_providers,id'],
            'enrollee_id'          => ['required', 'exists:enrollees,id'],
            'dependent_id'         => ['nullable', 'exists:dependents,id'],
            'service_date'         => ['required', 'date', 'before_or_equal:today'],
            'admission_date'       => ['nullable', 'date'],
            'discharge_date'       => ['nullable', 'date', 'after_or_equal:admission_date'],
            'claim_type'           => ['required', Rule::in([
                'outpatient', 'inpatient', 'dental', 'optical', 'maternity',
                'emergency', 'surgery', 'laboratory', 'radiology', 'drug_refill',
            ])],
            'diagnosis_codes'      => ['nullable', 'array'],
            'diagnosis_codes.*'    => ['string', 'max:20'],
            'diagnosis_description' => ['nullable', 'string', 'max:500'],
            'is_pre_authorized'    => ['nullable', 'boolean'],
            'pre_auth_code'        => ['nullable', 'required_if:is_pre_authorized,true', 'string', 'max:50'],

            // Claim items - at least one required
            'items'                    => ['required', 'array', 'min:1'],
            'items.*.service_code'     => ['nullable', 'string', 'max:30'],
            'items.*.service_name'     => ['required', 'string', 'max:200'],
            'items.*.category'         => ['nullable', Rule::in([
                'consultation', 'procedure', 'laboratory', 'radiology',
                'drug', 'surgery', 'dental', 'optical', 'physiotherapy',
                'maternity', 'emergency',
            ])],
            'items.*.quantity'         => ['nullable', 'integer', 'min:1', 'max:9999'],
            'items.*.unit_price'       => ['required', 'numeric', 'min:0'],
        ];
    }
}