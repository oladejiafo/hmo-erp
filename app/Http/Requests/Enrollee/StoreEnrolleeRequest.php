<?php

namespace App\Http\Requests\Enrollee;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEnrolleeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('enrollees.create');
    }

    public function rules(): array
    {
        return [
            'corporate_id'       => ['required', 'exists:corporates,id'],
            'plan_id'            => ['nullable', 'exists:corporate_plans,id'],
            'first_name'         => ['required', 'string', 'max:80'],
            'last_name'          => ['required', 'string', 'max:80'],
            'middle_name'        => ['nullable', 'string', 'max:80'],
            'date_of_birth'      => ['required', 'date', 'before:today'],
            'gender'             => ['required', Rule::in(['M', 'F'])],
            'phone'              => ['nullable', 'string', 'max:20'],
            'email'              => ['nullable', 'email', 'max:150'],
            'address'            => ['nullable', 'string'],
            'state_of_residence' => ['nullable', 'string', 'max:50'],
            'lga'                => ['nullable', 'string', 'max:80'],
            'nin'                => ['nullable', 'string', 'max:20'],
            'staff_id'           => ['nullable', 'string', 'max:50'],
            'primary_hcp_id'     => ['nullable', 'exists:health_care_providers,id'],
            'enrollment_date'    => ['required', 'date'],
            'expiry_date'        => ['required', 'date', 'after:enrollment_date'],
            'benefit_balance'    => ['nullable', 'numeric', 'min:0'],
        ];
    }
}