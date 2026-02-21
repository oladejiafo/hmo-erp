<?php

namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;

class MarkInvoicePaidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('corporates.invoices');
    }

    public function rules(): array
    {
        return [
            'payment_reference' => ['required', 'string', 'max:100'],
            'payment_date'      => ['nullable', 'date'],
            'payment_method'    => ['nullable', 'in:bank_transfer,cheque,cash,direct_debit'],
            'notes'             => ['nullable', 'string', 'max:500'],
        ];
    }
}