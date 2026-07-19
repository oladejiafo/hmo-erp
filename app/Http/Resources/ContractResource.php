<?php

/**
 * FILE LOCATION: app/Http/Resources/ContractResource.php
 * NAMESPACE:     App\Http\Resources
 *
 * Transforms an HcpContract model into a JSON response array.
 *
 * RETURNED BY:
 *   GET  /api/v1/hcps/{hcp}/contracts          → index()
 *   POST /api/v1/hcps/{hcp}/contracts          → store()
 *   GET  /api/v1/hcps/{hcp}/contracts/{id}     → show()
 *   Also embedded in HcpResource as active_contract (whenLoaded)
 *
 * RELATED:
 *   Model      → app/Models/HcpContract.php
 *   Controller → app/Http/Controllers/HCP/ContractController.php
 *
 * PAYMENT MODELS:
 *   fee_for_service → each claim item paid against tariff
 *   capitation      → monthly fixed payment per enrolled member
 *   hybrid          → combination of the above
 *
 * COMPUTED FIELDS:
 *   days_remaining  → calendar days until end_date (0 if expired)
 *   is_expiring_soon → true if ends within 30 days
 *   has_document    → true if a signed PDF was uploaded
 */

namespace App\Http\Resources;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'contract_number'  => $this->contract_number,

            // Payment terms
            'payment_model'    => $this->payment_model,
            'capitation_rate'  => $this->capitation_rate,
            'terms_summary'    => $this->terms_summary,

            // Status
            'status'           => $this->status,
            'is_active'        => $this->status === 'active',

            // Dates
            'start_date'       => $this->start_date?->format('Y-m-d'),
            'end_date'         => $this->end_date?->format('Y-m-d'),
            'signed_at'        => $this->signed_at?->format('Y-m-d'),
            'days_remaining'   => $this->end_date
                ? max(0, (int) now()->diffInDays($this->end_date, false))
                : null,
            'is_expiring_soon' => $this->end_date
                && $this->end_date->isFuture()
                && $this->end_date->diffInDays(now()) <= SystemSetting::get('financial.contract_expiry_warning_days', 30),

            // Signed PDF
            'has_document'     => ! is_null($this->document_path),

            'document_url' => $this->document_path
                ? asset('storage/' . $this->document_path)
                : null,

            'created_at'       => $this->created_at?->toISOString(),

            // Who signed the contract - loaded on demand
            'signed_by'        => $this->whenLoaded('signedBy', fn () => $this->signedBy ? [
                'id'   => $this->signedBy->id,
                'name' => $this->signedBy->name,
            ] : null),

            // Parent HCP - loaded on demand
            'hcp'              => $this->whenLoaded('hcp', fn () => [
                'id'       => $this->hcp->id,
                'hcp_code' => $this->hcp->hcp_code,
                'name'     => $this->hcp->name,
            ]),
        ];
    }
}