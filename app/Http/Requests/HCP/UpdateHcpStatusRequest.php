<?php

namespace App\Http\Requests\HCP;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHcpStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Both accredit and blacklist use this request
        // Permission is enforced at the route level: hcps.accredit or hcps.blacklist
        return true;
    }

    public function rules(): array
    {
        return [
            'reason'       => ['required', 'string', 'min:10', 'max:1000'],
            'effective_date' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.min' => 'Please provide a detailed reason of at least 10 characters.',
        ];
    }
}