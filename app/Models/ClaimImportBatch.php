<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClaimImportBatch extends Model
{
    protected $fillable = [
        'hcp_id','uploaded_by','reviewed_by','batch_number','original_filename',
        'file_path','file_type','claim_period','column_mapping','total_rows',
        'valid_rows','error_rows','duplicate_rows','pushed_rows','status',
        'total_amount_submitted','total_amount_valid','notes','reviewed_at',
    ];
    protected $casts = [
        'column_mapping'=>'array','total_amount_submitted'=>'decimal:2',
        'total_amount_valid'=>'decimal:2','reviewed_at'=>'datetime',
    ];
    public function hcp(): BelongsTo        { return $this->belongsTo(HealthCareProvider::class,'hcp_id'); }
    public function uploadedBy(): BelongsTo  { return $this->belongsTo(User::class,'uploaded_by'); }
    public function reviewedBy(): BelongsTo  { return $this->belongsTo(User::class,'reviewed_by'); }
    public function rows(): HasMany          { return $this->hasMany(ClaimImportRow::class,'import_batch_id'); }
    public function approvedRows(): HasMany  { return $this->rows()->where('status','approved'); }
    public function errorRows(): HasMany     { return $this->rows()->where('status','error'); }

    public static function generateBatchNumber(): string
    {
        $seq = str_pad(static::whereYear('created_at',now()->year)->count()+1,6,'0',STR_PAD_LEFT);
        return 'IMP-'.now()->format('Y').'-'.$seq;
    }
    public function recalcCounts(): void
    {
        $this->update([
            'total_rows'         => $this->rows()->count(),
            'valid_rows'         => $this->rows()->whereIn('status',['valid','approved'])->count(),
            'error_rows'         => $this->rows()->where('status','error')->count(),
            'duplicate_rows'     => $this->rows()->where('status','duplicate')->count(),
            'pushed_rows'        => $this->rows()->where('status','pushed')->count(),
            'total_amount_valid' => $this->rows()->whereIn('status',['valid','approved'])->sum('amount_submitted'),
        ]);
    }
}