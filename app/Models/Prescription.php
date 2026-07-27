<?php
/**
 * FILE: app/Models/Prescription.php
 */
namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prescription extends Model
{
    use BelongsToBranch, HasAuditLog;

    protected $fillable = [
        'branch_id', 'encounter_id', 'enrollee_id',
        'drug_name', 'dosage', 'frequency', 'duration', 'instructions',
        'status', 'issued_by', 'issued_at',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
    ];

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