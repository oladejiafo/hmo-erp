<?php
// app/Models/Tariff.php

namespace App\Models;
use App\Traits\HasAuditLog; 

use Illuminate\Database\Eloquent\Model;

class Tariff extends Model
{
    use HasAuditLog;

    protected $fillable = [
        'procedure_code',
        'description',
        'amount',
        'tolerance',
        'effective_from',
        'effective_to',
        'category'
    ];

    protected $casts = [
        'effective_from' => 'date',
        'effective_to' => 'date',
        'amount' => 'decimal:2'
    ];
}