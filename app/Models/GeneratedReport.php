<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class GeneratedReport extends Model
{
    protected $fillable = [
        'generated_by','report_type','period','period_start','period_end',
        'hcp_id','corporate_id','payment_batch_id','format',
        'file_path_xlsx','file_path_pdf','status','error_message',
        'config','total_amount','record_count','generated_at',
    ];
    protected $casts = [
        'config'=>'array','period_start'=>'date','period_end'=>'date',
        'total_amount'=>'decimal:2','generated_at'=>'datetime',
    ];
    const TYPE_LABELS = [
        'monthly_claims_returns'=>'Monthly Claims Returns',
        'capitation_payment_schedule'=>'Capitation Payment Schedule',
        'quarterly_utilisation'=>'Quarterly Utilisation Report',
        'ffs_claims_register'=>'FFS Claims Register',
        'annual_report'=>'Annual Report',
        'ffs_remittance_advice'=>'FFS Remittance Advice',
        'corporate_cost_report'=>'Corporate Cost Report',
        'ndpa_data_processing_register'=>'NDPA Data Processing Register', // PHASE 6
        'ndpa_consent_audit'=>'NDPA Consent Audit Log', // PHASE 6
    ];
    const NHIA_REPORTS = [
        'monthly_claims_returns','capitation_payment_schedule',
        'quarterly_utilisation','ffs_claims_register','annual_report',
    ];
    const NDPA_REPORTS = [
        'ndpa_data_processing_register','ndpa_consent_audit',
    ];
    public function generatedBy(): BelongsTo  { return $this->belongsTo(User::class,'generated_by'); }
    public function hcp(): BelongsTo          { return $this->belongsTo(HealthCareProvider::class,'hcp_id'); }
    public function corporate(): BelongsTo    { return $this->belongsTo(Corporate::class); }
    public function paymentBatch(): BelongsTo { return $this->belongsTo(PaymentBatch::class); }
    public function getTypeLabelAttribute(): string { return self::TYPE_LABELS[$this->report_type] ?? ucfirst($this->report_type); }
    public function getDownloadUrlXlsxAttribute(): ?string { return $this->file_path_xlsx ? Storage::url($this->file_path_xlsx) : null; }
    public function getDownloadUrlPdfAttribute(): ?string  { return $this->file_path_pdf  ? Storage::url($this->file_path_pdf)  : null; }
    public function isNhiaReport(): bool { return in_array($this->report_type, self::NHIA_REPORTS); }
    public function isNdpaReport(): bool { return in_array($this->report_type, self::NDPA_REPORTS); } // PHASE 6
}