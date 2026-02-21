<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'branch' => $this->whenLoaded('branch', fn() => [
                'id' => $this->branch?->id,
                'name' => $this->branch?->name,
                'code' => $this->branch?->code,
            ]),
            'branch_id' => $this->branch_id,
            'branch_name' => $this->branch?->name,
            'roles' => RoleResource::collection($this->whenLoaded('roles')),
            'role_names' => $this->getRoleNames(),
            'permissions' => $this->getAllPermissions()->pluck('name'),
            'two_factor_enabled' => (bool) $this->two_factor_enabled,
            'status' => $this->status,
            'status_label' => $this->status === 'active' ? 'Active' : ($this->status === 'inactive' ? 'Inactive' : 'Suspended'),
            'last_login_at' => $this->last_login_at?->toISOString(),
            'last_login_ip' => $this->last_login_ip,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}