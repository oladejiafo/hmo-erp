<?php
// app/Http/Controllers/Portal/CorporatePortalController.php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Resources\CorporateResource;
use App\Http\Resources\EnrolleeResource;
use App\Http\Resources\ClaimResource;
use App\Http\Resources\CorporateInvoiceResource;
use App\Models\Corporate;
use App\Models\Enrollee;
use App\Models\Claim;
use App\Models\CorporateInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CorporatePortalController extends Controller
{
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

        // Get active enrollees count
        $activeEnrollees = Enrollee::where('corporate_id', $corporate->id)
            ->where('status', 'active')
            ->count();

        // Get total enrollees
        $totalEnrollees = Enrollee::where('corporate_id', $corporate->id)->count();

        // Get outstanding invoices
        $outstandingInvoices = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('amount_due');

        $outstandingCount = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereIn('status', ['sent', 'overdue'])
            ->count();

        $overdueCount = CorporateInvoice::where('corporate_id', $corporate->id)
            ->where('status', 'overdue')
            ->count();

        // Get claims this month
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

        // Get recent claims
        $recentClaims = Claim::whereHas('enrollee', function($q) use ($corporate) {
                $q->where('corporate_id', $corporate->id);
            })
            ->with(['enrollee:id,first_name,last_name,enrollee_id'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Get recent invoices
        $recentInvoices = CorporateInvoice::where('corporate_id', $corporate->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Get annual premium from active plan
        $annualPremium = $corporate->plans()
            ->where('status', 'active')
            ->first()?->annual_premium ?? 0;

        return response()->json([
            'data' => [
                'corporate_name' => $corporate->name,
                'plan_name' => $corporate->plans()->where('status', 'active')->first()?->plan_name,
                'plan_expiry' => $corporate->contract_end_date,
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
                        'total_amount' => $invoice->amount_due,
                        'due_date' => $invoice->due_date,
                        'status' => $invoice->status,
                        'is_overdue' => $invoice->status === 'overdue',
                    ];
                }),
            ]
        ]);
    }

    /**
     * Get corporate enrollees (staff)
     */
    public function enrollees(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;
        
        if (!$corporate) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = Enrollee::where('corporate_id', $corporate->id)
            ->with(['plan', 'dependents', 'primaryHcp']);

        // Search
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                  ->orWhere('last_name', 'like', "%{$request->search}%")
                  ->orWhere('enrollee_id', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%")
                  ->orWhere('staff_id', 'like', "%{$request->search}%");
            });
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Pagination
        $perPage = $request->per_page ?? 20;
        $enrollees = $query->orderBy('last_name')->paginate($perPage);

        return response()->json([
            'data' => $enrollees->map(function($enrollee) {
                return [
                    'id' => $enrollee->id,
                    'first_name' => $enrollee->first_name,
                    'last_name' => $enrollee->last_name,
                    'email' => $enrollee->email,
                    'enrollee_id' => $enrollee->enrollee_id,
                    'staff_id' => $enrollee->staff_id,
                    'plan_name' => $enrollee->plan->plan_name ?? null,
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
                'active_count' => $enrollees->where('status', 'active')->count(),
                'suspended_count' => $enrollees->where('status', 'suspended')->count(),
                'with_dependants_count' => $enrollees->filter(fn($e) => $e->dependents->count() > 0)->count(),
            ],
        ]);
    }

    /**
     * Add a new enrollee (staff) from corporate portal
     */
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
            'plan_id' => 'required|exists:corporate_plans,id',
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        // Check if plan belongs to this corporate
        $plan = $corporate->plans()->find($request->plan_id);
        if (!$plan) {
            return response()->json(['message' => 'Invalid plan selected'], 422);
        }

        DB::beginTransaction();
        try {
            // Generate enrollee ID
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

    /**
     * Remove an enrollee (deactivate)
     */
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

    /**
     * Get corporate claims
     */
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

        // Search
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('claim_number', 'like', "%{$request->search}%")
                  ->orWhereHas('enrollee', function($eq) use ($request) {
                      $eq->where('first_name', 'like', "%{$request->search}%")
                         ->orWhere('last_name', 'like', "%{$request->search}%");
                  });
            });
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Date range filter
        if ($request->date_from) {
            $query->whereDate('service_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('service_date', '<=', $request->date_to);
        }

        // Pagination
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

    /**
     * Get corporate invoices
     */
    public function invoices(Request $request): JsonResponse
    {
        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = CorporateInvoice::where('corporate_id', $corporate->id);

        // Filter by status
        if ($request->status) {
            if ($request->status === 'unpaid') {
                $query->whereIn('status', ['sent', 'overdue']);
            } elseif ($request->status === 'paid') {
                $query->where('status', 'paid');
            } elseif ($request->status === 'overdue') {
                $query->where('status', 'overdue');
            }
        }

        // Pagination
        $perPage = $request->per_page ?? 20;
        $invoices = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Calculate summary
        $totalBilled = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereYear('created_at', now()->year)
            ->sum('amount_due');

        $totalPaid = CorporateInvoice::where('corporate_id', $corporate->id)
            ->where('status', 'paid')
            ->sum('amount_due');

        $outstanding = CorporateInvoice::where('corporate_id', $corporate->id)
            ->whereIn('status', ['sent', 'overdue'])
            ->sum('amount_due');

        $overdueCount = CorporateInvoice::where('corporate_id', $corporate->id)
            ->where('status', 'overdue')
            ->count();

        return response()->json([
            'data' => $invoices->map(function($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'period_from' => $invoice->period_start,
                    'period_to' => $invoice->period_end,
                    'period_label' => $invoice->period_start->format('M Y'),
                    'issue_date' => $invoice->issue_date,
                    'due_date' => $invoice->due_date,
                    'total_amount' => $invoice->amount_due,
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

    /**
     * Get corporate profile
     */
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

        // Get active plan
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

    /**
     * Update corporate profile
     */
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

        // Update or create primary contact
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

        // Update corporate address
        if ($request->address) {
            $corporate->update(['address' => $request->address]);
        }

        return response()->json(['message' => 'Profile updated successfully']);
    }

    /**
     * Export claims
     */
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

        // Apply filters
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

        // Generate CSV
        $filename = 'claims-export-' . now()->format('Y-m-d') . '.csv';
        $handle = fopen('php://temp', 'w');

        // Add headers
        fputcsv($handle, [
            'Claim Number',
            'Employee Name',
            'Service Date',
            'HCP',
            'Amount Claimed',
            'Amount Paid',
            'Status',
        ]);

        // Add data
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

    /**
     * Bulk upload enrollees
     */
    public function bulkUploadEnrollees(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx',
        ]);

        $user = $request->user();
        $corporate = $user->corporate;

        if (!$corporate) {
            return response()->json(['message' => 'Corporate not found'], 404);
        }

        // Process file upload (you can use your existing BulkEnrolleeImportService)
        // This is a placeholder - implement actual CSV processing
        try {
            // $this->importService->import($corporate, $request->file('file'));
            
            return response()->json([
                'message' => 'Bulk upload completed',
                'data' => [
                    'enrolled' => 0,
                    'errors' => 0,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Bulk upload failed: ' . $e->getMessage());
            return response()->json(['message' => 'Upload failed'], 500);
        }
    }
}