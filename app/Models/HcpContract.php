<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class HcpContract extends Model
{
    use HasFactory;

    protected $fillable = [
        'hcp_id',
        'contract_number',
        'start_date',
        'end_date',
        'payment_model',
        'capitation_rate',
        'terms_summary',
        'special_terms',
        'status',
        'document_path',
        'submitted_at',
        'approved_by',
        'approved_at',
        'created_by',
        'terminated_at',
        'termination_reason',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'terminated_at' => 'datetime',
    ];

    /**
     * Get the HCP that owns the contract.
     */
    public function hcp()
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    /**
     * Get the user who approved the contract.
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the user who created the contract.
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope for active contracts.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('start_date', '<=', now())
            ->where(function($q) {
                $q->where('end_date', '>=', now())
                  ->orWhereNull('end_date');
            });
    }
}