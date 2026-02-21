<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class EnrolleeCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'card_number'        => $this->card_number,
            'qr_code_data'       => $this->qr_code_data,
            'qr_image_url' => $this->qr_image_path 
                ? asset('storage/' . $this->qr_image_path)
                : null,
            'status'             => $this->status,
            'issued_at'          => $this->issued_at,
            'expires_at'         => $this->expires_at,
            'replacement_reason' => $this->replacement_reason,
        ];
    }
}