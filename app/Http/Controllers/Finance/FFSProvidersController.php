<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\HealthCareProvider;
use App\Models\PaymentBatch;
use App\Models\ProviderPayment;
use App\Models\Claim;
use Carbon\Carbon;

class FFSProvidersController extends Controller
{
    // GET /api/finance/ffs/providers
    public function index(Request $request)
    {
        $branchId = $request->user()->branch_id;
        $isHQ     = $request->user()->hasRole(['hq_manager', 'ceo']);

        $query = HealthCareProvider::query()
            ->whereIn('payment_model', ['fee_for_service', 'hybrid'])
            ->where('status', 'active')
            ->when(!$isHQ, fn($q) => $q->where('branch_id', $branchId))
            ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%$s%")->orWhere('hcp_code', 'like', "%$s%");
            }))
            ->when($request->model, fn($q, $m) => $q->where('payment_model', $m))
            ->withCount(['claims as ffs_pending_count' => fn($q) =>
                $q->where('status', 'approved')->whereDoesntHave('payment')
            ])
            ->withSum(['claims as ffs_pending_amount' => fn($q) =>
                $q->where('status', 'approved')->whereDoesntHave('payment')
            ], 'total_amount_approved')
            ->orderByDesc('ffs_pending_amount');

        $results = $query->paginate($request->get('per_page', 20));

        // Summary stats
        $allFFS = HealthCareProvider::whereIn('payment_model', ['fee_for_service', 'hybrid'])
            ->where('status', 'active')
            ->when(!$isHQ, fn($q) => $q->where('branch_id', $branchId))
            ->select([
                DB::raw("SUM(CASE WHEN payment_model = 'fee_for_service' THEN 1 ELSE 0 END) as ffs_count"),
                DB::raw("SUM(CASE WHEN payment_model = 'hybrid' THEN 1 ELSE 0 END) as hybrid_count"),
            ])->first();

        $pendingAmount = Claim::query()
            ->join('health_care_providers as h', 'h.id', '=', 'claims.hcp_id')
            ->whereIn('h.payment_model', ['fee_for_service', 'hybrid'])
            ->where('claims.status', 'approved')
            ->whereDoesntHave('payment')
            ->when(!$isHQ, fn($q) => $q->where('claims.branch_id', $branchId))
            ->sum('claims.total_amount_approved');

        $expiringContracts = HealthCareProvider::whereIn('payment_model', ['fee_for_service', 'hybrid'])
            ->where('status', 'active')
            ->whereNotNull('ffs_contract_end')
            ->whereBetween('ffs_contract_end', [now(), now()->addDays(30)])
            ->when(!$isHQ, fn($q) => $q->where('branch_id', $branchId))
            ->count();

        return response()->json([
            'data' => $results->items(),
            'meta' => [
                'total'        => $results->total(),
                'per_page'     => $results->perPage(),
                'current_page' => $results->currentPage(),
                'last_page'    => $results->lastPage(),
            ],
            'summary' => [
                'ffs_count'            => (int) ($allFFS->ffs_count    ?? 0),
                'hybrid_count'         => (int) ($allFFS->hybrid_count ?? 0),
                'total_pending_amount' => (float) $pendingAmount,
                'expiring_contracts'   => $expiringContracts,
            ],
        ]);
    }

    // GET /api/finance/ffs/spend-trend
    public function spendTrend(Request $request)
    {
        $branchId = $request->user()->branch_id;
        $isHQ     = $request->user()->hasRole(['hq_manager', 'ceo']);

        // Get 12 months of completed FFS batch totals - use provider_payments not payment_batch_items
        $ffsMonths = DB::table('payment_batches as b')
            ->join('provider_payments as pp', 'pp.batch_id', '=', 'b.id')
            ->join('health_care_providers as h', 'h.id', '=', 'pp.hcp_id')
            ->where('b.status', 'completed')
            ->whereIn('h.payment_model', ['fee_for_service', 'hybrid'])
            ->when(!$isHQ, fn($q) => $q->where('b.branch_id', $branchId))
            ->where('b.processed_at', '>=', now()->subMonths(12)->startOfMonth())
            ->select([
                DB::raw("DATE_FORMAT(b.processed_at, '%b %Y') as period"),
                DB::raw("DATE_FORMAT(b.processed_at, '%Y-%m') as sort_key"),
                DB::raw('SUM(pp.amount) as ffs_paid'),
            ])
            ->groupBy('period', 'sort_key')
            ->orderBy('sort_key')
            ->get()
            ->keyBy('period');

        // Get 12 months of paid capitation runs
        $capMonths = DB::table('capitation_runs')
            ->where('status', 'paid')
            ->when(!$isHQ, fn($q) => $q->where('branch_id', $branchId))
            ->where('updated_at', '>=', now()->subMonths(12)->startOfMonth())
            ->select([
                DB::raw("CONCAT(MONTHNAME(STR_TO_DATE(period_month, '%m')), ' ', period_year) as period"),
                DB::raw("CONCAT(period_year, '-', LPAD(period_month, 2, '0')) as sort_key"),
                DB::raw('SUM(total_amount) as capitation_paid'),
            ])
            ->groupBy('period', 'sort_key')
            ->orderBy('sort_key')
            ->get()
            ->keyBy('period');

        // Merge both into a single timeline
        $allPeriods = $ffsMonths->keys()->merge($capMonths->keys())->unique()->sort()->values();
        $trend = $allPeriods->map(fn($p) => [
            'period'          => $p,
            'ffs_paid'        => (float) ($ffsMonths->get($p)?->ffs_paid        ?? 0),
            'capitation_paid' => (float) ($capMonths->get($p)?->capitation_paid ?? 0),
        ]);

        return response()->json(['data' => $trend]);
    }

    // POST /api/finance/ffs/batch
    public function createBatch(Request $request)
    {
        $request->validate(['hcp_id' => 'required|exists:health_care_providers,id']);

        $hcp = HealthCareProvider::findOrFail($request->hcp_id);

        if (!in_array($hcp->payment_model, ['fee_for_service', 'hybrid'])) {
            return response()->json(['message' => 'This provider is not configured for FFS payments.'], 422);
        }

        // Find all approved, unbatched claims for this HCP
        $claims = Claim::where('hcp_id', $hcp->id)
            ->where('status', 'approved')
            ->whereDoesntHave('payment')
            ->get();

        if ($claims->isEmpty()) {
            return response()->json(['message' => 'No approved FFS claims to batch for this provider.'], 422);
        }

        $total = $claims->sum('total_amount_approved');

        $batch = PaymentBatch::create([
            'batch_number'   => PaymentBatch::generateUniqueId('FFS', 'batch_number', 4, 'NG'),
            'batch_type'     => 'ffs_claims',
            'status'         => 'draft',
            'total_amount'   => $total,
            'claim_count'    => $claims->count(),
            'provider_count' => 1,
            'branch_id'      => $request->user()->branch_id,
            'created_by'     => $request->user()->id,
            'description'    => "FFS claims for {$hcp->name} ({$hcp->hcp_code})",
        ]);

        // Create provider_payment records (same pattern as main batch flow)
        foreach ($claims as $claim) {
            ProviderPayment::create([
                'batch_id'  => $batch->id,
                'hcp_id'    => $claim->hcp_id,
                'claim_id'  => $claim->id,
                'amount'    => $claim->total_amount_approved,
                'status'    => 'pending',
            ]);
        }

        return response()->json([
            'message' => "FFS batch created with {$claims->count()} claims totalling ₦" . number_format($total, 2),
            'data'    => $batch->load(['payments.hcp', 'payments.claim']),
        ], 201);
    }
}