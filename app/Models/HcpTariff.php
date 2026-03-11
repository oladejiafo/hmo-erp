<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HcpTariff extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'hcp_tariffs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'hcp_id',
        'service_code',
        'service_name',
        'category',
        'agreed_price',
        'nhis_price',
        'is_active',
        'effective_from',
        'effective_to',
        'uploaded_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'agreed_price' => 'decimal:2',
        'nhis_price' => 'decimal:2',
        'is_active' => 'boolean',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /**
     * Get the HCP that owns this tariff.
     */
    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    /**
     * Get the user who uploaded this tariff.
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Scope a query to only include active tariffs.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include tariffs effective at a given date.
     */
    public function scopeEffectiveAt($query, $date)
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->where('effective_to', '>=', $date)
                  ->orWhereNull('effective_to');
            });
    }

    /**
     * Scope a query to filter by category.
     */
    public function scopeOfCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Get the category label.
     */
    public function getCategoryLabelAttribute(): string
    {
        return match($this->category) {
            'consultation' => 'Consultation',
            'procedure' => 'Procedure',
            'laboratory' => 'Laboratory',
            'radiology' => 'Radiology',
            'drug' => 'Drug/Medication',
            'surgery' => 'Surgery',
            'dental' => 'Dental',
            'optical' => 'Optical',
            'physiotherapy' => 'Physiotherapy',
            'maternity' => 'Maternity',
            'emergency' => 'Emergency',
            default => ucfirst($this->category),
        };
    }
}