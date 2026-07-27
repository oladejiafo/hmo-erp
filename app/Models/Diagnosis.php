<?php
/**
 * FILE: app/Models/Diagnosis.php
 */
namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Diagnosis extends Model
{
    use BelongsToBranch, HasAuditLog;

    protected $fillable = ['branch_id', 'encounter_id', 'icd10_code', 'type', 'notes'];

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
    }

    public function icd10(): BelongsTo
    {
        return $this->belongsTo(Icd10Code::class, 'icd10_code', 'code');
    }
}
