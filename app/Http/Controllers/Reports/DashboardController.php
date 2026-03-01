<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\HealthCareProvider;
use App\Models\PaymentBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\SystemSetting;

class DashboardController extends Controller
{
    /**
     * Main dashboard data endpoint.
     * Cached 5 min. Cache key includes branch_id.
     *
     * GET /api/v1/reports/dashboard
     *
     * ADDED in Phase 5:
     *   loss_ratio       → current month / last month / YTD loss ratio %
     *   loss_ratio_trend → 6-month trend array for chart
     *   kpi_highlights   → avg processing days, PA rate, capitation YTD, overdue invoices
     */
    public function index(Request $request): JsonResponse
    {
        $user     = $request->user();
        $cacheKey = "dashboard:{$user->branch_id}:{$user->id}";
        $isHQ     = $user->isHQ();

        $data = Cache::remember($cacheKey, now()->addMinutes(5), function () use ($isHQ) {
            return [
                'claims_summary'    => $this->claimsSummary($isHQ),
                'enrollee_summary'  => $this->enrolleeSummary($isHQ),
                'finance_summary'   => $this->financeSummary($isHQ),
                'hcp_summary'       => $this->hcpSummary($isHQ),
                'claims_this_month' => $this->claimsThisMonth($isHQ),
                'fraud_alerts'      => $this->fraudAlerts($isHQ),
                'pending_actions'   => $this->pendingActions($isHQ),
                'loss_ratio'        => $this->lossRatio($isHQ),
                'loss_ratio_trend'  => $this->lossRatioTrend($isHQ),
                'kpi_highlights'    => $this->kpiHighlights($isHQ),
            ];
        });

        return response()->json(['data' => $data]);
    }

    // ── Existing methods ──────────────────────────────────────────────────────

    protected function claimsSummary(bool $isHQ): array
    {
        $q = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return [
            'total'         => $q->count(),
            'pending'       => (clone $q)->whereNotIn('status', ['paid', 'rejected', 'reversed'])->count(),
            'approved'      => (clone $q)->where('status', 'approved')->count(),
            'flagged'       => (clone $q)->where('status', 'flagged')->count(),
            'paid'          => (clone $q)->where('status', 'paid')->count(),
            // 'high_risk'     => (clone $q)->where('risk_score', '>=', config('fraud.auto_quarantine_threshold', 70))->count(),
            'high_risk'     => (clone $q)->where('risk_score', '>=', SystemSetting::get('fraud.auto_quarantine_threshold', 70))->count(),

            'totalValue'    => (clone $q)->sum('total_amount_claimed'),
            'approvedValue' => (clone $q)->where('status', 'approved')->sum('total_amount_approved'),
            'paidValue'     => (clone $q)->where('status', 'paid')->sum('total_amount_paid'),
        ];
    }

    protected function enrolleeSummary(bool $isHQ): array
    {
        $q = $isHQ ? Enrollee::withoutGlobalScopes() : Enrollee::query();

        return [
            'total'     => (clone $q)->count(),
            'active'    => (clone $q)->where('status', 'active')->count(),
            'expired'   => (clone $q)->where('expiry_date', '<', now())->count(),
            'suspended' => (clone $q)->where('status', 'suspended')->count(),
        ];
    }

    protected function financeSummary(bool $isHQ): array
    {
        $q = $isHQ ? PaymentBatch::withoutGlobalScopes() : PaymentBatch::query();

        return [
            'pending_batches'       => (clone $q)->whereIn('status', ['draft', 'submitted'])->count(),
            'total_pending_payout'  => (clone $q)->whereIn('status', ['approved', 'processing'])->sum('total_amount'),
            'total_paid_this_month' => (clone $q)
                ->where('status', 'completed')
                ->whereMonth('processed_at', now()->month)
                ->sum('total_amount'),
        ];
    }

    protected function hcpSummary(bool $isHQ): array
    {
        $q = $isHQ ? HealthCareProvider::withoutGlobalScopes() : HealthCareProvider::query();

        return [
            'total'       => (clone $q)->count(),
            'active'      => (clone $q)->where('status', 'active')->count(),
            'pending'     => (clone $q)->where('status', 'pending')->count(),
            'blacklisted' => (clone $q)->where('status', 'blacklisted')->count(),
        ];
    }

