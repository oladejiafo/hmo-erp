<?php

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

class User extends Authenticatable
{
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
        // updateQuietly skips model events — we don't want a login to create an audit log entry
        $this->updateQuietly([
            'last_login_at' => now(),
            'last_login_ip' => $ip,
        ]);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
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