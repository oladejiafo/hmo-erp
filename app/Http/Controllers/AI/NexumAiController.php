<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\FraudFlag;
use App\Models\HealthCareProvider;
use App\Models\LedgerEntry;
use App\Models\ProviderPayment;
use App\Services\G8InternalAiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * NexumAiController
 *
 * Handles G8.AI-powered features for G8 Nexum Health.
 * Sits alongside the existing AIController (which uses the local AIService).
 *
 * Branch isolation is enforced automatically via the BelongsToBranch
 * global scope on all models — no manual branch_id filtering needed.
 *
 * Routes live in routes/api.php under:
 *   GET  /ai/claims-anomaly/{hcp}
 *   GET  /ai/provider-summary/{hcp}
 *   POST /ai/enrollee-response
 *   GET  /ai/dashboard-digest
 *   GET  /ai/claim-risk/{claim}
 */
class NexumAiController extends Controller
{
    public function __construct(protected G8InternalAiService $ai) {}

    // ══════════════════════════════════════════════════════════════
    //  1. CLAIMS ANOMALY DETECTION
    //  GET /ai/claims-anomaly/{hcp}
    // ══════════════════════════════════════════════════════════════

    /**
     * Analyse a provider's claims submission for anomalies.
     *
     * Query params:
     *   period  — e.g. "2025-Q1" | "2025-01" | "2025" (defaults to current quarter)
     *
     * Response:
     * {
     *   "success": true,
     *   "summary": "Dr. Osei's clinic submitted 23% more claims than average...",
     *   "insights": ["Unusual spike in malaria diagnoses in February", "..."],
     *   "stats": { total_claims, total_value, rejection_rate, approval_rate, avg_claim_value }
     * }
     */
    public function claimsAnomaly(Request $request, HealthCareProvider $hcp): JsonResponse
    {
        $period = $request->input('period', $this->currentPeriod());
        [$startDate, $endDate] = $this->periodToDates($period);

        // Branch scope is automatic via global scope
        $claims = Claim::where('hcp_id', $hcp->id)
            ->whereBetween('service_date', [$startDate, $endDate])
            ->selectRaw('
                COUNT(*)                                    AS total_claims,
                SUM(total_amount_claimed)                   AS total_value,
                AVG(total_amount_claimed)                   AS avg_claim_value,
                SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END)  AS approved_count,
                SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END)  AS rejected_count,
                SUM(CASE WHEN status = "flagged"  THEN 1 ELSE 0 END)  AS flagged_count,
                AVG(risk_score)                             AS avg_risk_score
            ')
            ->first();

        // Top procedure/service categories claimed
        $topProcedures = Claim::where('hcp_id', $hcp->id)
            ->whereBetween('service_date', [$startDate, $endDate])
            ->join('claim_items', 'claims.id', '=', 'claim_items.claim_id')
            ->selectRaw('claim_items.category, COUNT(*) AS count')
            ->groupBy('claim_items.category')
            ->orderByDesc('count')
            ->limit(5)
            ->pluck('claim_items.category')
            ->toArray();

        // Open fraud flags for this provider in the period
        $fraudFlagCount = FraudFlag::whereHas('claim', fn ($q) =>
            $q->where('hcp_id', $hcp->id)
              ->whereBetween('service_date', [$startDate, $endDate])
        )->count();

        $total      = (int)   ($claims->total_claims   ?? 0);
        $approved   = (int)   ($claims->approved_count ?? 0);
        $rejected   = (int)   ($claims->rejected_count ?? 0);
        $totalValue = (float) ($claims->total_value    ?? 0);

        $result = $this->ai->withoutCache()->nexumClaimsAnomaly([
            'provider_name'    => $hcp->name,
            'provider_type'    => $hcp->type,
            'provider_tier'    => $hcp->tier,
            'submission_period'=> $period,
            'total_claims'     => $total,
            'total_value'      => $totalValue,
            'avg_claim_value'  => $total > 0 ? round($totalValue / $total, 2) : 0,
            'rejection_rate'   => $total > 0 ? round($rejected / $total, 4) : 0,
            'approval_rate'    => $total > 0 ? round($approved / $total, 4) : 0,
            'flagged_count'    => (int) ($claims->flagged_count ?? 0),
            'fraud_flag_count' => $fraudFlagCount,
            'avg_risk_score'   => round((float) ($claims->avg_risk_score ?? 0), 2),
            'top_procedures'   => $topProcedures,
        ]);