    protected function claimsThisMonth(bool $isHQ): array
    {
        $q = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return (clone $q)
            ->selectRaw('WEEK(service_date) as week, COUNT(*) as count,
                         SUM(total_amount_claimed) as total_value, AVG(risk_score) as avg_risk_score')
            ->whereMonth('service_date', now()->month)
            ->groupBy('week')
            ->orderBy('week')
            ->get()->toArray();
    }

    protected function fraudAlerts(bool $isHQ): array
    {
        $q = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return (clone $q)
            ->with(['hcp:id,name', 'enrollee:id,enrollee_id,first_name,last_name'])
            // ->where('risk_score', '>=', config('fraud.auto_quarantine_threshold', 70))
            ->where('risk_score', '>=', SystemSetting::get('fraud.auto_quarantine_threshold', 70))

            ->whereIn('status', ['flagged', 'under_review', 'supervisor_review'])
            ->orderByDesc('risk_score')
            ->limit(10)
            ->get(['id', 'claim_number', 'risk_score', 'status', 'total_amount_claimed', 'hcp_id', 'enrollee_id'])
            ->toArray();
    }

    protected function pendingActions(bool $isHQ): array
    {
        $q = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        return [
            'claims_awaiting_review'      => (clone $q)->where('status', 'auto_validated')->count(),
            'claims_under_review'         => (clone $q)->where('status', 'under_review')->count(),
            'claims_supervisor'           => (clone $q)->where('status', 'supervisor_review')->count(),
            'claims_approved_not_batched' => (clone $q)->where('status', 'approved')
                ->whereDoesntHave('payment')->count(),
        ];
    }

    // ── NEW: Loss Ratio ───────────────────────────────────────────────────────

    /**
     * Loss Ratio = (Claims Paid ÷ Premiums Collected) × 100
     *
     * Premiums = corporate_invoices.total_amount WHERE status = 'paid'
     * Claims   = claims.total_amount_paid WHERE status = 'paid'
     *
     * Risk levels (Nigerian HMO industry norms):
     *   excellent  < 60%
     *   healthy    60–74%
     *   moderate   75–84%
     *   high       85–94%
     *   critical   ≥ 95%
     */
    protected function lossRatio(bool $isHQ): array
    {
        $current = $this->lossRatioForPeriod(now()->startOfMonth(), now()->endOfMonth(), $isHQ);
        $last    = $this->lossRatioForPeriod(now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth(), $isHQ);
        $ytd     = $this->lossRatioForPeriod(now()->startOfYear(), now(), $isHQ);

        return [
            'current_month'   => round($current['ratio'], 1),
            'last_month'      => round($last['ratio'], 1),
            'ytd'             => round($ytd['ratio'], 1),
            'change'          => round($current['ratio'] - $last['ratio'], 1),
            'premiums_ytd'    => $ytd['premiums'],
            'claims_paid_ytd' => $ytd['claims_paid'],
            'risk_level'      => $this->classifyLossRatio($ytd['ratio']),
        ];
    }

    protected function lossRatioForPeriod($from, $to, bool $isHQ): array
    {
        $premiums = DB::table('corporate_invoices')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$from, $to])
            ->sum('total_amount');

        $claimsPaid = DB::table('claims')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->where('status', 'paid')
            ->whereBetween('updated_at', [$from, $to])
            ->sum('total_amount_paid');

        return [
            'ratio'       => $premiums > 0 ? ($claimsPaid / $premiums) * 100 : 0,
            'premiums'    => (float) $premiums,
            'claims_paid' => (float) $claimsPaid,
        ];
    }

    protected function classifyLossRatio(float $ratio): string
    {
        if ($ratio < 60) return 'excellent';
        if ($ratio < 75) return 'healthy';
        if ($ratio < 85) return 'moderate';
        if ($ratio < 95) return 'high';
        return 'critical';
    }

    /**
     * 6-month loss ratio trend.
     * Returns last 6 complete months for a sparkline/line chart.
     *
     * @return array[{ month, premiums_collected, claims_paid, ratio }]
     */
    protected function lossRatioTrend(bool $isHQ): array
    {
        $trend = [];

        for ($i = 5; $i >= 0; $i--) {
            $date  = now()->subMonths($i);
            $start = $date->copy()->startOfMonth();
            $end   = $date->copy()->endOfMonth();

            $p = $this->lossRatioForPeriod($start, $end, $isHQ);

            $trend[] = [
                'month'              => $date->format('M y'),
                'premiums_collected' => round($p['premiums'], 2),
                'claims_paid'        => round($p['claims_paid'], 2),
                'ratio'              => round($p['ratio'], 1),
            ];
        }

        return $trend;
    }

    // ── NEW: KPI Highlights ───────────────────────────────────────────────────

    /**
     * Supplementary KPIs for the enhanced dashboard second row.
     *
     * avg_processing_days  Average days from submission_date to paid status
     * pa_approval_rate     % of decided PA requests that were approved
     * capitation_ytd       Total capitation paid this year (payment_batches batch_type=capitation)
     * overdue_invoices     Corporate invoices past due date, still unpaid
     * active_pa_count      PA requests currently awaiting decision
     */
    protected function kpiHighlights(bool $isHQ): array
    {
        $avgProcessing = DB::table('claims')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->where('status', 'paid')
            ->whereNotNull('submission_date')
            ->selectRaw('AVG(DATEDIFF(updated_at, submission_date)) as avg_days')
            ->value('avg_days');

        $paDecided  = DB::table('pre_authorisations')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->whereIn('status', ['approved', 'declined'])->count();

        $paApproved = DB::table('pre_authorisations')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->where('status', 'approved')->count();

        $capitationYtd = DB::table('payment_batches')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->where('batch_type', 'capitation')
            ->where('status', 'completed')
            ->whereYear('processed_at', now()->year)
            ->sum('total_amount');

        $overdueInvoices = DB::table('corporate_invoices')
            ->where('status', 'sent')
            ->where('due_date', '<', now()->toDateString())
            ->count();

        $activePa = DB::table('pre_authorisations')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->whereIn('status', ['pending', 'under_review', 'escalated'])->count();

        return [
            'avg_processing_days' => $avgProcessing ? round((float) $avgProcessing, 1) : null,
            'pa_approval_rate'    => $paDecided > 0 ? round(($paApproved / $paDecided) * 100, 1) : null,
            'capitation_ytd'      => (float) $capitationYtd,
            'overdue_invoices'    => (int) $overdueInvoices,
            'active_pa_count'     => (int) $activePa,
        ];
    }
}