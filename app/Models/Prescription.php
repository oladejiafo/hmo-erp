<?php
/**
 * FILE: app/Models/Prescription.php
 *
 * FIX: dropped BelongsToBranch (silent branch-filtering global scope) -
 * same reasoning as Encounter.php. A prescription is visible by
 * enrollee_id, not by the viewing user's branch.
 */
namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prescription extends Model
{
    use HasAuditLog;

    protected $fillable = [
        'branch_id', 'encounter_id', 'enrollee_id',
        'drug_name', 'dosage', 'frequency', 'duration', 'instructions',
        'status', 'issued_by', 'issued_at',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
