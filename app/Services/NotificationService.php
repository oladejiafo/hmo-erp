<?php

namespace App\Services;

use App\Models\UserNotification;
use App\Models\User;
use App\Models\Claim;
use App\Models\FraudFlag;
use App\Models\PreAuthorisation;
use App\Models\PaymentBatch;
use App\Models\ComplianceFiling;
use App\Models\SystemSetting; // ADD THIS USE STATEMENT
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * FILE LOCATION: app/Services/NotificationService.php
 *
 * Central factory for creating in-app notifications.
 * Every place in the codebase that needs to notify a user calls this service
 * rather than creating UserNotification directly.
 *
 * Usage from anywhere:
 *   app(NotificationService::class)->slaBreached($claim);
 *   app(NotificationService::class)->fraudFlagged($claim, $flag);
 *   app(NotificationService::class)->complianceDue($filing);
 *
 * Routing logic (who gets notified):
 *   - SLA breach     → branch_manager + claims_supervisor in that branch
 *   - Fraud flag     → claims_supervisor + hq_manager
 *   - PA pending     → users with pa.approve_* permission in branch
 *   - Batch ready    → users with finance.batch_approve
 *   - Compliance due → compliance.manage users in branch
 *   - System         → specific user IDs passed in
 */
class NotificationService
{
    // ── SLA ──────────────────────────────────────────────────────────────────

    public function slaBreached(Claim $claim): void
    {
        $recipients = $this->usersWithPermission('claims.approve', $claim->branch_id);

        foreach ($recipients as $user) {
            $this->create($user->id, $claim->branch_id, [
                'type'             => 'sla_breach',
                'severity'         => 'critical',
                'title'            => "SLA Breached: {$claim->claim_number}",
                'body' => "Claim {$claim->claim_number} (" . ($claim->claim_type?->value ?? $claim->claim_type) . ") has exceeded its {$claim->sla_target_days}-day SLA and remains unresolved. Immediate review required.",
                'action_url'       => "/claims/{$claim->id}",
                'notifiable_type'  => Claim::class,
                'notifiable_id'    => $claim->id,
            ]);
        }
    }

    public function slaWarning(Claim $claim, int $hoursRemaining): void
    {
        $recipients = $this->usersWithPermission('claims.process', $claim->branch_id);

        foreach ($recipients as $user) {
            $this->create($user->id, $claim->branch_id, [
                'type'             => 'sla_warning',
                'severity'         => 'warning',
                'title'            => "SLA Warning: {$claim->claim_number}",
                'body'             => "Claim {$claim->claim_number} has {$hoursRemaining} hours remaining before SLA breach. Current status: " . ($claim->status?->label ?? $claim->status),
                'action_url'       => "/claims/{$claim->id}",
                'notifiable_type'  => Claim::class,
                'notifiable_id'    => $claim->id,
            ]);
        }
    }

    // ── Fraud ─────────────────────────────────────────────────────────────────

    public function fraudFlagged(Claim $claim, FraudFlag $flag): void
    {
        $recipients = $this->usersWithPermission('claims.fraud_review', $claim->branch_id);
        
        // Get critical threshold from system settings
        $criticalThreshold = SystemSetting::get('fraud.critical_notification_threshold', 90);

        foreach ($recipients as $user) {
            $this->create($user->id, $claim->branch_id, [
                'type'             => 'fraud_flag',
                // 'severity'         => $claim->risk_score >= 90 ? 'critical' : 'warning',
                'severity'         => $claim->risk_score >= $criticalThreshold ? 'critical' : 'warning',
                'title'            => "Fraud Flag: {$claim->claim_number}",
                'body'             => "Claim {$claim->claim_number} flagged [{$flag->flag_type}] with risk score {$claim->risk_score}/100. " . $flag->description,
                'action_url'       => "/claims/{$claim->id}",
                'notifiable_type'  => Claim::class,
                'notifiable_id'    => $claim->id,
            ]);
        }
    }

    // ── Pre-Authorisation ─────────────────────────────────────────────────────

    public function paRequiresApproval(PreAuthorisation $pa, string $requiredPermission): void
    {
        $recipients = $this->usersWithPermission($requiredPermission, $pa->branch_id);

        foreach ($recipients as $user) {
            $this->create($user->id, $pa->branch_id, [
                'type'             => 'pa_pending',
                'severity'         => 'warning',
                'title'            => "PA Awaiting Approval: {$pa->pa_code}",
                'body'             => "Pre-authorisation {$pa->pa_code} ({$pa->approval_tier} tier, ₦" . number_format($pa->estimated_amount ?? 0, 0) . ") is waiting for your sign-off.",
                'action_url'       => "/pre-auth/{$pa->id}",
                'notifiable_type'  => PreAuthorisation::class,
                'notifiable_id'    => $pa->id,
            ]);
        }
    }

