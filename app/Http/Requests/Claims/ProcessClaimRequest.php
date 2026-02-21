<?php

namespace App\Http\Requests\Claims;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProcessClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('claims.process');
    }

    public function rules(): array
    {
        return [
            'notes'                      => ['nullable', 'string', 'max:1000'],
            'items'                      => ['required', 'array', 'min:1'],
            'items.*.id'                 => ['required', 'exists:claim_items,id'],
            'items.*.amount_approved'    => ['required', 'numeric', 'min:0'],
            'items.*.status'             => ['required', Rule::in(['approved', 'adjusted', 'rejected'])],
            'items.*.adjustment_reason'  => ['nullable', 'required_if:items.*.status,adjusted', 'string'],
        ];
    }
}