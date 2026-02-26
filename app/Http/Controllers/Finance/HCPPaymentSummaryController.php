<?php

namespace App\Http\Controllers\Finance; // 👈 FIX: Use Finance namespace

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\HealthCareProvider;
use App\Models\HcpCapitationRate; // 👈 ADD: Missing import
use Carbon\Carbon;

/**
 * HCPPaymentSummaryController
 *
 * Powers the "HCP Payment Summary" tab in FinancePage.
 * Returns a consolidated view of what the HMO owes each HCP this month:
 *   - Capitation providers: current month capitation amount
 *   - FFS providers: approved claims not yet batched
 *   - Hybrid providers: both
 */
class HCPPaymentSummaryController extends Controller
{
    /**
     * GET /api/finance/hcp-payment-summary
     *
     * Returns both capitation and FFS providers with their current liabilities.
     */
    public function index(Request $request)
    {
        $branchId    = $request->user()->branch_id;
        $isHQ        = $request->user()->hasRole(['hq_manager','ceo']);
        $currentMonth = Carbon::now()->month;
        $currentYear  = Carbon::now()->year;

        // ── 1. Capitation providers: current month run amounts ─────────────
        $capitationData = DB::table('health_care_providers as h')
            ->join('hcp_capitation_rates as r', function ($j) {
                $j->on('r.hcp_id', '=', 'h.id')
                  ->where('r.is_active', true);
            })
            ->leftJoin('capitation_records as cr', function ($j) use ($currentMonth, $currentYear) {
                $j->on('cr.hcp_id', '=', 'h.id')
                  ->whereMonth('cr.created_at', '=', $currentMonth) // 👈 FIX: Use whereMonth
                  ->whereYear('cr.created_at', '=', $currentYear);   // 👈 FIX: Use whereYear
            })
            // ->leftJoin('capitation_runs as run', 'run.id', '=', 'cr.capitation_run_id')
            ->leftJoin('capitation_runs as run', 'run.id', '=', 'cr.run_id')
            ->where('h.status', 'active')
            ->whereIn('h.payment_model', ['capitation', 'hybrid'])
            ->when(!$isHQ, fn($q) => $q->where('h.branch_id', $branchId))
            ->select([
                'h.id',
                'h.name as hcp_name',
                'h.hcp_code',
                'h.type',
                'h.tier',
                'h.payment_model',
                'h.state',
                DB::raw("'capitation' as liability_source"),
                DB::raw('COALESCE(cr.total_amount, 0) as capitation_amount'),
                DB::raw('COALESCE(run.status, "no_run") as run_status'),
                DB::raw('cr.principal_count'),
                DB::raw('cr.dependent_count'),
                DB::raw('r.rate_per_principal'),
                DB::raw('r.rate_per_dependent'),
                DB::raw('0 as ffs_pending_count'),
                DB::raw('0 as ffs_pending_amount'),
            ])
            ->get();

        // ── 2. FFS providers: approved claims not yet batched ──────────────
$ffsData = DB::table('health_care_providers as h')
->leftJoin('claims as c', function ($j) {
    $j->on('c.hcp_id', '=', 'h.id')
      ->where('c.status', 'approved')
      ->whereNotExists(function ($query) {
          $query->select(DB::raw(1))
                ->from('provider_payments')
                ->whereColumn('provider_payments.claim_id', 'c.id');
      });
})
->where('h.status', 'active')
->whereIn('h.payment_model', ['fee_for_service', 'hybrid'])
->when(!$isHQ, fn($q) => $q->where('h.branch_id', $branchId))
->select([
    'h.id',
    'h.name as hcp_name',
    'h.hcp_code',
    'h.type',
    'h.tier',
    'h.payment_model',
    'h.state',
    DB::raw("'ffs' as liability_source"),
    DB::raw('0 as capitation_amount'),
    DB::raw('"n/a" as run_status'),
    DB::raw('null as principal_count'),
    DB::raw('null as dependent_count'),
    DB::raw('null as rate_per_principal'),
    DB::raw('null as rate_per_dependent'),
    DB::raw('COUNT(c.id) as ffs_pending_count'),
    DB::raw('COALESCE(SUM(c.total_amount_approved), 0) as ffs_pending_amount'),
])
->groupBy(
    'h.id','h.name','h.hcp_code','h.type','h.tier',
    'h.payment_model','h.state'
)
->get();

        // ── 3. Merge: hybrid HCPs appear in both, combine them ─────────────
        $merged = collect();
        $capMap = $capitationData->keyBy('id');
        $ffsMap = $ffsData->keyBy('id');

        // Add all capitation entries
        foreach ($capMap as $id => $row) {
            $ffs = $ffsMap->get($id);
            $merged->push([
                'hcp_id'              => $row->id,
                'hcp_name'            => $row->hcp_name,
                'hcp_code'            => $row->hcp_code,
                'type'                => $row->type,
                'tier'                => $row->tier,
                'payment_model'       => $row->payment_model,
                'state'               => $row->state,
                'capitation_amount'   => (float) $row->capitation_amount,
                'run_status'          => $row->run_status,
                'principal_count'     => $row->principal_count,
                'dependent_count'     => $row->dependent_count,
                'rate_per_principal'  => $row->rate_per_principal,
                'rate_per_dependent'  => $row->rate_per_dependent,
                'ffs_pending_count'   => (int)   ($ffs->ffs_pending_count ?? 0),
                'ffs_pending_amount'  => (float) ($ffs->ffs_pending_amount ?? 0),
                'total_liability'     => (float) $row->capitation_amount + (float) ($ffs->ffs_pending_amount ?? 0),
            ]);
        }

        // Add FFS-only entries (not already in capMap)
        foreach ($ffsMap as $id => $row) {
            if ($capMap->has($id)) continue;
            $merged->push([
                'hcp_id'              => $row->id,
                'hcp_name'            => $row->hcp_name,
                'hcp_code'            => $row->hcp_code,
                'type'                => $row->type,
                'tier'                => $row->tier,
                'payment_model'       => $row->payment_model,
                'state'               => $row->state,
                'capitation_amount'   => 0,
                'run_status'          => 'n/a',
                'principal_count'     => null,
                'dependent_count'     => null,
                'rate_per_principal'  => null,
                'rate_per_dependent'  => null,
                'ffs_pending_count'   => (int)   $row->ffs_pending_count,
                'ffs_pending_amount'  => (float) $row->ffs_pending_amount,
                'total_liability'     => (float) $row->ffs_pending_amount,
            ]);
        }

        // ── 4. Summary totals ──────────────────────────────────────────────
        $summary = [
            'total_capitation_liability' => $merged->sum('capitation_amount'),
            'total_ffs_liability'        => $merged->sum('ffs_pending_amount'),
            'total_liability'            => $merged->sum('total_liability'),
            'capitation_hcp_count'       => $merged->whereIn('payment_model', ['capitation','hybrid'])->count(),
            'ffs_hcp_count'              => $merged->whereIn('payment_model', ['fee_for_service','hybrid'])->count(),
            'ffs_pending_claims'         => $merged->sum('ffs_pending_count'),
            'current_period'             => Carbon::now()->format('F Y'),
        ];

        return response()->json([
            'data'    => $merged->sortByDesc('total_liability')->values(),
            'summary' => $summary,
        ]);
    }

