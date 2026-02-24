<?php
// app/Models/Complaint.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollee_id',
        'ticket_number',
        'subject',
        'description',
        'category',
        'hcp_name',
        'status',
        'resolution_note',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function enrollee()
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}