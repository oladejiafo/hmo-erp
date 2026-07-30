<?php
/**
 * FILE: app/Http/Requests/Corporate/UpdateInvoiceStatusRequest.php
 *
 * REBUILT: previously validated payment_method/transaction_reference/
 * notes, none of which exist on corporate_invoices. This is for
 * recording an OFFLINE payment (bank transfer confirmed manually) - see
 * InvoiceService::markAsPaid().
 */
namespace App\Http\Requests\Corporate;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'paid_at' => ['nullable', 'date'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
        ];
    }
}