    // ── Finance ───────────────────────────────────────────────────────────────

    public function batchReadyForApproval(PaymentBatch $batch): void
    {
        $recipients = $this->usersWithPermission('finance.batch_approve', $batch->branch_id);

        foreach ($recipients as $user) {
            $this->create($user->id, $batch->branch_id, [
                'type'             => 'batch_ready',
                'severity'         => 'info',
                'title'            => "Batch Ready: {$batch->batch_number}",
                'body'             => "Payment batch {$batch->batch_number} (₦" . number_format($batch->total_amount, 0) . ", {$batch->claim_count} items) is submitted and awaiting your approval.",
                'action_url'       => "/finance/batches/{$batch->id}",
                'notifiable_type'  => PaymentBatch::class,
                'notifiable_id'    => $batch->id,
            ]);
        }
    }

    // ── Compliance ────────────────────────────────────────────────────────────

    public function complianceDue(ComplianceFiling $filing): void
    {
        $daysLeft   = $filing->days_until_due;
        $recipients = $this->usersWithPermission('compliance.manage', $filing->branch_id);

        // Also always notify the assignee if set
        if ($filing->assigned_to) {
            $assigneeIds = $recipients->pluck('id')->toArray();
            if (!in_array($filing->assigned_to, $assigneeIds)) {
                $assignee = User::find($filing->assigned_to);
                if ($assignee) {
                    $recipients->push($assignee);
                }
            }
        }

        // Get compliance critical days from system settings
        $criticalDays = SystemSetting::get('notifications.compliance_critical_days', 3);

        $type     = $daysLeft < 0  ? 'compliance_overdue' : 'compliance_due';
        // $severity = $daysLeft < 0  ? 'critical'
        //           : ($daysLeft <= 3 ? 'critical' : 'warning');
        $severity = $daysLeft < 0  ? 'critical'
                  : ($daysLeft <= $criticalDays ? 'critical' : 'warning');
        $body     = $daysLeft < 0
            ? "Compliance filing \"{$filing->title}\" was due on {$filing->due_date->format('d M Y')} and is now " . abs($daysLeft) . " day(s) overdue."
            : "Compliance filing \"{$filing->title}\" is due in {$daysLeft} day(s) on {$filing->due_date->format('d M Y')}.";

        foreach ($recipients as $user) {
            $this->create($user->id, $filing->branch_id, [
                'type'             => $type,
                'severity'         => $severity,
                'title'            => "{$filing->title} — " . ($daysLeft < 0 ? 'OVERDUE' : "Due in {$daysLeft} days"),
                'body'             => $body,
                'action_url'       => "/compliance/{$filing->id}",
                'notifiable_type'  => ComplianceFiling::class,
                'notifiable_id'    => $filing->id,
            ]);
        }
    }

    // ── Generic ───────────────────────────────────────────────────────────────

    /**
     * Send a system notification to a specific list of user IDs.
     */
    public function system(array $userIds, int $branchId, string $title, string $body, ?string $actionUrl = null): void
    {
        foreach ($userIds as $userId) {
            $this->create($userId, $branchId, [
                'type'       => 'system',
                'severity'   => 'info',
                'title'      => $title,
                'body'       => $body,
                'action_url' => $actionUrl,
            ]);
        }
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Create a notification record in the database.
     */
    private function create(int $userId, ?int $branchId, array $payload): void
    {
        $data = array_merge($payload, [
            'user_id' => $userId,
        ]);

        // Only add branch_id if provided and not null
        if ($branchId !== null) {
            $data['branch_id'] = $branchId;
        }

        UserNotification::create($data);
    }

    /**
     * Find all active users in a branch who have a specific permission.
     * Uses Spatie's permission system correctly.
     */
    private function usersWithPermission(string $permission, ?int $branchId): Collection
    {
        $query = User::query()
            ->where('status', 'active')
            ->whereHas('roles', function ($roleQuery) use ($permission) {
                $roleQuery->whereHas('permissions', function ($permissionQuery) use ($permission) {
                    $permissionQuery->where('name', $permission);
                });
            });

        // Apply branch filter if provided
        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        return $query->get(['id', 'name', 'email']);
    }
}