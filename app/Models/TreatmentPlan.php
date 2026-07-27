<?php
/**
 * FILE: app/Models/TreatmentPlan.php
 */
namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreatmentPlan extends Model
{
    use BelongsToBranch, HasAuditLog;

    protected $fillable = [
        'branch_id', 'encounter_id', 'plan_text', 'target_outcomes',
        'review_date', 'status', 'created_by',
    ];

    protected $casts = [
        'review_date' => 'date',
    ];

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
