<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Plan;

class CorporatePlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'corporate_id',
        'plan_name',
        'plan_code',
        'annual_premium',
        'max_benefit_value',
        'employee_count',
        'max_dependents',
        'covered_services',
        'status',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'covered_services' => 'array',
        'effective_from' => 'date',
        'effective_to' => 'date',
        'annual_premium' => 'decimal:2',
        'max_benefit_value' => 'decimal:2',
    ];

    public function corporate()
    {
        return $this->belongsTo(Corporate::class);
    }

    public function enrollees()
    {
        return $this->hasMany(Enrollee::class, 'plan_id');
    }
}