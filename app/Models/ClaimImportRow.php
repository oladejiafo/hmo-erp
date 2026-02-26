<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClaimImportRow extends Model
{
    protected $fillable = [
        'import_batch_id','enrollee_id','claim_id','row_number','raw_data',
        'enrollee_id_raw','enrollee_name_raw','diagnosis_code','diagnosis_description',
        'service_type','service_date','discharge_date','amount_submitted',
        'hcp_invoice_ref','notes','status','validation_errors','staff_override','override_reason',
    ];
    protected $casts = [
        'raw_data'=>'array','validation_errors'=>'array','amount_submitted'=>'decimal:2',
        'service_date'=>'date','discharge_date'=>'date','staff_override'=>'boolean',
    ];
    public function batch(): BelongsTo    { return $this->belongsTo(ClaimImportBatch::class,'import_batch_id'); }
    public function enrollee(): BelongsTo { return $this->belongsTo(Enrollee::class); }
    public function claim(): BelongsTo    { return $this->belongsTo(Claim::class); }
    public function hasErrors(): bool     { return !empty($this->validation_errors); }
    public function isActionable(): bool  { return in_array($this->status,['valid','error','duplicate']); }
}