    /**
     * GET /api/finance/hcp-payment-summary/ffs-vs-capitation
     *
     * Monthly spend breakdown by payment model for the Reports tab.
     * Returns 12 months of data for charting.
     */
    public function ffsVsCapitationTrend(Request $request) // 👈 FIX: Method name
    {
        $branchId = $request->user()->branch_id;
        $isHQ     = $request->user()->hasRole(['hq_manager','ceo']);
        $months   = 12;

        $rows = DB::table('payment_batches as b')
            ->join('payment_batch_items as bi', 'bi.payment_batch_id', '=', 'b.id')
            ->join('health_care_providers as h', 'h.id', '=', 'bi.hcp_id')
            ->where('b.status', 'completed')
            ->when(!$isHQ, fn($q) => $q->where('b.branch_id', $branchId))
            ->where('b.created_at', '>=', now()->subMonths($months)->startOfMonth())
            ->select([
                DB::raw('YEAR(b.completed_at) as yr'),
                DB::raw('MONTH(b.completed_at) as mo'),
                DB::raw("DATE_FORMAT(b.completed_at, '%b %Y') as period"),
                'b.batch_type',
                'h.payment_model',
                DB::raw('SUM(bi.amount) as total_paid'),
            ])
            ->groupBy('yr', 'mo', 'period', 'b.batch_type', 'h.payment_model')
            ->orderBy('yr')
            ->orderBy('mo')
            ->get();

        // Also include capitation run totals (paid status)
        $capRuns = DB::table('capitation_runs as r')
            ->where('r.status', 'paid')
            ->when(!$isHQ, fn($q) => $q->where('r.branch_id', $branchId))
            ->where('r.updated_at', '>=', now()->subMonths($months)->startOfMonth())
            ->select([
                DB::raw('r.period_year as yr'),
                DB::raw('r.period_month as mo'),
                DB::raw("CONCAT(MONTHNAME(STR_TO_DATE(r.period_month, '%m')), ' ', r.period_year) as period"),
                DB::raw("'capitation' as batch_type"),
                DB::raw("'capitation' as payment_model"),
                DB::raw('SUM(r.total_amount) as total_paid'),
            ])
            ->groupBy('yr', 'mo', 'period')
            ->get();

        return response()->json([
            'batch_data'      => $rows,
            'capitation_runs' => $capRuns,
        ]);
    }
}