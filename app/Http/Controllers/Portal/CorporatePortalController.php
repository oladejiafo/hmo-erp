<?php
/**
 * PATCH NOTE: complete replacement of CorporatePortalController.php.
 * This supersedes the Phase 5 version of this same file — that one still
 * had the amount_due/period_start bug baked in because I copied it forward
 * from what was pasted without checking it against the real corporate_invoices
 * migration. This version is checked against real schema throughout.
 *
 * Marked [FIX] for corrections, [PHASE 5] for the plan/budget/broadcast work
 * already delivered, [PHASE 7] for this pass's additions (bulk status,
 * reactivate, renewals, utilization export).
 */
// app/Http/Controllers/Portal/CorporatePortalController.php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Corporate;
use App\Models\Enrollee;
use App\Models\Claim;
use App\Models\CorporateInvoice;
use App\Models\CorporatePlanRequest; // [PHASE 5]
use App\Models\Plan; // [PHASE 5]
use App\Models\Ticket; // [PHASE 7] — reused for renewal requests, not a new table
use App\Services\BulkEnrolleeImportService; // [FIX]
use App\Services\TicketService; // [PHASE 7]
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CorporatePortalController extends Controller
{
    public function __construct(
        protected BulkEnrolleeImportService $importService, // [FIX]
        protected TicketService $ticketService, // [PHASE 7]
    ) {}

    /**
     * Get corporate dashboard data
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;
        
        if (!$corporate) {
            return response()->json(['data' => null], 404);
        }

        $corporate->load(['plans']);

        $activeEnrollees = Enrollee::where('corporate_id', $corporate->id)
            ->where('status', 'active')
            ->count();

        $totalEnrollees = Enrollee::where('corporate_id', $corporate->id)->count();

        // [FIX] amount_due -> total_amount
        $outstandingInvoices = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('total_amount');

        $outstandingCount = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereIn('status', ['sent', 'overdue'])
            ->count();

        $overdueCount = CorporateInvoice::where('corporate_id', $corporate->id)
            ->where('status', 'overdue')
            ->count();

        $claimsThisMonth = Claim::whereHas('enrollee', function($q) use ($corporate) {
                $q->where('corporate_id', $corporate->id);
            })
            ->whereMonth('created_at', now()->month)
            ->count();

        $claimsAmountThisMonth = Claim::whereHas('enrollee', function($q) use ($corporate) {
                $q->where('corporate_id', $corporate->id);
            })
            ->whereMonth('created_at', now()->month)
            ->sum('total_amount_claimed');

        $recentClaims = Claim::whereHas('enrollee', function($q) use ($corporate) {
                $q->where('corporate_id', $corporate->id);
            })
            ->with(['enrollee:id,first_name,last_name,enrollee_id'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $recentInvoices = CorporateInvoice::where('corporate_id', $corporate->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $annualPremium = $corporate->plans()
            ->where('status', 'active')
            ->first()?->annual_premium ?? 0;

        // [PHASE 7] — renewal countdown surfaced right on the dashboard,
        // not buried in a separate page nobody checks until it's too late.
        $daysToRenewal = $corporate->contract_end_date
            ? now()->diffInDays($corporate->contract_end_date, false)
            : null;

        return response()->json([
            'data' => [
                'corporate_name' => $corporate->name,
                'plan_name' => $corporate->plans()->where('status', 'active')->first()?->plan_name,
                'plan_expiry' => $corporate->contract_end_date,
                'days_to_renewal' => $daysToRenewal, // [PHASE 7]
                'renewal_urgent' => $daysToRenewal !== null && $daysToRenewal <= 30, // [PHASE 7]
                'active_enrollees' => $activeEnrollees,
                'total_enrollees' => $totalEnrollees,
                'outstanding_invoices_amount' => $outstandingInvoices,
                'outstanding_invoices_count' => $outstandingCount,
                'overdue_invoices_count' => $overdueCount,
                'claims_this_month' => $claimsThisMonth,
                'claims_amount_this_month' => $claimsAmountThisMonth,
                'annual_premium' => $annualPremium,
                'recent_claims' => $recentClaims->map(function($claim) {
                    return [
                        'id' => $claim->id,
                        'claim_number' => $claim->claim_number,
                        'enrollee_name' => $claim->enrollee->first_name . ' ' . $claim->enrollee->last_name,
                        'amount' => $claim->total_amount_claimed,
                        'service_date' => $claim->service_date,
                        'status' => $claim->status,
                    ];
                }),
                'recent_invoices' => $recentInvoices->map(function($invoice) {
                    return [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'total_amount' => $invoice->total_amount, // [FIX]
                        'due_date' => $invoice->due_date,
                        'status' => $invoice->status,
                        'is_overdue' => $invoice->status === 'overdue',
                    ];
                }),
            ]
        ]);
    }

    public function enrollees(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;
        
        if (!$corporate) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = Enrollee::where('corporate_id', $corporate->id)
            ->with(['plan', 'dependents', 'primaryHcp']);

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%")
                  ->orWhere('enrollee_id', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
                  ->orWhere('staff_id', 'like', "%{$request->search}%");
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $perPage = $request->per_page ?? 20;
        $enrollees = $query->orderBy('last_name')->paginate($perPage);

        // Counts for the summary pills should reflect the whole corporate,
        // not just the current page — matches what the pills visually imply.
        $active_count = Enrollee::where('corporate_id', $corporate->id)->where('status', 'active')->count();
        $suspended_count = Enrollee::where('corporate_id', $corporate->id)->where('status', 'suspended')->count();
        $with_dependants_count = Enrollee::where('corporate_id', $corporate->id)->whereHas('dependents')->count();

        return response()->json([
            'data' => $enrollees->map(function($enrollee) {
                return [
                    'id' => $enrollee->id,
                    'first_name' => $enrollee->first_name,
                    'last_name' => $enrollee->last_name,
                    'email' => $enrollee->email,
                    'enrollee_id' => $enrollee->enrollee_id,
                    'staff_id' => $enrollee->staff_id,
                    'plan_id' => $enrollee->plan_id, // [PHASE 5]
                    'plan_name' => $enrollee->plan->plan_name ?? null,
                    'plan_tier' => $enrollee->plan->tier ?? null, // [PHASE 5]
                    'dependants_count' => $enrollee->dependents->count(),
                    'enrolled_at' => $enrollee->created_at,
                    'status' => $enrollee->status,
                ];
            }),
            'meta' => [
                'current_page' => $enrollees->currentPage(),
                'last_page' => $enrollees->lastPage(),
                'per_page' => $enrollees->perPage(),
                'total' => $enrollees->total(),
                'active_count' => $active_count, // [FIX] was counting only current page
                'suspended_count' => $suspended_count, // [FIX]
                'with_dependants_count' => $with_dependants_count, // [FIX]
            ],
        ]);
    }

    public function addEnrollee(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:enrollees,email',
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|string|in:male,female,other',
            'date_of_birth' => 'required|date',
            'staff_id' => 'nullable|string|max:50',
            'plan_id' => 'required|exists:plans,id', // [FIX] was exists:corporate_plans,id
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $plan = $corporate->plans()->find($request->plan_id);
        if (!$plan) {
            return response()->json(['message' => 'Invalid plan selected'], 422);
        }

        DB::beginTransaction();
        try {
            $enrolleeId = 'ENR-' . str_pad(Enrollee::where('corporate_id', $corporate->id)->count() + 1, 6, '0', STR_PAD_LEFT);

            $enrollee = Enrollee::create([
                'corporate_id' => $corporate->id,
                'branch_id' => $corporate->branch_id,
                'plan_id' => $request->plan_id,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'gender' => $request->gender,
                'date_of_birth' => $request->date_of_birth,
                'staff_id' => $request->staff_id,
                'enrollee_id' => $enrolleeId,
                'enrollment_date' => now(),
                'expiry_date' => now()->addYear(),
                'status' => 'active',
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Staff member added successfully',
                'data' => [
                    'id' => $enrollee->id,
                    'name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                    'enrollee_id' => $enrollee->enrollee_id,
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to add enrollee: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to add staff member'], 500);
        }
    }

    public function removeEnrollee(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $enrollee = Enrollee::where('corporate_id', $corporate->id)
            ->where('id', $id)
            ->first();

        if (!$enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        $enrollee->update(['status' => 'inactive']);

        return response()->json(['message' => 'Enrollee removed successfully']);
    }

    // [PHASE 7] — single reactivate, the missing counterpart to remove()
    public function reactivateEnrollee(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $enrollee = Enrollee::where('corporate_id', $corporate->id)->where('id', $id)->first();
        if (!$enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        if (!$enrollee->plan_id) {
            return response()->json(['message' => 'This enrollee has no plan assigned — assign a plan before reactivating.'], 422);
        }

        $enrollee->update([
            'status' => 'active',
            'expiry_date' => now()->addYear(),
        ]);

        return response()->json(['message' => "{$enrollee->first_name} {$enrollee->last_name} reactivated."]);
    }

    // [PHASE 7] — bulk delist/reactivate, "at a click on the list"
    public function bulkUpdateEnrolleeStatus(Request $request): JsonResponse
    {
        $request->validate([
            'enrollee_ids' => 'required|array|min:1',
            'enrollee_ids.*' => 'integer',
            'status' => 'required|string|in:active,inactive,suspended',
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        // Scoped to this corporate's own enrollees only — a bulk action
        // can't be tricked into touching IDs belonging to another company
        // even if someone crafts a request with foreign IDs mixed in.
        $query = Enrollee::where('corporate_id', $corporate->id)
            ->whereIn('id', $request->enrollee_ids);

        $affectedIds = $query->pluck('id');
        $updateData = ['status' => $request->status];

        if ($request->status === 'active') {
            $updateData['expiry_date'] = now()->addYear();
        }

        $updated = $query->update($updateData);

        return response()->json([
            'message' => "{$updated} enrollee(s) updated to {$request->status}.",
            'data' => ['updated_count' => $updated, 'affected_ids' => $affectedIds],
        ]);
    }

    // [PHASE 5] — tier upgrade
    public function upgradeEnrolleeTier(Request $request, $id): JsonResponse
    {
        $request->validate(['plan_id' => 'required|exists:plans,id']);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $enrollee = Enrollee::where('corporate_id', $corporate->id)->where('id', $id)->first();
        if (!$enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        $newPlan = $corporate->plans()->where('status', 'active')->find($request->plan_id);
        if (!$newPlan) {
            return response()->json(['message' => 'Selected plan is not available for your organisation.'], 422);
        }

        $oldPlanName = $enrollee->plan->plan_name ?? 'no plan';
        $enrollee->update(['plan_id' => $newPlan->id]);

        return response()->json([
            'message' => "Moved {$enrollee->first_name} {$enrollee->last_name} from {$oldPlanName} to {$newPlan->plan_name}.",
            'data' => ['id' => $enrollee->id, 'plan_id' => $newPlan->id, 'plan_name' => $newPlan->plan_name],
        ]);
    }

    // [PHASE 5] — available plans for the tier-upgrade dropdown
    public function availablePlans(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => []], 200);
        }

        $plans = $corporate->plans()->where('status', 'active')->get();

        return response()->json([
            'data' => $plans->map(fn($p) => [
                'id' => $p->id, 'plan_name' => $p->plan_name, 'tier' => $p->tier,
                'max_benefit_value' => $p->max_benefit_value,
            ]),
        ]);
    }

    public function claims(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = Claim::whereHas('enrollee', function($q) use ($corporate) {
                $q->where('corporate_id', $corporate->id);
            })
            ->with(['enrollee', 'hcp', 'dependent']);

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('claim_number', 'like', "%{$request->search}%")
                  ->orWhereHas('enrollee', function($eq) use ($request) {
                      $eq->where('first_name', 'like', "%{$request->search}%")
                         ->orWhere('last_name', 'like', "%{$request->search}%");
                  });
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->date_from) {
            $query->whereDate('service_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('service_date', '<=', $request->date_to);
        }

        $perPage = $request->per_page ?? 20;
        $claims = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $summary = [
            'total_count' => $claims->total(),
            'total_claimed' => $claims->sum('total_amount_claimed'),
            'total_paid' => $claims->where('status', 'paid')->sum('total_amount_paid'),
            'pending_count' => $claims->whereIn('status', ['submitted', 'under_review'])->count(),
        ];

        return response()->json([
            'data' => $claims->map(function($claim) {
                return [
                    'id' => $claim->id,
                    'claim_number' => $claim->claim_number,
                    'enrollee_name' => $claim->enrollee->first_name . ' ' . $claim->enrollee->last_name,
                    'dependent_name' => $claim->dependent ? $claim->dependent->first_name . ' ' . $claim->dependent->last_name : null,
                    'hcp_name' => $claim->hcp->name ?? null,
                    'service_date' => $claim->service_date,
                    'total_amount_claimed' => $claim->total_amount_claimed,
                    'total_amount_paid' => $claim->total_amount_paid,
                    'status' => $claim->status,
                ];
            }),
            'meta' => [
                'current_page' => $claims->currentPage(),
                'last_page' => $claims->lastPage(),
                'per_page' => $claims->perPage(),
                'total' => $claims->total(),
            ],
            'summary' => $summary,
        ]);
    }

    // [PHASE 5] — budget vs utilization dashboard
    public function budgetDashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => null], 404);
        }

        $plans = $corporate->plans()->where('status', 'active')->get();

        $byPlan = $plans->map(function ($plan) use ($corporate) {
            $enrolleeIds = Enrollee::where('corporate_id', $corporate->id)
                ->where('plan_id', $plan->id)
                ->where('status', 'active')
                ->pluck('id');

            $budget = $plan->max_benefit_value * $enrolleeIds->count();

            $utilized = Claim::whereIn('enrollee_id', $enrolleeIds)
                ->whereYear('created_at', now()->year)
                ->whereIn('status', ['approved', 'paid'])
                ->sum('total_amount_approved');

            return [
                'plan_id' => $plan->id,
                'plan_name' => $plan->plan_name,
                'tier' => $plan->tier,
                'enrollee_count' => $enrolleeIds->count(),
                'budget' => $budget,
                'utilized' => $utilized,
                'utilization_percent' => $budget > 0 ? round(($utilized / $budget) * 100, 1) : 0,
                'remaining' => $budget - $utilized,
            ];
        });

        $totalBudget = $byPlan->sum('budget');
        $totalUtilized = $byPlan->sum('utilized');

        $monthlyTrend = Claim::whereHas('enrollee', fn($q) => $q->where('corporate_id', $corporate->id))
            ->whereYear('created_at', now()->year)
            ->whereIn('status', ['approved', 'paid'])
            ->selectRaw('MONTH(created_at) as month, SUM(total_amount_approved) as amount')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'data' => [
                'total_budget' => $totalBudget,
                'total_utilized' => $totalUtilized,
                'total_utilization_percent' => $totalBudget > 0 ? round(($totalUtilized / $totalBudget) * 100, 1) : 0,
                'by_plan' => $byPlan,
                'monthly_trend' => $monthlyTrend,
            ],
        ]);
    }

    // [PHASE 7] — utilization report export, CSV, per-employee detail
    // (budgetDashboard() above is aggregate-only; this is the "Utilization
    // Reports" checklist item — exportable detail, not just dashboard numbers)
    public function exportUtilizationReport(Request $request)
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $enrollees = Enrollee::where('corporate_id', $corporate->id)
            ->with('plan')
            ->get();

        $handle = fopen('php://temp', 'w');
        fputcsv($handle, ['Employee ID', 'Name', 'Plan', 'Status', 'Claims This Year', 'Amount Utilized (₦)', 'Plan Ceiling (₦)', 'Utilization %']);

        foreach ($enrollees as $enrollee) {
            $utilized = Claim::where('enrollee_id', $enrollee->id)
                ->whereYear('created_at', now()->year)
                ->whereIn('status', ['approved', 'paid'])
                ->sum('total_amount_approved');

            $claimCount = Claim::where('enrollee_id', $enrollee->id)
                ->whereYear('created_at', now()->year)
                ->count();

            $ceiling = $enrollee->plan->max_benefit_value ?? 0;

            fputcsv($handle, [
                $enrollee->enrollee_id,
                $enrollee->first_name . ' ' . $enrollee->last_name,
                $enrollee->plan->plan_name ?? 'N/A',
                $enrollee->status,
                $claimCount,
                number_format($utilized, 2),
                number_format($ceiling, 2),
                $ceiling > 0 ? round(($utilized / $ceiling) * 100, 1) . '%' : '0%',
            ]);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        $filename = 'utilization-report-' . now()->format('Y-m-d') . '.csv';

        return response($content)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    public function invoices(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = CorporateInvoice::where('corporate_id', $corporate->id);

        if ($request->status) {
            if ($request->status === 'unpaid') {
                $query->whereIn('status', ['sent', 'overdue']);
            } elseif ($request->status === 'paid') {
                $query->where('status', 'paid');
            } elseif ($request->status === 'overdue') {
                $query->where('status', 'overdue');
            }
        }

        $perPage = $request->per_page ?? 20;
        $invoices = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // [FIX] amount_due -> total_amount, throughout
        $totalBilled = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');

        $totalPaid = CorporateInvoice::where('corporate_id', $corporate->id)
            ->where('status', 'paid')
            ->sum('total_amount');

        $outstanding = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('total_amount');

        $overdueCount = CorporateInvoice::where('corporate_id', $corporate->id)
            ->where('status', 'overdue')
            ->count();

        return response()->json([
            'data' => $invoices->map(function($invoice) {
                // [FIX] period_start/period_end now real columns (nullable —
                // older invoices predate this fix, fall back to issue_date).
                $periodFrom = $invoice->period_start ?? $invoice->issue_date;
                $periodTo = $invoice->period_end ?? $invoice->due_date;

                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'period_from' => $periodFrom,
                    'period_to' => $periodTo,
                    'period_label' => $periodFrom?->format('M Y'),
                    'issue_date' => $invoice->issue_date,
                    'due_date' => $invoice->due_date,
                    'total_amount' => $invoice->total_amount, // [FIX]
                    'status' => $invoice->status,
                    'is_overdue' => $invoice->status === 'overdue',
                ];
            }),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
            'summary' => [
                'total_billed' => $totalBilled,
                'total_paid' => $totalPaid,
                'outstanding' => $outstanding,
                'overdue_count' => $overdueCount,
            ],
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => null], 404);
        }

        $corporate->load(['plans' => function($q) {
            $q->where('status', 'active');
        }, 'branch']);

        $activePlan = $corporate->plans->first();

        return response()->json([
            'data' => [
                'name' => $corporate->name,
                'rc_number' => $corporate->rc_number,
                'industry' => $corporate->industry,
                'address' => $corporate->address,
                'city' => $corporate->city,
                'state' => $corporate->state,
                'email' => $corporate->email,
                'phone' => $corporate->phone,
                'plan_name' => $activePlan?->plan_name,
                'policy_start' => $corporate->contract_start_date,
                'policy_expiry' => $corporate->contract_end_date,
                'branch_name' => $corporate->branch?->name,
                'contact_person' => $corporate->contacts()->where('type', 'primary')->first()?->name,
                'contact_email' => $corporate->contacts()->where('type', 'primary')->first()?->email,
                'contact_phone' => $corporate->contacts()->where('type', 'primary')->first()?->phone,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $request->validate([
            'contact_person' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $contact = $corporate->contacts()->where('type', 'primary')->first();
        
        if ($contact) {
            $contact->update([
                'name' => $request->contact_person ?? $contact->name,
                'email' => $request->contact_email ?? $contact->email,
                'phone' => $request->contact_phone ?? $contact->phone,
            ]);
        } elseif ($request->contact_person) {
            $corporate->contacts()->create([
                'name' => $request->contact_person,
                'email' => $request->contact_email,
                'phone' => $request->contact_phone,
                'type' => 'primary',
            ]);
        }

        if ($request->address) {
            $corporate->update(['address' => $request->address]);
        }

        return response()->json(['message' => 'Profile updated successfully']);
    }

    public function exportClaims(Request $request)
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $query = Claim::whereHas('enrollee', function($q) use ($corporate) {
                $q->where('corporate_id', $corporate->id);
            })
            ->with(['enrollee', 'hcp']);

        if ($request->search) {
            $query->where('claim_number', 'like', "%{$request->search}%");
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->date_from) {
            $query->whereDate('service_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('service_date', '<=', $request->date_to);
        }

        $claims = $query->orderBy('created_at', 'desc')->get();

        $filename = 'claims-export-' . now()->format('Y-m-d') . '.csv';
        $handle = fopen('php://temp', 'w');

        fputcsv($handle, [
            'Claim Number', 'Employee Name', 'Service Date', 'HCP',
            'Amount Claimed', 'Amount Paid', 'Status',
        ]);

        foreach ($claims as $claim) {
            fputcsv($handle, [
                $claim->claim_number,
                $claim->enrollee->first_name . ' ' . $claim->enrollee->last_name,
                $claim->service_date->format('Y-m-d'),
                $claim->hcp->name ?? 'N/A',
                number_format($claim->total_amount_claimed, 2),
                $claim->total_amount_paid ? number_format($claim->total_amount_paid, 2) : '0.00',
                $claim->status,
            ]);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return response($content)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    public function bulkUploadEnrollees(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt,xlsx']);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        try {
            $result = $this->importService->import($request->file('file'), $corporate);

            return response()->json([
                'message' => "Bulk upload completed. {$result['imported']} enrolled, {$result['errors']} errors.",
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Corporate portal bulk upload failed: ' . $e->getMessage());
            return response()->json(['message' => 'Upload failed: ' . $e->getMessage()], 500);
        }
    }

    // ─── [PHASE 5] Plan requests ─────────────────────────────────────────────

    public function estimatePlan(Request $request): JsonResponse
    {
        $request->validate([
            'tier' => 'required|string|in:basic,standard,premium,executive',
            'expected_employee_count' => 'required|integer|min:1',
            'selected_benefits' => 'nullable|array',
        ]);

        $estimate = CorporatePlanRequest::estimate(
            $request->tier,
            $request->expected_employee_count,
            $request->selected_benefits ?? []
        );

        return response()->json(['data' => $estimate]);
    }

    public function planRequests(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => []], 200);
        }

        $requests = CorporatePlanRequest::where('corporate_id', $corporate->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $requests->map(fn($r) => [
                'id' => $r->id,
                'plan_name' => $r->plan_name,
                'tier' => $r->tier,
                'expected_employee_count' => $r->expected_employee_count,
                'budget_cap' => $r->budget_cap,
                'estimated_annual_premium' => $r->estimated_annual_premium,
                'status' => $r->status,
                'reviewer_notes' => $r->reviewer_notes,
                'created_at' => $r->created_at?->format('Y-m-d'),
            ]),
        ]);
    }

    public function submitPlanRequest(Request $request): JsonResponse
    {
        $request->validate([
            'plan_name' => 'required|string|max:100',
            'tier' => 'required|string|in:basic,standard,premium,executive',
            'expected_employee_count' => 'required|integer|min:1',
            'budget_cap' => 'nullable|numeric|min:0',
            'selected_benefits' => 'nullable|array',
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $estimate = CorporatePlanRequest::estimate(
            $request->tier,
            $request->expected_employee_count,
            $request->selected_benefits ?? []
        );

        $planRequest = CorporatePlanRequest::create([
            'corporate_id' => $corporate->id,
            'requested_by_user_id' => $user->id,
            'plan_name' => $request->plan_name,
            'tier' => $request->tier,
            'expected_employee_count' => $request->expected_employee_count,
            'budget_cap' => $request->budget_cap,
            'selected_benefits' => $request->selected_benefits ?? [],
            'estimated_annual_premium' => $estimate['estimated_annual_premium'],
            'estimated_max_benefit_value' => $estimate['estimated_max_benefit_value'],
            'status' => 'submitted',
        ]);

        return response()->json([
            'message' => 'Plan request submitted for HMO review.',
            'data' => ['id' => $planRequest->id, 'status' => $planRequest->status],
        ], 201);
    }

    // ─── [PHASE 5] Broadcast ─────────────────────────────────────────────────

    public function broadcast(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:150',
            'body' => 'required|string|min:5|max:1000',
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $recipientCount = app(\App\Services\NotificationService::class)
            ->broadcastToCorporateEnrollees($corporate, $request->title, $request->body);

        return response()->json([
            'message' => "Announcement sent to {$recipientCount} employees.",
        ]);
    }

    // ─── [PHASE 7] Renewal management ───────────────────────────────────────
    // Reuses the Ticket system (Phase 3) rather than a new table — a
    // renewal request is fundamentally a conversation with the HMO with a
    // clear resolution point, exactly what Tickets already model.

    public function renewalStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => null], 404);
        }

        $daysToRenewal = $corporate->contract_end_date
            ? now()->diffInDays($corporate->contract_end_date, false)
            : null;

        $activePlans = $corporate->plans()->where('status', 'active')->get();

        $existingRenewalTicket = Ticket::where('corporate_id', $corporate->id)
            ->where('category', 'renewal')
            ->open()
            ->latest()
            ->first();

        return response()->json([
            'data' => [
                'contract_start_date' => $corporate->contract_start_date,
                'contract_end_date' => $corporate->contract_end_date,
                'days_to_renewal' => $daysToRenewal,
                'status' => $daysToRenewal === null ? 'unknown'
                    : ($daysToRenewal < 0 ? 'expired' : ($daysToRenewal <= 30 ? 'urgent' : ($daysToRenewal <= 90 ? 'upcoming' : 'ok'))),
                'plans' => $activePlans->map(fn($p) => [
                    'id' => $p->id, 'plan_name' => $p->plan_name,
                    'effective_date' => $p->effective_date, 'expiry_date' => $p->expiry_date,
                ]),
                'renewal_request_pending' => $existingRenewalTicket !== null,
                'renewal_ticket_number' => $existingRenewalTicket?->ticket_number,
            ],
        ]);
    }

    public function requestRenewal(Request $request): JsonResponse
    {
        $request->validate(['notes' => 'nullable|string|max:2000']);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        $existing = Ticket::where('corporate_id', $corporate->id)->where('category', 'renewal')->open()->first();
        if ($existing) {
            return response()->json([
                'message' => "A renewal request is already open: {$existing->ticket_number}",
                'data' => ['ticket_number' => $existing->ticket_number],
            ], 422);
        }

        $daysToRenewal = $corporate->contract_end_date ? now()->diffInDays($corporate->contract_end_date, false) : null;
        $priority = ($daysToRenewal !== null && $daysToRenewal <= 30) ? 'urgent' : 'medium';

        $ticket = $this->ticketService->createForUser($user, [
            'subject' => "Renewal request — {$corporate->name}",
            'description' => $request->notes ?: "Requesting contract renewal ahead of expiry on {$corporate->contract_end_date?->format('Y-m-d')}.",
            'category' => 'renewal',
            'priority' => $priority,
        ]);

        return response()->json([
            'message' => 'Renewal request submitted to the HMO team.',
            'data' => ['ticket_number' => $ticket->ticket_number],
        ], 201);
    }
}
