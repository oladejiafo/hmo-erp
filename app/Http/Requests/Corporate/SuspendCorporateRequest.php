<?php

namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;

class SuspendCorporateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('corporates.suspend');
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'A reason is required when suspending or reactivating a corporate.',
            'reason.min'      => 'Please provide a detailed reason of at least 10 characters.',
        ];
    }
}