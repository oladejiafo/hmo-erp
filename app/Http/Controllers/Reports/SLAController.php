<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\SystemSetting;

/**
 * FILE LOCATION: app/Http/Controllers/Reports/SLAController.php
 *
 * SLA monitoring — how well the branch is meeting NHIS processing targets.
 *
 * SLA TARGETS (business days):
 *   emergency   → 2  days
 *   outpatient  → 5  days
 *   inpatient   → 10 days
 *   surgery     → 10 days
 *   maternity   → 10 days
 *   others      → 7  days
 *
 * ROUTES (add to routes/api.php under reports prefix):
 *   GET /reports/sla-dashboard   → dashboard()     permission: reports.branch
 *   GET /reports/overdue-claims  → overdueClaims() permission: reports.branch
 *   POST /reports/sla/breach-scan → scanBreaches() permission: reports.branch (manual trigger)
 */
class SLAController extends Controller
{
    /**
     * SLA target days per claim type.
     * Matches values stamped on claim.sla_target_days at submission.
     */
    // private array $slaTargets = [
    //     'emergency'  => 2,
    //     'outpatient' => 5,
    //     'inpatient'  => 10,
    //     'surgery'    => 10,
    //     'maternity'  => 10,
    //     'dental'     => 5,
    //     'optical'    => 5,
    //     'laboratory' => 5,
    //     'radiology'  => 7,
    //     'drug_refill'=> 5,
    // ];

    private function getSlaTargets(): array
    {
        return [
            'emergency'   => SystemSetting::get('sla.emergency',   2),
            'outpatient'  => SystemSetting::get('sla.outpatient',  5),
            'inpatient'   => SystemSetting::get('sla.inpatient',   10),
            'surgery'     => SystemSetting::get('sla.surgery',     10),
            'maternity'   => SystemSetting::get('sla.maternity',   10),
            'dental'      => SystemSetting::get('sla.dental',      5),
            'optical'     => SystemSetting::get('sla.optical',     5),
            'laboratory'  => SystemSetting::get('sla.laboratory',  5),
            'radiology'   => SystemSetting::get('sla.radiology',   7),
            'drug_refill' => SystemSetting::get('sla.drug_refill', 5),
        ];
    }

    /**
     * Get SLA target for a specific claim type
     */
    private function getSlaTarget(string $type, int $default = 5): int
    {
        return $this->getSlaTargets()[$type] ?? $default;
    }


    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD — KPIs and trend data for the SLA page
    // GET /reports/sla-dashboard
    // ─────────────────────────────────────────────────────────────────────────

