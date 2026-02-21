<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClaimItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'tariff_id'           => $this->tariff_id,
            'service_code'        => $this->service_code,
            'service_name'        => $this->service_name,
            'category'            => $this->category,
            'quantity'            => $this->quantity,
            'unit_price_claimed'  => $this->unit_price_claimed,
            'total_price_claimed' => $this->total_price_claimed,
            'tariff_unit_price'   => $this->tariff_unit_price,
            'amount_approved'     => $this->amount_approved,
            'status'              => $this->status,
            'adjustment_reason'   => $this->adjustment_reason,
            // Flags
            'has_tariff_match'    => ! is_null($this->tariff_id),
            'price_variance'      => $this->tariff_unit_price
                ? round((($this->unit_price_claimed / $this->tariff_unit_price) - 1) * 100, 1)
                : null,
        ];
    }
}