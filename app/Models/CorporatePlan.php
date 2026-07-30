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

    /**
     * WARNING: this looks like a normal relationship but isn't reliable.
     * It joins Enrollee.plan_id against CorporatePlan.id, but
     * Enrollee.plan_id actually references the `plans` table (the Plan
     * model), not corporate_plans. Any enrollees this returns match by
     * coincidental numeric ID overlap, not a real relationship. Found
     * while fixing CorporatePlanResource, which used to call this -
     * that usage was removed rather than "fixed", since fixing it
     * properly means redirecting to the `plans` system this model
     * doesn't represent. Left here rather than deleted since nothing
     * else currently calls it, but don't trust its output.
     */
    public function enrollees()
    {
        return $this->hasMany(Enrollee::class, 'plan_id');
    }
}