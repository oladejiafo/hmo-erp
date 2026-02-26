<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHcpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('hcps.create');
    }

    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:150'],
            'type'                  => ['required', Rule::in(['hospital', 'clinic', 'pharmacy', 'lab', 'specialist'])],
            'tier'                  => ['required', Rule::in(['primary', 'secondary', 'tertiary'])],
            'address'               => ['nullable', 'string'],
            'city'                  => ['nullable', 'string', 'max:80'],
            'state'                 => ['required', 'string', 'max:50'],
            'lga'                   => ['nullable', 'string', 'max:80'],
            'latitude'              => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'             => ['nullable', 'numeric', 'between:-180,180'],
            'email'                 => ['nullable', 'email', 'max:150'],
            'phone'                 => ['required', 'string', 'max:20'],
            'alt_phone'             => ['nullable', 'string', 'max:20'],
            'nhis_accreditation_no' => ['nullable', 'string', 'max:50'],
            'notes'                 => ['nullable', 'string'],

            'payment_model'         => ['sometimes', 'in:capitation,fee_for_service,hybrid'],
            'ffs_tariff_enforced'   => ['sometimes', 'boolean'],
            'ffs_contract_ref'      => ['nullable', 'string', 'max:100'],
            'ffs_contract_start'    => ['nullable', 'date'],
            'ffs_contract_end'  => ['nullable', 'date', 'after_or_equal:ffs_contract_start'],
        ];
    }
}