<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\CapitationRecord;
use App\Models\CapitationRun;
use App\Models\HcpCapitationRate;
use App\Models\HealthCareProvider;
use App\Models\Enrollee;
use App\Models\Dependent;
use App\Models\PaymentBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * FILE LOCATION: app/Http/Controllers/Finance/CapitationController.php
 *
 * Manages the full capitation lifecycle:
 *   generate() → show() → adjustRecord() → approve() → (payment batch flows)
 *
 * Routes (add to routes/api.php inside finance prefix group):
 *
 *   Route::prefix('capitation')->middleware('permission:finance.capitation')->group(function () {
 *       Route::get('/',                              [CapitationController::class, 'index']);
 *       Route::post('/generate',                    [CapitationController::class, 'generate']);
 *       Route::get('/summary',                      [CapitationController::class, 'summary']);
 *       Route::get('/{run}',                        [CapitationController::class, 'show']);
 *       Route::post('/{run}/approve',               [CapitationController::class, 'approve']);
 *       Route::patch('/{run}/records/{record}',     [CapitationController::class, 'adjustRecord']);
 *       Route::get('/rates',                        [CapitationController::class, 'rateIndex']);
 *       Route::post('/rates',                       [CapitationController::class, 'rateStore']);
 *   });
 */
class CapitationController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // INDEX — list runs for this branch
    // GET /finance/capitation
    // ─────────────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $branchId = Auth::user()->branch_id;

        $runs = CapitationRun::forBranch($branchId)
            ->with([
                'generatedBy:id,name',
                'approvedBy:id,name',
                'paymentBatch:id,batch_number,status',
            ])
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => $runs->map(fn ($r) => $this->formatRun($r)),
            'meta' => [
                'current_page' => $runs->currentPage(),
                'last_page'    => $runs->lastPage(),
                'total'        => $runs->total(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY — KPI cards for the capitation list page
    // GET /finance/capitation/summary
    // ─────────────────────────────────────────────────────────────────────────

    public function summary(): JsonResponse
    {
        $branchId = Auth::user()->branch_id;

        // Current month run (if exists)
        $now = Carbon::now();
        $currentRun = CapitationRun::forBranch($branchId)
            ->where('period_month', $now->month)
            ->where('period_year', $now->year)
            ->first();

        // YTD total paid
        $ytdPaid = CapitationRun::forBranch($branchId)
            ->where('status', 'paid')
            ->where('period_year', $now->year)
            ->sum('total_amount');

        // Total HCPs with active rates in this branch
        $hcpWithRates = HcpCapitationRate::forBranch($branchId)->activeOn()->count();

        // Active enrolled members (principals + dependants)
        $principalCount = Enrollee::where('branch_id', $branchId)
            ->where('status', 'active')
            ->whereNotNull('primary_hcp_id')
            ->count();
        $dependentCount = Dependent::where('status', 'active')
            ->whereHas('enrollee', fn ($q) =>
                $q->where('branch_id', $branchId)
                  ->where('status', 'active')
                  ->whereNotNull('primary_hcp_id')
            )
            ->count();

        // Pending approval runs
        $pendingCount = CapitationRun::forBranch($branchId)->draft()->count();

        return response()->json([
            'data' => [
                'current_run_status'    => $currentRun?->status,
                'current_run_amount'    => $currentRun?->total_amount ?? 0,
                'current_run_period'    => $currentRun?->period_label,
                'ytd_paid_amount'       => $ytdPaid,
                'hcp_with_rates_count'  => $hcpWithRates,
                'active_principal_count'=> $principalCount,
                'active_dependent_count'=> $dependentCount,
                'total_active_members'  => $principalCount + $dependentCount,
                'pending_runs_count'    => $pendingCount,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE — snapshot headcount and create a draft run
    // POST /finance/capitation/generate
    // ─────────────────────────────────────────────────────────────────────────

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period_month' => ['required', 'integer', 'min:1', 'max:12'],
            'period_year'  => ['required', 'integer', 'min:2020', 'max:2099'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ]);

        $branchId = Auth::user()->branch_id;
        $month    = $validated['period_month'];
        $year     = $validated['period_year'];

        // Prevent duplicate runs
        if (CapitationRun::existsForPeriod($branchId, $month, $year)) {
            return response()->json([
                'message' => "A capitation run already exists for {$month}/{$year}. Delete or edit the existing draft.",
            ], 422);
        }

        // Get all HCPs in this branch that have an active capitation rate AND are not FFS-only
        $periodDate = Carbon::createFromDate($year, $month, 1)->endOfMonth();
        $rates = HcpCapitationRate::forBranch($branchId)
            ->activeOn($periodDate)
            ->with(['hcp:id,name,tier,status,payment_model'])
            ->get()
            ->keyBy('hcp_id')
            ->filter(function ($rate) {
                // If payment_model is null (existing records), treat as capitation
                $paymentModel = $rate->hcp->payment_model ?? 'capitation';
                return $paymentModel !== 'fee_for_service';
            });
            

        // $periodDate = Carbon::createFromDate($year, $month, 1)->endOfMonth();
        // $rates      = HcpCapitationRate::forBranch($branchId)
        //     ->activeOn($periodDate)
        //     ->with('hcp:id,name,tier,status')
        //     ->get()
        //     ->keyBy('hcp_id');

        if ($rates->isEmpty()) {
            return response()->json([
                'message' => 'No HCPs have active capitation rates set for this branch. Set rates first under Capitation → Rates.',
            ], 422);
        }

        // Get previous run for variance calculation
        $tempRun = new CapitationRun([
            'branch_id'    => $branchId,
            'period_month' => $month,
            'period_year'  => $year,
        ]);
        $prevRun        = $tempRun->previousRun();
        $prevRecords    = $prevRun
            ? $prevRun->records()->get()->keyBy('hcp_id')
            : collect();

        $run = DB::transaction(function () use (
            $branchId, $month, $year, $rates, $prevRecords, $validated
        ) {
            // Create the run header
            $run = CapitationRun::create([
                'branch_id'       => $branchId,
                'period_month'    => $month,
                'period_year'     => $year,
                'status'          => 'draft',
                'generated_by_id' => Auth::id(),
                'notes'           => $validated['notes'] ?? null,
            ]);

            $records = [];

            foreach ($rates as $hcpId => $rate) {
                $hcp = $rate->hcp;
                if (! $hcp || ! in_array($hcp->status?->value ?? $hcp->status, ['active', 'accredited'])) {
                    continue; // Skip inactive HCPs
                }

                // Count active principals mapped to this HCP
                $principalCount = Enrollee::where('primary_hcp_id', $hcpId)
                    ->where('branch_id', $branchId)
                    ->where('status', 'active')
                    ->count();

                // Count active dependants of those principals
                $dependentCount = Dependent::where('status', 'active')
                    ->whereHas('enrollee', fn ($q) =>
                        $q->where('primary_hcp_id', $hcpId)
                          ->where('branch_id', $branchId)
                          ->where('status', 'active')
                    )
                    ->count();

                $totalMembers = $principalCount + $dependentCount;

                if ($totalMembers === 0) {
                    continue; // Skip HCPs with no enrolled members
                }

                $prevCount = isset($prevRecords[$hcpId])
                    ? $prevRecords[$hcpId]->enrolled_member_count
                    : 0;

                $principalAmount = $principalCount * $rate->rate_per_principal;
                $dependentAmount = $dependentCount * $rate->rate_per_dependent;
                $totalAmount     = $principalAmount + $dependentAmount;

                $records[] = [
                    'run_id'                 => $run->id,
                    'hcp_id'                 => $hcpId,
                    'branch_id'              => $branchId,
                    'period_month'           => $month,
                    'period_year'            => $year,
                    'principal_count'        => $principalCount,
                    'dependent_count'        => $dependentCount,
                    'enrolled_member_count'  => $totalMembers,
                    'previous_member_count'  => $prevCount,
                    'member_variance'        => $totalMembers - $prevCount,
                    'rate_per_member'        => $rate->rate_per_principal,
                    'rate_per_dependent'     => $rate->rate_per_dependent,
                    'total_amount'           => $totalAmount,
                    'adjustment_amount'      => 0,
                    'status'                 => 'pending',
                    'hcp_name_snapshot'      => $hcp->name,
                    'hcp_tier_snapshot'      => $hcp->tier?->value ?? $hcp->tier,
                    'created_at'             => now(),
                    'updated_at'             => now(),
                ];
            }

            if (empty($records)) {
                // Rollback by throwing — no records means no valid HCPs
                throw new \RuntimeException('No active HCPs with enrolled members found. Ensure HCPs have active enrollees before generating a run.');
            }

            CapitationRecord::insert($records);

            // Compute and store totals on the run
            $run->recomputeTotals();

            // Variance vs previous run
            $prevTotal = $prevRun?->total_member_count ?? 0;
            $run->update(['member_variance' => $run->total_member_count - $prevTotal]);

            return $run;
        });

        $run->load(['records', 'generatedBy']);

        return response()->json([
            'data'    => $this->formatRunDetail($run),
            'message' => "Capitation run for {$run->period_label} generated. {$run->total_hcp_count} HCPs, {$run->total_member_count} members, total " . number_format($run->total_amount, 2),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW — run detail with all HCP line items (headcount reconciliation)
    // GET /finance/capitation/{run}
    // ─────────────────────────────────────────────────────────────────────────

    public function show(CapitationRun $run): JsonResponse
    {
        $this->authorizeRun($run);

        $run->load([
            'generatedBy:id,name',
            'approvedBy:id,name',
            'paymentBatch:id,batch_number,status,total_amount',
            'records.hcp:id,name,hcp_code,type,tier,city',
        ]);

        return response()->json(['data' => $this->formatRunDetail($run)]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADJUST RECORD — edit a single HCP line (add adjustment, change counts)
    // PATCH /finance/capitation/{run}/records/{record}
    // ─────────────────────────────────────────────────────────────────────────

    public function adjustRecord(Request $request, CapitationRun $run, CapitationRecord $record): JsonResponse
    {
        $this->authorizeRun($run);

        if ($run->status !== 'draft') {
            return response()->json(['message' => 'Only draft runs can be adjusted.'], 422);
        }

        if ($record->run_id !== $run->id) {
            return response()->json(['message' => 'Record does not belong to this run.'], 422);
        }

        $validated = $request->validate([
            'adjustment_amount' => ['nullable', 'numeric', 'min:-9999999', 'max:9999999'],
            'adjustment_note'   => ['required_with:adjustment_amount', 'nullable', 'string', 'max:500'],
            'principal_count'   => ['nullable', 'integer', 'min:0'],
            'dependent_count'   => ['nullable', 'integer', 'min:0'],
            'notes'             => ['nullable', 'string', 'max:1000'],
        ]);

        $record->fill($validated);

        // If counts changed, recalculate amount
        if (isset($validated['principal_count']) || isset($validated['dependent_count'])) {
            $record->recalculate();
        } else {
            $record->save();
        }

        // Refresh run totals
        $run->recomputeTotals();

        return response()->json([
            'data'    => $this->formatRecord($record),
            'message' => 'Record adjusted. Run totals updated.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPROVE — finalise the run and create a capitation payment batch
    // POST /finance/capitation/{run}/approve
    // ─────────────────────────────────────────────────────────────────────────

    public function approve(Request $request, CapitationRun $run): JsonResponse
    {
        $this->authorizeRun($run);

        if ($run->status !== 'draft') {
            return response()->json(['message' => 'Only draft runs can be approved.'], 422);
        }

        if ($run->total_amount <= 0) {
            return response()->json(['message' => 'Cannot approve a run with zero total amount.'], 422);
        }

        $user = Auth::user();

        $batch = DB::transaction(function () use ($run, $user) {
            // Create a capitation payment batch
            $batchNumber = $this->generateBatchNumber($run);

            $batch = PaymentBatch::create([
                'branch_id'         => $run->branch_id,
                'batch_number'      => $batchNumber,
                'batch_type'        => 'capitation',
                'capitation_run_id' => $run->id,
                'description'       => "Capitation — {$run->period_label}",
                'total_amount'      => $run->total_amount,
                'claim_count'       => $run->total_hcp_count,
                'provider_count'    => $run->total_hcp_count,
                'status'            => 'submitted', // Ready for Finance approval
                'created_by'        => $user->id,
            ]);

            // Mark run as approved, link batch
            $run->update([
                'status'           => 'approved',
                'approved_by_id'   => $user->id,
                'approved_at'      => now(),
                'payment_batch_id' => $batch->id,
            ]);

            // Mark all records as approved
            $run->records()->update(['status' => 'approved']);

            return $batch;
        });

        return response()->json([
            'data'    => [
                'run_id'       => $run->id,
                'run_status'   => 'approved',
                'batch_id'     => $batch->id,
                'batch_number' => $batch->batch_number,
                'total_amount' => $run->total_amount,
            ],
            'message' => "Run approved. Payment batch {$batch->batch_number} created and ready for Finance sign-off.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RATE INDEX — list capitation rates for HCPs in this branch
    // GET /finance/capitation/rates
    // ─────────────────────────────────────────────────────────────────────────

    public function rateIndex(Request $request): JsonResponse
    {
        $branchId = Auth::user()->branch_id;

        $rates = HcpCapitationRate::forBranch($branchId)
            ->with('hcp:id,name,hcp_code,type,tier')
            ->when($request->boolean('active_only', true), fn ($q) => $q->activeOn())
            ->orderBy('hcp_id')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'data' => $rates->map(fn ($r) => [
                'id'                 => $r->id,
                'hcp_id'             => $r->hcp_id,
                'hcp_name'           => $r->hcp?->name,
                'hcp_code'           => $r->hcp?->hcp_code,
                'hcp_type'           => $r->hcp?->type,
                'hcp_tier'           => $r->hcp?->tier,
                'rate_per_principal' => $r->rate_per_principal,
                'rate_per_dependent' => $r->rate_per_dependent,
                'tier'               => $r->tier,
                'effective_from'     => $r->effective_from?->toDateString(),
                'effective_to'       => $r->effective_to?->toDateString(),
                'is_active'          => $r->is_active,
                'notes'              => $r->notes,
                'created_at'         => $r->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $rates->currentPage(),
                'last_page'    => $rates->lastPage(),
                'total'        => $rates->total(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RATE STORE — set or update capitation rate for an HCP
    // POST /finance/capitation/rates
    // ─────────────────────────────────────────────────────────────────────────

    public function rateStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hcp_id'             => ['required', 'integer', 'exists:health_care_providers,id'],
            'rate_per_principal' => ['required', 'numeric', 'min:0'],
            'rate_per_dependent' => ['required', 'numeric', 'min:0'],
            'effective_from'     => ['required', 'date'],
            'effective_to'       => ['nullable', 'date', 'after:effective_from'],
            'notes'              => ['nullable', 'string', 'max:500'],
        ]);

        $branchId = Auth::user()->branch_id;

        // Deactivate existing active rate for this HCP
        HcpCapitationRate::where('hcp_id', $validated['hcp_id'])
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->update(['is_active' => false, 'effective_to' => Carbon::parse($validated['effective_from'])->subDay()->toDateString()]);

        $hcp  = HealthCareProvider::find($validated['hcp_id']);
        $rate = HcpCapitationRate::create([
            ...$validated,
            'branch_id'  => $branchId,
            'tier'       => $hcp?->tier?->value ?? $hcp?->tier ?? 'primary',
            'is_active'  => true,
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'data'    => [
                'id'                 => $rate->id,
                'hcp_id'             => $rate->hcp_id,
                'rate_per_principal' => $rate->rate_per_principal,
                'rate_per_dependent' => $rate->rate_per_dependent,
                'effective_from'     => $rate->effective_from?->toDateString(),
                'effective_to'       => $rate->effective_to?->toDateString(),
            ],
            'message' => "Capitation rate set for {$hcp?->name}.",
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function authorizeRun(CapitationRun $run): void
    {
        if ($run->branch_id !== Auth::user()->branch_id) {
            abort(403, 'Access to this capitation run is not permitted.');
        }
    }

    private function formatRun(CapitationRun $run): array
    {
        return [
            'id'                    => $run->id,
            'period_month'          => $run->period_month,
            'period_year'           => $run->period_year,
            'period_label'          => $run->period_label,
            'status'                => $run->status,
            'total_hcp_count'       => $run->total_hcp_count,
            'total_principal_count' => $run->total_principal_count,
            'total_dependent_count' => $run->total_dependent_count,
            'total_member_count'    => $run->total_member_count,
            'total_amount'          => $run->total_amount,
            'member_variance'       => $run->member_variance,
            'generated_by_name'     => $run->generatedBy?->name,
            'approved_by_name'      => $run->approvedBy?->name,
            'approved_at'           => $run->approved_at?->toIso8601String(),
            'batch_number'          => $run->paymentBatch?->batch_number,
            'batch_status'          => $run->paymentBatch?->status,
            'notes'                 => $run->notes,
            'created_at'            => $run->created_at?->toIso8601String(),
        ];
    }

    private function formatRunDetail(CapitationRun $run): array
    {
        return array_merge($this->formatRun($run), [
            'records' => $run->records->map(fn ($r) => $this->formatRecord($r))->all(),
        ]);
    }

    private function formatRecord(CapitationRecord $r): array
    {
        return [
            'id'                     => $r->id,
            'hcp_id'                 => $r->hcp_id,
            'hcp_name'               => $r->hcp_name_snapshot ?? $r->hcp?->name,
            'hcp_code'               => $r->hcp?->hcp_code,
            'hcp_type'               => $r->hcp?->type,
            'hcp_tier'               => $r->hcp_tier_snapshot ?? $r->hcp?->tier,
            'hcp_city'               => $r->hcp?->city,
            'principal_count'        => $r->principal_count,
            'dependent_count'        => $r->dependent_count,
            'enrolled_member_count'  => $r->enrolled_member_count,
            'previous_member_count'  => $r->previous_member_count,
            'member_variance'        => $r->member_variance,
            'rate_per_member'        => $r->rate_per_member,
            'rate_per_dependent'     => $r->rate_per_dependent,
            'total_amount'           => $r->total_amount,
            'adjustment_amount'      => $r->adjustment_amount,
            'adjustment_note'        => $r->adjustment_note,
            'effective_total'        => $r->effective_total,
            'notes'                  => $r->notes,
            'status'                 => $r->status,
        ];
    }

    private function generateBatchNumber(CapitationRun $run): string
    {
        $prefix = 'CAP';
        $period = $run->period_code; // e.g. 2025-06
        $seq    = str_pad(
            PaymentBatch::where('batch_type', 'capitation')
                        ->where('branch_id', $run->branch_id)
                        ->whereYear('created_at', $run->period_year)
                        ->count() + 1,
            3, '0', STR_PAD_LEFT
        );
        return "{$prefix}-{$period}-{$seq}"; // e.g. CAP-2025-06-001
    }
}