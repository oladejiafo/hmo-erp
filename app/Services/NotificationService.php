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
use App\Models\Corporate;

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

    /**
     * Notify staff when a new PA needs attention.
     */
    public function paSubmitted(PreAuthorisation $pa): void
    {
        $permissionNeeded = match ($pa->approval_tier) {
            'critical' => 'pa.approve_critical',
            'high_value' => 'pa.approve_high_value',
            default => 'pa.approve_standard',
        };

        $recipients = User::whereHas('roles.permissions', fn ($q) => $q->where('name', $permissionNeeded))
            ->where(function ($q) use ($pa) {
                $q->where('branch_id', $pa->branch_id)
                ->orWhereHas('branch', fn ($b) => $b->where('type', 'HQ'));
            })
            ->get();

        foreach ($recipients as $user) {
            $this->create($user->id, $pa->branch_id, [
                'type'            => 'pa_pending',
                'severity'        => $pa->urgency === 'emergency' ? 'warning' : 'info',
                'title'           => "New Pre-Auth: {$pa->pa_number}",
                'body'            => "{$pa->service_type} - " . ($pa->submission_channel === 'provider_portal' ? "submitted by {$pa->hcp->name}" : 'submitted internally'),
                'action_url'      => "/pre-auth/{$pa->id}",
                'notifiable_type' => PreAuthorisation::class,
                'notifiable_id'   => $pa->id,
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
                'title'            => "{$filing->title} - " . ($daysLeft < 0 ? 'OVERDUE' : "Due in {$daysLeft} days"),
                'body'             => $body,
                'action_url'       => "/compliance/{$filing->id}",
                'notifiable_type'  => ComplianceFiling::class,
                'notifiable_id'    => $filing->id,
            ]);
        }
    }


    public function providerClaimDecision(Claim $claim): void
    {
        $user = User::where('hcp_id', $claim->hcp_id)->first();
        if (!$user) return; // facility has no portal login yet - nothing to notify

        $decided = $claim->status->value; // 'approved' | 'rejected'
        $this->create($user->id, $claim->branch_id, [
            'type'            => 'claim_decision',
            'severity'        => $decided === 'rejected' ? 'warning' : 'info',
            'title'           => ucfirst($decided) . ": {$claim->claim_number}",
            'body'            => $decided === 'rejected'
                ? "Claim {$claim->claim_number} was rejected. Reason: {$claim->rejection_reason}"
                : "Claim {$claim->claim_number} was approved for " . number_format($claim->total_amount_approved, 2) . ".",
            'action_url'      => "/provider/claims/{$claim->id}",
            'notifiable_type' => Claim::class,
            'notifiable_id'   => $claim->id,
        ]);
    }

    public function providerPaymentMade(\App\Models\ProviderPayment $payment): void
    {
        $user = User::where('hcp_id', $payment->hcp_id)->first();
        if (!$user) return;

        $this->create($user->id, $payment->claim?->branch_id, [
            'type'            => 'payment_made',
            'severity'        => 'info',
            'title'           => 'Payment processed',
            'body'            => "A payment of " . number_format($payment->amount, 2) . " has been processed. Reference: {$payment->payment_reference}",
            'action_url'      => '/provider/payments',
            'notifiable_type' => \App\Models\ProviderPayment::class,
            'notifiable_id'   => $payment->id,
        ]);
    }

    public function providerPreAuthDecision(PreAuthorisation $pa): void
    {
        $user = User::where('hcp_id', $pa->hcp_id)->first();
        if (!$user) return;

        $approved = in_array($pa->status, ['approved']);
        $this->create($user->id, $pa->branch_id, [
            'type'            => 'pa_decision',
            'severity'        => $approved ? 'info' : 'warning',
            'title'           => ($approved ? 'Pre-Auth Approved' : 'Pre-Auth Declined') . ": {$pa->pa_number}",
            'body'            => $approved
                ? "Pre-authorisation {$pa->pa_number} was approved. Code: {$pa->pa_code}"
                : "Pre-authorisation {$pa->pa_number} was declined.",
            'action_url'      => '/provider/pre-auths',
            'notifiable_type' => PreAuthorisation::class,
            'notifiable_id'   => $pa->id,
        ]);
    }

    public function ticketReplied(\App\Models\Ticket $ticket, \App\Models\User $repliedTo): void
    {
        $this->create($repliedTo->id, $ticket->branch_id, [
            'type'            => 'ticket_reply',
            'severity'        => 'info',
            'title'           => "New reply on {$ticket->ticket_number}",
            'body'            => "There's a new reply on your ticket: {$ticket->subject}",
            'action_url'      => "/tickets/{$ticket->id}", // portal-relative, frontend resolves per portalType()
            'notifiable_type' => \App\Models\Ticket::class,
            'notifiable_id'   => $ticket->id,
        ]);
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

    public function corporateUtilizationAlert(Claim $claim): void
    {
        if (!$claim->enrollee->corporate_id) return;

        $corporateUser = User::where('corporate_id', $claim->enrollee->corporate_id)->first();
        if (!$corporateUser) return;

        $this->create($corporateUser->id, $claim->branch_id, [
            'type'            => 'utilization_alert',
            'severity'        => 'info',
            'title'           => 'Plan utilization activity',
            'body'            => 'An employee under your plan visited a healthcare facility. No personal or clinical details are shared here, see your Budget Dashboard for aggregate utilization.',
            'action_url'      => '/corporate/budget',
            'notifiable_type' => Claim::class,
            'notifiable_id'   => $claim->id,
        ]);
    }

    public function broadcastToCorporateEnrollees(Corporate $corporate, string $title, string $body): int
    {
        $enrolleeUserIds = User::whereIn('enrollee_id', function ($query) use ($corporate) {
            $query->select('id')->from('enrollees')->where('corporate_id', $corporate->id)->where('status', 'active');
        })->pluck('id');

        foreach ($enrolleeUserIds as $userId) {
            $this->create($userId, $corporate->branch_id, [
                'type'            => 'broadcast',
                'severity'        => 'info',
                'title'           => $title,
                'body'            => $body,
                'action_url'      => null,
                'notifiable_type' => Corporate::class,
                'notifiable_id'   => $corporate->id,
            ]);
        }

        return $enrolleeUserIds->count();
    }

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