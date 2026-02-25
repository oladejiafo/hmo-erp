<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * FILE LOCATION: app/Models/ComplianceDocument.php
 */
class ComplianceDocument extends Model
{
    public $timestamps  = false;
    const CREATED_AT    = 'created_at';

    protected $fillable = [
        'filing_id', 'doc_name', 'file_path',
        'mime_type', 'file_size', 'uploaded_by',
    ];

    protected $casts = [
        'file_size'  => 'integer',
        'created_at' => 'datetime',
    ];

    public function filing(): BelongsTo
    {
        return $this->belongsTo(ComplianceFiling::class, 'filing_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}