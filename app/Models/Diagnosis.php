<?php
/**
 * FILE: app/Models/Diagnosis.php
 *
 * FIX: dropped BelongsToBranch (silent branch-filtering global scope) -
 * same reasoning as Encounter.php. Diagnoses are reached only through
 * their parent encounter, which is itself correctly scoped by enrollee_id.
 */
namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Diagnosis extends Model
{
    use HasAuditLog;

    protected $fillable = ['branch_id', 'encounter_id', 'icd10_code', 'type', 'notes'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    public function icd10(): BelongsTo
    {
        return $this->belongsTo(Icd10Code::class, 'icd10_code', 'code');
    }
}
