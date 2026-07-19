<?php
/**
 * PATCH NOTE: your real app/Models/User.php (113 lines, verified from repo)
 * plus two additions for Provider Portal, marked [PHASE 2]. Everything else
 * is byte-for-byte your original.
 */

namespace App\Models;

use App\Traits\HasAuditLog;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

use OwenIt\Auditing\Auditable;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;

class User extends Authenticatable implements AuditableContract
{
    use Auditable;
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasAuditLog, HasRoles;

    protected $fillable = [
        'branch_id',
        'name',
        'email',
        'phone',
        'password',
        'two_factor_secret',
        'two_factor_enabled',
        'status',
        'last_login_at',
        'last_login_ip',
        'password_changed_at',
        'user_type',
        'corporate_id',
        'enrollee_id',
        'hcp_id', // [PHASE 2]
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
    ];

    protected $casts = [
        'password'           => 'hashed',
        'two_factor_enabled' => 'boolean',
        'last_login_at'      => 'datetime',
        'password_changed_at' => 'datetime', 
    ];

    
    // ─── Relationships ────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function branchRoles(): HasMany
    {
        return $this->hasMany(UserBranchRole::class);
    }

    public function corporate()
    {
        return $this->belongsTo(Corporate::class, 'corporate_id');
    }

    public function enrollee()
    {
        return $this->belongsTo(Enrollee::class, 'enrollee_id');
    }

    // [PHASE 2]
    public function hcp(): BelongsTo
    {
        return $this->belongsTo(HealthCareProvider::class, 'hcp_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isHQ(): bool
    {
        $this->loadMissing('branch');
        return $this->branch && $this->branch->type === 'HQ';
    }

    public function recordLogin(string $ip): void
    {
        // updateQuietly skips model events - we don't want a login to create an audit log entry
        $this->updateQuietly([
            'last_login_at' => now(),
            'last_login_ip' => $ip,
        ]);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    // [PHASE 2]
    public function isProviderUser(): bool
    {
        return $this->user_type === 'hcp_user';
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }
}
