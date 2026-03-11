<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $table = 'audit_logs';
    public $timestamps = true;
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',

        'branch_id',       
        'action',           
        'model_type',    
        'model_id',         

        'description', 
        
        'event',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'url',
        'ip_address',
        'user_agent',
        'tags',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function branch() {
        return $this->belongsTo(Branch::class);
    }
    public function auditable()
    {
        return $this->morphTo();
    }
}