        if (!$result) {
            return $this->aiUnavailable();
        }

        return response()->json([
            'success'  => true,
            'summary'  => $result['summary']  ?? '',
            'insights' => $result['insights'] ?? [],
            'stats'    => [
                'period'         => $period,
                'total_claims'   => $total,
                'total_value'    => $totalValue,
                'rejection_rate' => $total > 0 ? round($rejected / $total * 100, 1) . '%' : '0%',
                'approval_rate'  => $total > 0 ? round($approved / $total * 100, 1) . '%' : '0%',
                'avg_claim_value'=> $total > 0 ? round($totalValue / $total, 2) : 0,
                'fraud_flags'    => $fraudFlagCount,
            ],
            'hcp' => [
                'id'   => $hcp->id,
                'name' => $hcp->name,
                'type' => $hcp->type,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  2. PROVIDER PERFORMANCE SUMMARY
    //  GET /ai/provider-summary/{hcp}
    // ══════════════════════════════════════════════════════════════

    /**
     * Generate a narrative performance summary for a provider.
     *
     * Response:
     * {
     *   "success": true,
     *   "summary": "Lagos General performed well in Q1...",
     *   "insights": ["Approval rate improved 12% vs previous quarter", "..."],
     *   "stats": { ... }
     * } 
     */
    public function providerSummary(Request $request, HealthCareProvider $hcp): JsonResponse
    {
        $period = $request->input('period', $this->currentPeriod());
        [$startDate, $endDate] = $this->periodToDates($period);
        [$prevStart, $prevEnd] = $this->previousPeriodDates($startDate, $endDate);

        // Current period stats
        $current = $this->providerStats($hcp->id, $startDate, $endDate);

        // Previous period stats for comparison
        $previous = $this->providerStats($hcp->id, $prevStart, $prevEnd);

        // Days to payment average (from claim approval to payment)
        $avgDaysToPayment = ProviderPayment::where('hcp_id', $hcp->id)
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$startDate, $endDate])
            ->selectRaw('AVG(DATEDIFF(paid_at, created_at)) AS avg_days')
            ->value('avg_days');

        $result = $this->ai->withCache(3600)->nexumProviderSummary([
            'provider_name'        => $hcp->name,
            'provider_type'        => $hcp->type,
            'provider_tier'        => $hcp->tier,
            'period'               => $period,
            'total_claims'         => $current['total_claims'],
            'approval_rate'        => $current['approval_rate'],
            'rejection_rate'       => $current['rejection_rate'],
            'total_approved_value' => $current['total_approved_value'],
            'avg_days_to_payment'  => $avgDaysToPayment ? round($avgDaysToPayment, 1) : null,
            'prev_approval_rate'   => $previous['approval_rate'],
            'prev_total_claims'    => $previous['total_claims'],
            'flagged_submissions'  => $current['flagged_count'],
            'top_procedures'       => $current['top_procedures'],
        ]);

        if (!$result) {
            return $this->aiUnavailable();
        }

        return response()->json([
            'success'  => true,
            'summary'  => $result['summary']  ?? '',
            'insights' => $result['insights'] ?? [],
            'stats'    => array_merge($current, [
                'period'              => $period,
                'avg_days_to_payment' => $avgDaysToPayment ? round($avgDaysToPayment, 1) : null,
            ]),
            'hcp' => [
                'id'   => $hcp->id,
                'name' => $hcp->name,
                'type' => $hcp->type,
                'tier' => $hcp->tier,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  3. ENROLLEE RESPONSE DRAFTER
    //  POST /ai/enrollee-response
    // ══════════════════════════════════════════════════════════════

    /**
     * Draft a professional response to an enrollee inquiry.
     *
     * Request body:
     * {
     *   "enrollee_id": 45,
     *   "inquiry_text": "My claim was rejected and I don't understand why...",
     *   "inquiry_type": "claim_rejection"   // optional hint
     * }
     *
     * Response:
     * {
     *   "success": true,
     *   "response": "Dear Amina, thank you for reaching out...",
     *   "enrollee": { name, plan, corporate }
     * }
     */
    public function enrolleeResponse(Request $request): JsonResponse
    {
        $request->validate([
            'enrollee_id'  => ['required', 'integer', 'exists:enrollees,id'],
            'inquiry_text' => ['required', 'string', 'min:10', 'max:2000'],
            'inquiry_type' => ['sometimes', 'nullable', 'string'],
        ]);

        $enrollee = Enrollee::with(['plan', 'corporate'])
            ->findOrFail($request->enrollee_id);

        $content = $this->ai->withoutCache()->nexumEnrolleeResponse([
            'enrollee_name'  => trim("{$enrollee->first_name} {$enrollee->last_name}"),
            'plan_name'      => $enrollee->plan?->name    ?? 'Standard Plan',
            'corporate_name' => $enrollee->corporate?->name ?? '',
            'hmo_name'       => config('app.hmo_name', 'G8 Nexum Health'),
            'inquiry_text'   => $request->inquiry_text,
            'inquiry_type'   => $request->input('inquiry_type', 'general'),
        ]);

        if (empty($content)) {
            return $this->aiUnavailable();
        }

        return response()->json([
            'success'  => true,
            'response' => $content,
            'enrollee' => [
                'id'        => $enrollee->id,
                'name'      => trim("{$enrollee->first_name} {$enrollee->last_name}"),
                'plan'      => $enrollee->plan?->name,
                'corporate' => $enrollee->corporate?->name,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  4. DASHBOARD DIGEST
    //  GET /ai/dashboard-digest
    // ══════════════════════════════════════════════════════════════

    /**
     * Generate a plain-language digest for the claims dashboard.
     * Called on page load or via a "Refresh Digest" button.
     *
     * Response:
     * {
     *   "success": true,
     *   "digest": "This week has been busy — 47 new claims submitted...",
     *   "stats": { ... }
     * }
     */
    public function dashboardDigest(): JsonResponse
    {
        // Branch scope is automatic
        $thisWeekClaims  = Claim::where('submission_date', '>=', now()->startOfWeek())->count();
        $pendingClaims   = Claim::whereIn('status', ['submitted', 'auto_validated', 'under_review'])->count();
        $approvedThisWeek = Claim::where('status', 'approved')
            ->where('updated_at', '>=', now()->startOfWeek())
            ->count();
        $approvedValueThisWeek = Claim::where('status', 'approved')
            ->where('updated_at', '>=', now()->startOfWeek())
            ->sum('total_amount_approved');
        $highRiskOpen    = Claim::whereIn('status', ['submitted', 'under_review', 'flagged'])
            ->where('risk_score', '>=', 70)
            ->count();
        $openFraudFlags  = FraudFlag::where('status', 'open')->count();
        $activeEnrollees = Enrollee::where('status', 'active')->count();

        $digest = $this->ai->withCache(1800)->nexumDashboardDigest([
            'day_of_week'             => now()->format('l'),
            'this_week_claims'        => $thisWeekClaims,
            'pending_claims'          => $pendingClaims,
            'approved_this_week'      => $approvedThisWeek,
            'approved_value_this_week'=> $approvedValueThisWeek,
            'high_risk_open'          => $highRiskOpen,
            'open_fraud_flags'        => $openFraudFlags,
            'active_enrollees'        => $activeEnrollees,
        ]);

        if (empty($digest)) {
            return $this->aiUnavailable();
        }

        return response()->json([
            'success' => true,
            'digest'  => $digest,
            'stats'   => [
                'this_week_claims'  => $thisWeekClaims,
                'pending_claims'    => $pendingClaims,
                'approved_this_week'=> $approvedThisWeek,
                'high_risk_open'    => $highRiskOpen,
                'open_fraud_flags'  => $openFraudFlags,
            ],
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    //  5. CLAIM RISK SCORE (G8.AI enhanced — supplements existing local risk)
    //  GET /ai/claim-risk/{claim}
    // ══════════════════════════════════════════════════════════════

    /**
     * Score the fraud risk of a specific claim using G8.AI narrative reasoning.
     * Complements the existing local risk_score on the Claim model.
     *
     * Response:
     * {
     *   "success": true,
     *   "score": 78,
     *   "label": "high",
     *   "reasons": ["Claim value 3x provider average", "..."],
     *   "suggestions": ["Flag for manual review", "Request supporting documents"]
     * }
     */
    public function claimRisk(Claim $claim): JsonResponse
    {
        $claim->load(['hcp', 'enrollee', 'items', 'openFraudFlags']);

        $hcpAvg = Claim::where('hcp_id', $claim->hcp_id)
            ->where('status', 'approved')
            ->avg('total_amount_approved') ?? 0;

        $enrolleeClaimsCount = Claim::where('enrollee_id', $claim->enrollee_id)
            ->where('service_date', '>=', now()->subMonths(6))
            ->count();

        $result = $this->ai->withoutCache()->nexumClaimRisk([
            'claim_number'        => $claim->claim_number,
            'claim_type'          => $claim->claim_type,
            'claim_value'         => (float) $claim->total_amount_claimed,
            'local_risk_score'    => $claim->risk_score ?? 0,
            'hcp_name'            => $claim->hcp?->name,
            'hcp_type'            => $claim->hcp?->type,
            'hcp_tier'            => $claim->hcp?->tier,
            'hcp_avg_claim_value' => round((float) $hcpAvg, 2),
            'enrollee_claims_6mo' => $enrolleeClaimsCount,
            'open_fraud_flags'    => $claim->openFraudFlags->count(),
            'item_count'          => $claim->items->count(),
            'item_categories'     => $claim->items->pluck('category')->unique()->values()->toArray(),
            'has_preauth'         => !empty($claim->pa_status),
        ]);

        if (!$result) {
            return $this->aiUnavailable();
        }

        return response()->json([
            'success'     => true,
            'score'       => $result['score']       ?? 0,
            'label'       => $result['label']        ?? 'unknown',
            'reasons'     => $result['reasons']      ?? [],
            'suggestions' => $result['suggestions']  ?? [],
            'claim_id'    => $claim->id,
            'claim_number'=> $claim->claim_number,
            'local_score' => $claim->risk_score,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    private function providerStats(int $hcpId, string $startDate, string $endDate): array
    {
        $stats = Claim::where('hcp_id', $hcpId)
            ->whereBetween('service_date', [$startDate, $endDate])
            ->selectRaw('
                COUNT(*)                                               AS total_claims,
                SUM(total_amount_claimed)                              AS total_claimed_value,
                SUM(total_amount_approved)                             AS total_approved_value,
                SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END)  AS approved_count,
                SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END)  AS rejected_count,
                SUM(CASE WHEN status = "flagged"  THEN 1 ELSE 0 END)  AS flagged_count
            ')
            ->first();

        $total    = (int) ($stats->total_claims   ?? 0);
        $approved = (int) ($stats->approved_count ?? 0);
        $rejected = (int) ($stats->rejected_count ?? 0);

        $topProcedures = Claim::where('hcp_id', $hcpId)
            ->whereBetween('service_date', [$startDate, $endDate])
            ->join('claim_items', 'claims.id', '=', 'claim_items.claim_id')
            ->selectRaw('claim_items.category, COUNT(*) AS count')
            ->groupBy('claim_items.category')
            ->orderByDesc('count')
            ->limit(5)
            ->pluck('claim_items.category')
            ->toArray();

        return [
            'total_claims'         => $total,
            'total_claimed_value'  => (float) ($stats->total_claimed_value  ?? 0),
            'total_approved_value' => (float) ($stats->total_approved_value ?? 0),
            'approval_rate'        => $total > 0 ? round($approved / $total, 4) : 0,
            'rejection_rate'       => $total > 0 ? round($rejected / $total, 4) : 0,
            'flagged_count'        => (int) ($stats->flagged_count ?? 0),
            'top_procedures'       => $topProcedures,
        ];
    }

    private function currentPeriod(): string
    {
        $q = (int) ceil(now()->month / 3);
        return now()->year . '-Q' . $q;
    }

    private function periodToDates(string $period): array
    {
        if (preg_match('/^(\d{4})-Q([1-4])$/', $period, $m)) {
            $startMonth = ($m[2] - 1) * 3 + 1;
            $start = Carbon::create($m[1], $startMonth, 1)->startOfMonth();
            $end   = $start->copy()->addMonths(3)->subDay()->endOfMonth();
            return [$start->toDateString(), $end->toDateString()];
        }

        if (preg_match('/^(\d{4})-(\d{2})$/', $period, $m)) {
            $start = Carbon::create($m[1], $m[2], 1)->startOfMonth();
            return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
        }

        return $this->periodToDates($this->currentPeriod());
    }

    private function previousPeriodDates(string $startDate, string $endDate): array
    {
        $start = Carbon::parse($startDate);
        $days  = $start->diffInDays(Carbon::parse($endDate)) + 1;
        $prevEnd   = $start->copy()->subDay();
        $prevStart = $prevEnd->copy()->subDays($days - 1);
        return [$prevStart->toDateString(), $prevEnd->toDateString()];
    }

    private function aiUnavailable(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error'   => [
                'code'    => 'AI_UNAVAILABLE',
                'message' => 'AI service is temporarily unavailable.',
            ],
        ], 503);
    }
}