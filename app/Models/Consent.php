<?php
/**
 * FILE: app/Models/Consent.php
 */
namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consent extends Model
{
    use HasAuditLog;

    public const PURPOSES = [
        'data_processing'       => 'Processing my health and enrollment data to provide HMO services',
        'marketing'              => 'Receiving marketing communications and promotional offers',
        'employer_data_sharing'  => "Sharing administrative enrollment data with my employer/sponsor",
        'research_analytics'     => 'Using anonymized data for research and service improvement',
    ];

    protected $fillable = [
        'branch_id', 'enrollee_id', 'purpose', 'granted', 'version',
        'decided_at', 'ip_address', 'user_agent',
    ];

    protected $casts = [
        'granted'    => 'boolean',
        'decided_at' => 'datetime',
    ];

    public function enrollee(): BelongsTo
    {
        return $this->belongsTo(Enrollee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
