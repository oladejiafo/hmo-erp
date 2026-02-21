<?php

namespace App\Http\Requests\Enrollee;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEnrolleeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('enrollees.edit');
    }

    public function rules(): array
    {
        return [
            'first_name'         => ['sometimes', 'string', 'max:80'],
            'last_name'          => ['sometimes', 'string', 'max:80'],
            'middle_name'        => ['nullable', 'string', 'max:80'],
            'phone'              => ['nullable', 'string', 'max:20'],
            'email'              => ['nullable', 'email', 'max:150'],
            'address'            => ['nullable', 'string'],
            'state_of_residence' => ['nullable', 'string', 'max:50'],
            'lga'                => ['nullable', 'string', 'max:80'],
            'nin'                => ['nullable', 'string', 'max:20'],
            'staff_id'           => ['nullable', 'string', 'max:50'],
            'primary_hcp_id'     => ['nullable', 'exists:health_care_providers,id'],
            'plan_id'            => ['nullable', 'exists:corporate_plans,id'],
            'expiry_date'        => ['nullable', 'date', 'after:today'],
            'benefit_balance'    => ['nullable', 'numeric', 'min:0'],
        ];
    }
}