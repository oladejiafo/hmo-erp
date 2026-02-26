<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\HealthCareProvider;
use App\Models\GeneratedReport;
use App\Models\ReportSchedule;
use App\Services\NhiaReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ReportController extends Controller
{
    public function __construct(private NhiaReportService $service) {}

    // ─────────────────────────────────────────────────────────────────────────
    // EXISTING REPORT METHODS
    // ─────────────────────────────────────────────────────────────────────────

    public function claimsAging(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $query = auth()->user()->isHQ()
            ? Claim::withoutGlobalScopes()
            : Claim::query();

        // Bucket claims by how long they've been pending
        $aging = (clone $query)
            ->selectRaw("
                CASE
                    WHEN DATEDIFF(NOW(), submission_date) <= 7  THEN '0-7 days'
                    WHEN DATEDIFF(NOW(), submission_date) <= 14 THEN '8-14 days'
                    WHEN DATEDIFF(NOW(), submission_date) <= 30 THEN '15-30 days'
                    ELSE '30+ days'
                END as bucket,
                COUNT(*) as count,
                SUM(total_amount_claimed) as total_value,
                AVG(total_amount_claimed) as avg_value
            ")
            ->whereNotIn('status', ['paid', 'rejected', 'reversed'])
            ->groupBy('bucket')
            ->orderByRaw("MIN(DATEDIFF(NOW(), submission_date))")
            ->get();

        return response()->json(['data' => $aging]);
    }

    public function claimsByHcp(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $isHQ = auth()->user()->isHQ();

        $data = DB::table('claims')
            ->join('health_care_providers', 'claims.hcp_id', '=', 'health_care_providers.id')
            ->when(! $isHQ, fn ($q) => $q->where('claims.branch_id', Auth::user()->branch_id))
            ->when($request->date_from, fn ($q, $d) => $q->where('claims.service_date', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->where('claims.service_date', '<=', $d))
            ->select([
                'health_care_providers.id',
                'health_care_providers.name as hcp_name',
                'health_care_providers.type',
                DB::raw('COUNT(claims.id) as claim_count'),
                DB::raw('SUM(claims.total_amount_claimed) as total_claimed'),
                DB::raw('SUM(claims.total_amount_approved) as total_approved'),
                DB::raw('AVG(claims.risk_score) as avg_risk_score'),
                DB::raw('SUM(CASE WHEN claims.status = "rejected" THEN 1 ELSE 0 END) as rejected_count'),
            ])
            ->groupBy('health_care_providers.id', 'health_care_providers.name', 'health_care_providers.type')
            ->orderByDesc('claim_count')
            ->limit(50)
            ->get();

        return response()->json(['data' => $data]);
    }

    public function claimsByType(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $isHQ = auth()->user()->isHQ();

        $data = DB::table('claims')
            ->when(! $isHQ, fn ($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->when($request->year, fn ($q, $y) => $q->whereYear('service_date', $y))
            ->select([
                'claim_type',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total_amount_claimed) as total_value'),
                DB::raw('AVG(risk_score) as avg_risk'),
            ])
            ->groupBy('claim_type')
            ->orderByDesc('count')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function costByCorporate(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $isHQ = auth()->user()->isHQ();

        $data = DB::table('claims')
            ->join('enrollees', 'claims.enrollee_id', '=', 'enrollees.id')
            ->join('corporates', 'enrollees.corporate_id', '=', 'corporates.id')
            ->when(! $isHQ, fn ($q) => $q->where('claims.branch_id', Auth::user()->branch_id))
            ->when($request->year, fn ($q, $y) => $q->whereYear('claims.service_date', $y))
            ->select([
                'corporates.id',
                'corporates.name as corporate_name',
                'corporates.code as corporate_code',
                DB::raw('COUNT(claims.id) as claim_count'),
                DB::raw('COUNT(DISTINCT claims.enrollee_id) as unique_enrollees'),
                DB::raw('SUM(claims.total_amount_claimed) as total_claimed'),
                DB::raw('SUM(claims.total_amount_paid) as total_paid'),
                DB::raw('AVG(claims.total_amount_claimed) as avg_claim_value'),
            ])
            ->whereNotIn('claims.status', ['rejected', 'reversed'])
            ->groupBy('corporates.id', 'corporates.name', 'corporates.code')
            ->orderByDesc('total_claimed')
            ->limit(30)
            ->get();

        return response()->json(['data' => $data]);
    }

    public function highCostEnrollees(Request $request): JsonResponse
    {
        $threshold = config('fraud.high_cost_enrollee_threshold', 2000000);
        /** @disregard P1013 */
        $isHQ      = auth()->user()->isHQ();
        $year      = $request->year ?? now()->year;

        $data = DB::table('claims')
            ->join('enrollees', 'claims.enrollee_id', '=', 'enrollees.id')
            ->join('corporates', 'enrollees.corporate_id', '=', 'corporates.id')
            ->when(! $isHQ, fn ($q) => $q->where('claims.branch_id', Auth::user()->branch_id))
            ->whereYear('claims.service_date', $year)
            ->whereNotIn('claims.status', ['rejected', 'reversed'])
            ->select([
                'enrollees.id',
                'enrollees.enrollee_id',
                DB::raw("CONCAT(enrollees.first_name, ' ', enrollees.last_name) as enrollee_name"),
                'corporates.name as corporate_name',
                DB::raw('COUNT(claims.id) as claim_count'),
                DB::raw('SUM(claims.total_amount_claimed) as total_claimed'),
                DB::raw('AVG(claims.risk_score) as avg_risk_score'),
            ])
            ->groupBy('enrollees.id', 'enrollees.enrollee_id', 'enrollees.first_name', 'enrollees.last_name', 'corporates.name')
            ->havingRaw('SUM(claims.total_amount_claimed) >= ?', [$threshold * 0.7])
            ->orderByDesc('total_claimed')
            ->limit(25)
            ->get();

        return response()->json([
            'data'      => $data,
            'threshold' => $threshold,
            'year'      => $year,
        ]);
    }

    public function hcpPerformance(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $isHQ = auth()->user()->isHQ();

        $data = DB::table('health_care_providers')
            ->leftJoin('claims', function ($j) {
                $j->on('claims.hcp_id', '=', 'health_care_providers.id')
                  ->whereNotIn('claims.status', ['rejected', 'reversed']);
            })
            ->leftJoin('fraud_flags', 'fraud_flags.hcp_id', '=', 'health_care_providers.id')
            ->when(! $isHQ, fn ($q) => $q->where('health_care_providers.branch_id', Auth::user()->branch_id))
            ->select([
                'health_care_providers.id',
                'health_care_providers.name',
                'health_care_providers.type',
                'health_care_providers.tier',
                'health_care_providers.performance_score',
                DB::raw('COUNT(DISTINCT claims.id) as total_claims'),
                DB::raw('SUM(CASE WHEN claims.status = "paid" THEN 1 ELSE 0 END) as paid_claims'),
                DB::raw('COUNT(DISTINCT fraud_flags.id) as fraud_flags_count'),
                DB::raw('SUM(claims.total_amount_claimed) as total_billed'),
                DB::raw('SUM(claims.total_amount_paid) as total_paid'),
            ])
            ->groupBy('health_care_providers.id', 'health_care_providers.name',
                      'health_care_providers.type', 'health_care_providers.tier',
                      'health_care_providers.performance_score')
            ->orderByDesc('total_claims')
            ->limit(30)
            ->get();

        return response()->json(['data' => $data]);
    }

    public function branchComparison(Request $request): JsonResponse
    {
        // HQ only — enforced by route middleware
        $year = $request->year ?? now()->year;

        $data = DB::table('branches')
            ->leftJoin('claims', fn ($j) => $j->on('claims.branch_id', '=', 'branches.id')
                ->whereYear('claims.service_date', $year))
            ->leftJoin('enrollees', 'enrollees.branch_id', '=', 'branches.id')
            ->leftJoin('corporates', 'corporates.branch_id', '=', 'branches.id')
            ->select([
                'branches.id',
                'branches.name',
                'branches.code',
                'branches.type',
                DB::raw('COUNT(DISTINCT enrollees.id) as total_enrollees'),
                DB::raw('COUNT(DISTINCT corporates.id) as total_corporates'),
                DB::raw('COUNT(DISTINCT claims.id) as total_claims'),
                DB::raw('SUM(claims.total_amount_claimed) as total_claimed'),
                DB::raw('SUM(claims.total_amount_paid) as total_paid'),
                DB::raw('AVG(claims.risk_score) as avg_risk_score'),
            ])
            ->groupBy('branches.id', 'branches.name', 'branches.code', 'branches.type')
            ->orderByDesc('total_claims')
            ->get();

        return response()->json(['data' => $data, 'year' => $year]);
    }

    public function fraudHeatmap(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $isHQ = auth()->user()->isHQ();

        $data = DB::table('fraud_flags')
            ->join('claims', 'fraud_flags.claim_id', '=', 'claims.id')
            ->join('health_care_providers', 'fraud_flags.hcp_id', '=', 'health_care_providers.id')
            ->when(! $isHQ, fn ($q) => $q->where('claims.branch_id', Auth::user()->branch_id))
            ->when($request->date_from, fn ($q, $d) => $q->where('fraud_flags.created_at', '>=', $d))
            ->select([
                'health_care_providers.id as hcp_id',
                'health_care_providers.name as hcp_name',
                'health_care_providers.state',
                'fraud_flags.flag_type',
                DB::raw('COUNT(*) as flag_count'),
                DB::raw('AVG(fraud_flags.flag_score) as avg_score'),
                DB::raw('SUM(claims.total_amount_claimed) as total_at_risk'),
            ])
            ->groupBy('health_care_providers.id', 'health_care_providers.name',
                      'health_care_providers.state', 'fraud_flags.flag_type')
            ->orderByDesc('flag_count')
            ->get();

        return response()->json(['data' => $data]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEW GENERATED REPORTS FUNCTIONALITY
    // ─────────────────────────────────────────────────────────────────────────

    // List generated reports
    public function index(Request $request): JsonResponse
    {
        $reports = GeneratedReport::with('generatedBy:id,name','hcp:id,name','corporate:id,name')
            ->when($request->report_type, fn($q,$v) => $q->where('report_type',$v))
            ->when($request->status,      fn($q,$v) => $q->where('status',$v))
            ->when($request->period,      fn($q,$v) => $q->where('period',$v))
            ->latest()
            ->paginate(25);

        return response()->json([
            'data' => $reports->items(),
            'meta' => ['current_page'=>$reports->currentPage(),'last_page'=>$reports->lastPage(),'total'=>$reports->total()],
        ]);
    }

    // Trigger a report manually
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'report_type'      => ['required', 'in:' . implode(',', array_keys(GeneratedReport::TYPE_LABELS))],
            'period'           => ['required', 'string'],  // "2025-06" | "2025-Q2" | "2025"
            'format'           => ['in:xlsx,pdf,both'],
            'hcp_id'           => ['nullable', 'exists:health_care_providers,id'],
            'corporate_id'     => ['nullable', 'exists:corporates,id'],
            'payment_batch_id' => ['nullable', 'exists:payment_batches,id'],
            'config'           => ['nullable', 'array'],   // custom overrides
        ]);

        [$start, $end] = $this->parsePeriod($request->period, $request->report_type);

        $report = GeneratedReport::create([
            'generated_by'    => Auth::id(),
            'report_type'     => $request->report_type,
            'period'          => $request->period,
            'period_start'    => $start,
            'period_end'      => $end,
            'hcp_id'          => $request->hcp_id,
            'corporate_id'    => $request->corporate_id,
            'payment_batch_id'=> $request->payment_batch_id,
            'format'          => $request->format ?? 'xlsx',
            'config'          => $request->config,
            'status'          => 'queued',
        ]);

        // Generate synchronously for now — queue for async in production
        try {
            $this->service->generate($report);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Report generation failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Report generated successfully.',
            'data'    => $report->fresh()->append(['download_url_xlsx', 'download_url_pdf']),
        ], 201);
    }

    // Download a report file
    public function download(GeneratedReport $report, string $format = 'xlsx'): mixed
    {
        $path = $format === 'pdf' ? $report->file_path_pdf : $report->file_path_xlsx;

        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $filename = basename($path);
        /** @disregard P1013 */
        return Storage::disk('local')->download($path, $filename);
    }

    // Get/update report schedules
    public function schedules(): JsonResponse
    {
        $schedules = DB::table('report_schedules')->get();
        return response()->json(['data' => $schedules]);
    }

    public function updateSchedule(Request $request, string $reportType): JsonResponse
    {
        $request->validate([
            'enabled'      => ['boolean'],
            'day_of_month' => ['integer','min:1','max:28'],
            'format'       => ['in:xlsx,pdf,both'],
            'config'       => ['nullable','array'],
        ]);

        DB::table('report_schedules')->updateOrInsert(
            ['report_type' => $reportType],
            array_merge($request->only(['enabled','day_of_month','format','config']), ['updated_at' => now()])
        );

        return response()->json(['message' => 'Schedule updated.']);
    }

    // Summary stats for dashboard
    public function summary(): JsonResponse
    {
        return response()->json(['data' => [
            'total_reports'   => GeneratedReport::count(),
            'ready_reports'   => GeneratedReport::where('status','ready')->count(),
            'failed_reports'  => GeneratedReport::where('status','failed')->count(),
            'last_generated'  => GeneratedReport::where('status','ready')->latest('generated_at')->value('generated_at'),
            'by_type'         => GeneratedReport::where('status','ready')
                ->selectRaw('report_type, count(*) as count')
                ->groupBy('report_type')->pluck('count','report_type'),
        ]]);
    }

    // Original export method (keep for backwards compatibility)
    public function export(Request $request): JsonResponse
    {
        // TODO: Implement async Excel export using queue job
        // Placeholder — returns 202 Accepted
        return response()->json([
            'message' => 'Export queued. You will be notified when ready.',
        ], 202);
    }

    private function parsePeriod(string $period, string $reportType): array
    {
        // Monthly: "2025-06"
        if (preg_match('/^\d{4}-\d{2}$/', $period)) {
            $date = Carbon::createFromFormat('Y-m', $period);
            return [$date->startOfMonth()->format('Y-m-d'), $date->endOfMonth()->format('Y-m-d')];
        }
        // Quarterly: "2025-Q2"
        if (preg_match('/^(\d{4})-Q([1-4])$/', $period, $m)) {
            $qStart = Carbon::create($m[1], ($m[2]-1)*3+1, 1);
            return [$qStart->format('Y-m-d'), $qStart->endOfQuarter()->format('Y-m-d')];
        }
        // Annual: "2025"
        if (preg_match('/^\d{4}$/', $period)) {
            return ["{$period}-01-01", "{$period}-12-31"];
        }
        throw new \InvalidArgumentException("Invalid period format: {$period}");
    }
}