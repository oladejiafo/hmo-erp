<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'display_name' => $this->getDisplayName(),
            'group' => $this->getGroup(),
            'guard_name' => $this->guard_name,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    protected function getDisplayName(): string
    {
        $parts = explode('.', $this->name);
        $action = end($parts);
        
        return match($action) {
            'view' => 'View',
            'create' => 'Create',
            'edit' => 'Edit',
            'delete' => 'Delete',
            'approve' => 'Approve',
            'reject' => 'Reject',
            'submit' => 'Submit',
            'process' => 'Process',
            'assign' => 'Assign',
            'reverse' => 'Reverse',
            'suspend' => 'Suspend',
            'transfer' => 'Transfer',
            'accredit' => 'Accredit',
            'blacklist' => 'Blacklist',
            'manage' => 'Manage',
            'export' => 'Export',
            'import' => 'Import',
            default => ucfirst(str_replace('_', ' ', $action)),
        } . ' ' . ucfirst(str_replace('_', ' ', $parts[0] ?? ''));
    }

    protected function getGroup(): string
    {
        $parts = explode('.', $this->name);
        return $parts[0] ?? 'other';
    }
}