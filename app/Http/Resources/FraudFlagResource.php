<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FraudFlagResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'flag_type'     => $this->flag_type,
            'flag_score'    => $this->flag_score,
            'description'   => $this->description,
            'details'       => $this->details,
            'status'        => $this->status,
            'reviewed_at'   => $this->reviewed_at?->toISOString(),
            'reviewer_note' => $this->reviewer_note,
            'reviewed_by'   => $this->whenLoaded('reviewedBy', fn () => $this->reviewedBy ? [
                'id'   => $this->reviewedBy->id,
                'name' => $this->reviewedBy->name,
            ] : null),
            'created_at'    => $this->created_at?->toISOString(),
        ];
    }
}