<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Auto-write to audit_logs on every create, update, delete.
 * Apply to any model that requires audit trail (most domain models).
 * Sensitive fields (password, 2FA secrets) are automatically stripped.
 */
trait HasAuditLog
{
    protected static array $auditSensitiveFields = [
        'password',
        'two_factor_secret',
        'remember_token',
    ];

    public static function bootHasAuditLog(): void
    {
        static::created(function ($model) {
            static::writeAudit('created', $model, [], $model->getAttributes());
        });

        static::updated(function ($model) {
            $dirty = $model->getDirty();
            if (empty($dirty)) {
                return;
            }
            $original = array_intersect_key($model->getOriginal(), $dirty);
            static::writeAudit('updated', $model, $original, $dirty);
        });

        static::deleted(function ($model) {
            static::writeAudit('deleted', $model, $model->getOriginal(), []);
        });
    }

    protected static function writeAudit(
        string $action,
        $model,
        array $oldValues,
        array $newValues
    ): void {
        $sensitive = static::$auditSensitiveFields;

        $oldValues = array_diff_key($oldValues, array_flip($sensitive));
        $newValues = array_diff_key($newValues, array_flip($sensitive));

        try {
            AuditLog::create([
                'user_id'     => Auth::id(),
                'branch_id'   => Auth::user()?->branch_id,
                'action'      => $action,
                'model_type'  => get_class($model),
                'model_id'    => $model->getKey(),
                'old_values'  => empty($oldValues) ? null : $oldValues,
                'new_values'  => empty($newValues) ? null : $newValues,
                'ip_address'  => request()?->ip(),
                'user_agent'  => request()?->userAgent(),
                'description' => sprintf(
                    '%s %s %s',
                    Auth::user()?->name ?? 'System',
                    $action,
                    class_basename($model)
                ),
            ]);
        } catch (\Throwable $e) {
            // Never let audit failures break the main transaction
            Log::error('AuditLog write failed: ' . $e->getMessage());
        }
    }
}