    public function dashboard(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $user     = auth()->user();
        $isHQ     = $user->isHQ();
        $branchId = ! $isHQ ? $user->branch_id : ($request->branch_id ?: null);

        $base = $this->baseQuery($isHQ, $branchId);

        // ── KPI totals ────────────────────────────────────────────────────────
        $totalOpen     = (clone $base)->whereNotIn('status', ['paid', 'rejected', 'reversed'])->count();
        $breached      = (clone $base)->where('sla_breached', true)
                                      ->whereNotIn('status', ['paid', 'rejected', 'reversed'])->count();
        $atRisk        = (clone $base)->whereNotIn('status', ['paid', 'rejected', 'reversed'])
                                      ->where('sla_breached', false)
                                      ->where('sla_due_at', '<=', now()->addHours(24))->count();
        $resolvedThisMonth = (clone $base)->whereIn('status', ['paid', 'approved', 'rejected'])
                                           ->whereMonth('updated_at', now()->month)->count();

        // Compliance rate — % of claims resolved within SLA
        $resolvedInSLA = (clone $base)->whereIn('status', ['paid', 'approved', 'rejected'])
                                       ->where('sla_breached', false)
                                       ->whereMonth('updated_at', now()->month)->count();
        $complianceRate = $resolvedThisMonth > 0
            ? round(($resolvedInSLA / $resolvedThisMonth) * 100, 1)
            : null;

        // ── By claim type breakdown ───────────────────────────────────────────
        $byType = (clone $base)
            ->whereNotIn('status', ['paid', 'rejected', 'reversed'])
            ->selectRaw('
                claim_type,
                sla_target_days,
                COUNT(*) as total,
                SUM(CASE WHEN sla_breached = 1 THEN 1 ELSE 0 END) as breached,
                AVG(DATEDIFF(NOW(), created_at)) as avg_age_days
            ')
            ->groupBy('claim_type', 'sla_target_days')
            ->get()
            ->map(fn ($r) => [
                'claim_type'     => $r->claim_type,
                'sla_days'       => $r->sla_target_days,
                'total'          => $r->total,
                'breached'       => $r->breached,
                'on_track'       => $r->total - $r->breached,
                'breach_rate'    => $r->total > 0 ? round(($r->breached / $r->total) * 100, 1) : 0,
                'avg_age_days'   => round($r->avg_age_days ?? 0, 1),
            ]);

        // ── 12-week trend ─────────────────────────────────────────────────────
        $weeklyTrend = (clone $base)
            ->selectRaw('
                YEARWEEK(created_at, 1) as year_week,
                MIN(DATE(created_at)) as week_start,
                COUNT(*) as total_submitted,
                SUM(CASE WHEN sla_breached = 1 THEN 1 ELSE 0 END) as breached_count
            ')
            ->where('created_at', '>=', now()->subWeeks(12))
            ->groupBy('year_week')
            ->orderBy('year_week')
            ->get()
            ->map(fn ($r) => [
                'week'           => $r->week_start,
                'total'          => $r->total_submitted,
                'breached'       => $r->breached_count,
                'breach_rate'    => $r->total_submitted > 0
                    ? round(($r->breached_count / $r->total_submitted) * 100, 1)
                    : 0,
            ]);

        // ── Worst offenders — top 5 oldest open claims ────────────────────────
        $oldestOpen = (clone $base)
            ->with(['hcp:id,name,hcp_code', 'enrollee:id,first_name,last_name'])
            ->whereNotIn('status', ['paid', 'rejected', 'reversed'])
            ->selectRaw('*, DATEDIFF(NOW(), created_at) as age_days')
            ->orderByDesc('age_days')
            ->limit(5)
            ->get(['id', 'claim_number', 'claim_type', 'status', 'sla_target_days',
                   'sla_breached', 'sla_due_at', 'created_at', 'hcp_id', 'enrollee_id',
                   DB::raw('DATEDIFF(NOW(), created_at) as age_days')]);

        return response()->json([
            'data' => [
                'kpis' => [
                    'total_open'       => $totalOpen,
                    'breached'         => $breached,
                    'at_risk_24h'      => $atRisk,
                    'compliance_rate'  => $complianceRate,
                    'resolved_month'   => $resolvedThisMonth,
                ],
                'by_type'       => $byType,
                'weekly_trend'  => $weeklyTrend,
                'oldest_open'   => $oldestOpen,
                // 'sla_targets'   => $this->slaTargets, // was
                'sla_targets'   => $this->getSlaTargets(),

            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OVERDUE CLAIMS — paginated list of breached/at-risk claims
    // GET /reports/overdue-claims
    // ─────────────────────────────────────────────────────────────────────────

    public function overdueClaims(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $user     = auth()->user();
        $isHQ     = $user->isHQ();
        $branchId = ! $isHQ ? $user->branch_id : ($request->branch_id ?: null);

        $filter = $request->filter ?? 'breached'; // breached | at_risk | all_open

        $query = $this->baseQuery($isHQ, $branchId)
            ->with(['hcp:id,name,hcp_code', 'enrollee:id,first_name,last_name,enrollee_id'])
            ->whereNotIn('status', ['paid', 'rejected', 'reversed']);

        if ($filter === 'breached') {
            $query->where('sla_breached', true);
        } elseif ($filter === 'at_risk') {
            $query->where('sla_breached', false)
                  ->where('sla_due_at', '<=', now()->addHours(24));
        }

        $query->when($request->claim_type, fn ($q, $t) => $q->where('claim_type', $t))
              ->selectRaw('*, DATEDIFF(NOW(), created_at) as age_days')
              ->orderByDesc('age_days');

        $claims = $query->paginate($request->per_page ?? 25);

        return response()->json([
            'data' => $claims->map(fn ($c) => [
                'id'            => $c->id,
                'claim_number'  => $c->claim_number,
                'claim_type'    => $c->claim_type,
                'status'        => $c->status,
                'age_days'      => $c->age_days,
                'sla_target'    => $c->sla_target_days,
                'sla_due_at'    => $c->sla_due_at?->toDateString(),
                'sla_breached'  => (bool) $c->sla_breached,
                'days_over_sla' => $c->sla_breached ? max(0, $c->age_days - $c->sla_target_days) : 0,
                'risk_score'    => $c->risk_score,
                'hcp_name'      => $c->hcp?->name,
                'hcp_code'      => $c->hcp?->hcp_code,
                'enrollee_name' => $c->enrollee ? trim("{$c->enrollee->first_name} {$c->enrollee->last_name}") : null,
                'enrollee_id'   => $c->enrollee?->enrollee_id,
            ]),
            'meta' => [
                'current_page' => $claims->currentPage(),
                'last_page'    => $claims->lastPage(),
                'total'        => $claims->total(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BREACH SCAN — manually trigger SLA breach detection
    // POST /reports/sla/breach-scan
    // In production this runs via a scheduled Laravel command instead.
    // ─────────────────────────────────────────────────────────────────────────

    public function scanBreaches(): JsonResponse
    {
        $now = now();

        // Mark as breached: past sla_due_at, not yet resolved, not already flagged
        $updated = Claim::query()
            ->whereNotIn('status', ['paid', 'rejected', 'reversed'])
            ->where('sla_breached', false)
            ->where('sla_due_at', '<', $now)
            ->whereNotNull('sla_due_at')
            ->update([
                'sla_breached'    => true,
                'sla_breached_at' => $now,
            ]);

        return response()->json([
            'data'    => ['newly_breached' => $updated],
            'message' => "{$updated} claim(s) marked as SLA breached.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function baseQuery(bool $isHQ, ?int $branchId)
    {
        $query = $isHQ ? Claim::withoutGlobalScopes() : Claim::query();

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query;
    }
}