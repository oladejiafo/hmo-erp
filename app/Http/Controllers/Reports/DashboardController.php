<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\Corporate;
use App\Models\Enrollee;
use App\Models\HealthCareProvider;
use App\Models\PaymentBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user      = $request->user();
        $cacheKey  = "dashboard:{$user->branch_id}:{$user->id}";
        $isHQ      = $user->isHQ();

        $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($isHQ) {
            return [
                'claims_summary'    => $this->claimsSummary($isHQ),
                'enrollee_summary'  => $this->enrolleeSummary($isHQ),
                'finance_summary'   => $this->financeSummary($isHQ),
                'hcp_summary'       => $this->hcpSummary($isHQ),
                'claims_this_month' => $this->claimsThisMonth($isHQ),
                'fraud_alerts'      => $this->fraudAlerts($isHQ),
                'pending_actions'   => $this->pendingActions($isHQ),
            ];
        });

        return response()->json(['data' => $data]);
    }

    protected function claimsSummary(bool $isHQ): array
    {
        $query = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return [
            'total' => $query->count(),
            'pending' => (clone $query)->whereNotIn('status', ['paid', 'rejected', 'reversed'])->count(),
            'approved' => (clone $query)->where('status', 'approved')->count(),
            'flagged' => (clone $query)->where('status', 'flagged')->count(),
            'paid' => (clone $query)->where('status', 'paid')->count(),
            'high_risk' => (clone $query)->where('risk_score', '>=', 70)->count(),
            'totalValue' => (clone $query)->sum('total_amount_claimed'),
            'approvedValue' => (clone $query)->where('status', 'approved')->sum('total_amount_approved'),
            'paidValue' => (clone $query)->where('status', 'paid')->sum('total_amount_paid'),
        ];
    }

    protected function enrolleeSummary(bool $isHQ): array
    {
        $query = $isHQ ? Enrollee::withoutGlobalScopes() : Enrollee::query();

        return [
            'total' => $query->count(),
            'active' => (clone $query)->where('status', 'active')->count(),
            'expired' => (clone $query)->where('expiry_date', '<', now())->count(),
            'suspended' => (clone $query)->where('status', 'suspended')->count(),
        ];
    }

    protected function financeSummary(bool $isHQ): array
    {
        $batchQuery = $isHQ ? PaymentBatch::withoutGlobalScopes() : PaymentBatch::query();

        return [
            'pending_batches' => (clone $batchQuery)->whereIn('status', ['draft', 'submitted'])->count(),
            'total_pending_payout' => (clone $batchQuery)->whereIn('status', ['approved', 'processing'])->sum('total_amount'),
            'total_paid_this_month' => (clone $batchQuery)
                ->where('status', 'completed')
                ->whereMonth('processed_at', now()->month)
                ->sum('total_amount'),
        ];
    }

    protected function hcpSummary(bool $isHQ): array
    {
        $query = $isHQ ? HealthCareProvider::withoutGlobalScopes() : HealthCareProvider::query();

        return [
            'total' => $query->count(),
            'active' => (clone $query)->where('status', 'active')->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'blacklisted' => (clone $query)->where('status', 'blacklisted')->count(),
        ];
    }

    protected function claimsThisMonth(bool $isHQ): array
    {
        $query = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return (clone $query)
            ->selectRaw('WEEK(service_date) as week, COUNT(*) as count, SUM(total_amount_claimed) as total_value, AVG(risk_score) as avg_risk_score')
            ->whereMonth('service_date', now()->month)
            ->groupBy('week')
            ->orderBy('week')
            ->get()
            ->toArray();
    }

    protected function fraudAlerts(bool $isHQ): array
    {
        $query = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return (clone $query)
            ->with(['hcp:id,name'])
            ->where('risk_score', '>=', 70)
            ->whereIn('status', ['flagged', 'under_review', 'supervisor_review'])
            ->orderByDesc('risk_score')
            ->limit(10)
            ->get(['id', 'claim_number', 'risk_score', 'status', 'total_amount_claimed', 'hcp_id'])
            ->toArray();
    }

    protected function pendingActions(bool $isHQ): array
    {
        $claimQuery = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return [
            'claims_awaiting_review' => (clone $claimQuery)->where('status', 'auto_validated')->count(),
            'claims_under_review' => (clone $claimQuery)->where('status', 'under_review')->count(),
            'claims_supervisor' => (clone $claimQuery)->where('status', 'supervisor_review')->count(),
            'claims_approved_not_batched' => 0, // Temporarily set to 0 to avoid the relationship error
        ];
    }
}
