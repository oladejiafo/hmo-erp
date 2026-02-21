<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
            ]),
            'branch' => $this->whenLoaded('branch', fn() => [
                'id' => $this->branch?->id,
                'name' => $this->branch?->name,
                'code' => $this->branch?->code,
            ]),
            'action' => $this->action,
            'action_label' => $this->getActionLabel(),
            'model_type' => $this->model_type,
            'model_name' => class_basename($this->model_type),
            'model_id' => $this->model_id,
            'description' => $this->description,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'changes' => $this->getChanges(),
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'created_at' => $this->created_at?->toISOString(),
            'created_at_human' => $this->created_at?->diffForHumans(),
        ];
    }

    protected function getActionLabel(): string
    {
        return match($this->action) {
            'created' => 'Created',
            'updated' => 'Updated',
            'deleted' => 'Deleted',
            'restored' => 'Restored',
            'login' => 'Login',
            'logout' => 'Logout',
            'failed_login' => 'Failed Login',
            'export' => 'Export',
            'import' => 'Import',
            default => ucfirst($this->action),
        };
    }

    protected function getChanges(): array
    {
        if (!$this->old_values || !$this->new_values) {
            return [];
        }

        $changes = [];
        foreach ($this->new_values as $key => $new) {
            $old = $this->old_values[$key] ?? null;
            if ($old != $new) {
                $changes[] = [
                    'field' => $key,
                    'old' => $old,
                    'new' => $new,
                ];
            }
        }
        return $changes;
    }
}