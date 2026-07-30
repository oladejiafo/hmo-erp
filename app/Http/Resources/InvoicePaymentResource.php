<?php
/**
 * FILE: app/Http/Resources/InvoicePaymentResource.php
 */
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoicePaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tx_ref' => $this->tx_ref,
            'gateway_reference' => $this->gateway_reference,
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'paid_at' => $this->paid_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
