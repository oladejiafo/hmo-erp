<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHcpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('hcps.edit');
    }

    public function rules(): array
    {
        return [
            'name'                  => ['sometimes', 'string', 'max:150'],
            'tier'                  => ['sometimes', Rule::in(['primary', 'secondary', 'tertiary'])],
            'address'               => ['nullable', 'string'],
            'city'                  => ['nullable', 'string', 'max:80'],
            'state'                 => ['sometimes', 'string', 'max:50'],
            'lga'                   => ['nullable', 'string', 'max:80'],
            'latitude'              => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'             => ['nullable', 'numeric', 'between:-180,180'],
            'email'                 => ['nullable', 'email', 'max:150'],
            'phone'                 => ['sometimes', 'string', 'max:20'],
            'alt_phone'             => ['nullable', 'string', 'max:20'],
            'nhis_accreditation_no' => ['nullable', 'string', 'max:50'],
            'contract_expiry_date'  => ['nullable', 'date'],
            'notes'                 => ['nullable', 'string'],

            'payment_model'         => ['sometimes', 'in:capitation,fee_for_service,hybrid'],
            'ffs_tariff_enforced'   => ['sometimes', 'boolean'],
            'ffs_contract_ref'      => ['nullable', 'string', 'max:100'],
            'ffs_contract_start'    => ['nullable', 'date'],
            'ffs_contract_end'  => ['nullable', 'date', 'after_or_equal:ffs_contract_start'],
        ];
    }
}