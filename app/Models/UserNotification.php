<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Models/UserNotification.php
 *
 * In-app notification for HMO staff.
 * Created by NotificationService — never directly by controllers.
 *
 * @property int         $id
 * @property int         $user_id
 * @property int|null    $branch_id
 * @property string      $type
 * @property string      $severity     info | warning | critical
 * @property string      $title
 * @property string      $body
 * @property string|null $action_url
 * @property string|null $notifiable_type
 * @property int|null    $notifiable_id
 * @property Carbon|null $read_at
 * @property Carbon      $created_at
 */
class UserNotification extends Model
{
    protected $table = 'user_notifications';

    // No updated_at — notifications are immutable once created
    public $timestamps   = true;
    const UPDATED_AT     = null;

    protected $fillable = [
        'user_id', 'branch_id',
        'type', 'severity',
        'title', 'body',
        'action_url',
        'notifiable_type', 'notifiable_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeUnread(Builder $q): Builder
    {
        return $q->whereNull('read_at');
    }

    public function scopeForUser(Builder $q, int $userId): Builder
    {
        return $q->where('user_id', $userId);
    }

    public function scopeBySeverity(Builder $q, string $severity): Builder
    {
        return $q->where('severity', $severity);
    }

    public function scopeByType(Builder $q, string $type): Builder
    {
        return $q->where('type', $type);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function markRead(): void
    {
        if (! $this->read_at) {
            $this->update(['read_at' => now()]);
        }
    }
}