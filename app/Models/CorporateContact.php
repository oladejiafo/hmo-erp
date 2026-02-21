<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CorporateContact extends Model
{
    protected $fillable = [
        'corporate_id', 'name', 'title', 'email', 'phone', 'type', 'is_portal_user',
    ];

    protected $casts = [
        'is_portal_user' => 'boolean',
    ];

    public function corporate(): BelongsTo
    {
        return $this->belongsTo(Corporate::class);
    }
}