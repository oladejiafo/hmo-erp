<?php
// app/Http/Controllers/Portal/EnrolleePortalController.php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\HealthCareProvider;
use App\Models\Complaint;
use App\Models\HcpCheckin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class EnrolleePortalController extends Controller
{
    /**
     * Get the enrollee's ID card details
     */
    public function idCard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get the enrollee record linked to this user
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json([
                'message' => 'No enrollee record found for this user',
                'data' => null
            ], 404);
        }

        // Load relationships
        $enrollee->load(['plan', 'corporate', 'primaryHcp', 'dependents']);

        return response()->json([
            'data' => [
                'full_name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                'member_number' => $enrollee->enrollee_id,
                'plan_name' => $enrollee->plan->plan_name ?? 'N/A',
                'corporate_name' => $enrollee->corporate->name ?? 'N/A',
                'date_of_birth' => $enrollee->date_of_birth?->format('Y-m-d'),
                'gender' => $enrollee->gender,
                'status' => $enrollee->status,
                'expiry_date' => $enrollee->expiry_date?->format('Y-m-d'),
                'primary_hcp' => $enrollee->primaryHcp->name ?? null,
                'primary_hcp_phone' => $enrollee->primaryHcp->phone ?? null,
                'dependants' => $enrollee->dependents->map(function($dep) {
                    return [
                        'id' => $dep->id,
                        'first_name' => $dep->first_name,
                        'last_name' => $dep->last_name,
                        'relationship' => $dep->relationship,
                        'gender' => $dep->gender,
                        'date_of_birth' => $dep->date_of_birth?->format('Y-m-d'),
                        'member_number' => $dep->dependent_id,
                    ];
                }),
                'hmo_phone' => config('hmo.helpline', '0800-HMO-HELP'),
            ]
        ]);
    }

    /**
     * Download ID card as PDF
     */
    public function downloadIdCard(Request $request)
    {
        Log::info('Download ID card requested', [
            'user_id' => $request->user()?->id,
            'token' => $request->get('token') ? 'present' : 'not present',
            'headers' => $request->headers->all()
        ]);
    
        try {
            $user = $request->user();
            
            if (!$user) {
                Log::error('No authenticated user');
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
    
            $enrollee = $user->enrollee;
            
            if (!$enrollee) {
                Log::error('No enrollee record found for user', ['user_id' => $user->id]);
                return response()->json(['message' => 'No enrollee record found'], 404);
            }
    
            Log::info('Found enrollee', ['enrollee_id' => $enrollee->id]);
    
            // Load relationships
            $enrollee->load(['plan', 'corporate', 'primaryHcp', 'dependents']);
    
            // Generate PDF
            $pdf = Pdf::loadView('pdf.enrollee_id_card', [
                'enrollee' => $enrollee,
                'user' => $user,
                'date' => now()->format('Y-m-d')
            ]);
    
            // Set PDF options
            $pdf->setPaper('a4', 'portrait');
            $pdf->setOptions([
                'defaultFont' => 'sans-serif',
                'isRemoteEnabled' => true
            ]);
    
            Log::info('PDF generated successfully');
    
            // Download the PDF
            return $pdf->download('id-card-' . $enrollee->enrollee_id . '.pdf');
    
        } catch (\Exception $e) {
            Log::error('Error generating PDF: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Error generating PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get enrollee dashboard data
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json(['data' => null], 404);
        }

        $enrollee->load(['plan', 'corporate', 'dependents']);

        // Calculate benefit used from claims
        $benefitUsed = Claim::where('enrollee_id', $enrollee->id)
            ->whereYear('created_at', now()->year)
            ->whereIn('status', ['approved', 'paid'])
            ->sum('total_amount_approved');

        $maxBenefit = $enrollee->plan->max_benefit_value ?? 0;

        // Get recent claims
        $recentClaims = Claim::where('enrollee_id', $enrollee->id)
            ->with('hcp')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'member_number' => $enrollee->enrollee_id,
                'full_name' => $enrollee->first_name . ' ' . $enrollee->last_name,
                'plan_name' => $enrollee->plan->plan_name ?? 'N/A',
                'corporate_name' => $enrollee->corporate->name ?? 'N/A',
                'status' => $enrollee->status,
                'coverage_end' => $enrollee->expiry_date?->format('Y-m-d'),
                'max_benefit' => $maxBenefit,
                'benefit_used' => $benefitUsed,
                'benefit_balance' => $maxBenefit - $benefitUsed,
                'dependants' => $enrollee->dependents->map(function($dep) {
                    return [
                        'id' => $dep->id,
                        'first_name' => $dep->first_name,
                        'last_name' => $dep->last_name,
                        'relationship' => $dep->relationship,
                    ];
                }),
                'recent_claims' => $recentClaims->map(function($claim) {
                    return [
                        'id' => $claim->id,
                        'claim_number' => $claim->claim_number,
                        'hcp_name' => $claim->hcp->name ?? null,
                        'service_date' => $claim->service_date?->format('Y-m-d'),
                        'total_amount_claimed' => $claim->total_amount_claimed,
                        'status' => $claim->status,
                    ];
                }),
            ]
        ]);
    }

    /**
     * Get enrollee benefits summary mapped for mobile frontend layouts
     */
    public function benefits(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json(['data' => null], 404);
        }

        $enrollee->load('plan');
        $plan = $enrollee->plan;

        if (!$plan) {
            return response()->json(['data' => null], 404);
        }

        // Calculate benefit used from claims
        $benefitUsed = Claim::where('enrollee_id', $enrollee->id)
            ->whereYear('created_at', now()->year)
            ->whereIn('status', ['approved', 'paid'])
            ->sum('total_amount_approved');

        $maxBenefit = $plan->max_benefit_value ?? 0;

        // Map database coverage booleans into a raw string array for frontend checkmarks
        $features = [];
        if ($plan->dental_covered)        $features[] = 'Dental Care Coverage';
        if ($plan->optical_covered)       $features[] = 'Optical Care & Lenses';
        if ($plan->maternity_covered)     $features[] = 'Maternity & Delivery Coverage';
        if ($plan->surgery_covered)       $features[] = 'Surgical Procedures Care';
        if ($plan->physiotherapy_covered) $features[] = 'Physiotherapy Sessions';
        if ($plan->mental_health_covered)  $features[] = 'Mental Health Support';
        
        if (empty($features)) {
            $features = ['General Consultations', 'Primary Care Services', 'Basic Pharmaceutical Access'];
        }

        // Object map for Object.entries() evaluation on mobile UI
        $limits = [
            'Inpatient Limit'  => (int) ($plan->inpatient_limit ?? 0),
            'Outpatient Limit' => (int) ($plan->outpatient_limit ?? 0),
            'Dental Limit'     => (int) ($plan->dental_limit ?? 0),
            'Optical Limit'    => (int) ($plan->optical_limit ?? 0),
            'Maternity Limit'  => (int) ($plan->maternity_limit ?? 0),
        ];

        // Assign frontend UI accent theme color dots based on plan tier values
        $uiColor = match(strtolower($plan->tier ?? '')) {
            'bronze'   => '#cd7f32',
            'silver'   => '#9e9e9e',
            'gold'     => '#ffb300',
            'platinum' => '#335eea',
            default    => '#4caf50',
        };

        return response()->json([
            'data' => [
                'plan_id'         => $plan->id,
                'name'            => $plan->plan_name ?? 'N/A',
                'plan_tier'       => $plan->tier ?? 'basic',
                'tagline'         => $plan->description ?? "Comprehensive package under tier: " . ucfirst($plan->tier ?? 'basic'),
                'color'           => $uiColor,
                'max_benefit'     => $maxBenefit,
                'benefit_used'    => $benefitUsed,
                'benefit_balance' => $maxBenefit - $benefitUsed,
                'price_monthly'   => $plan->copay_amount > 0 ? (int)$plan->copay_amount : 12500,
                'coverage_end'    => $enrollee->expiry_date?->format('Y-m-d'),
                'ward_class'      => $plan->ward_class ?? 'Standard',
                'features'        => $features,
                'limits'          => $limits,
            ]
        ]);
    }

    /**
     * Get enrollee claims with filtering
     */
    public function claims(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = Claim::where('enrollee_id', $enrollee->id)
            ->with(['hcp', 'dependent']);

        // Apply filters
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('claim_number', 'like', "%{$request->search}%")
                  ->orWhereHas('hcp', function($h) use ($request) {
                      $h->where('name', 'like', "%{$request->search}%");
                  });
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Pagination
        $perPage = $request->per_page ?? 15;
        $claims = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => collect($claims->items())->map(function($claim) {
                return [
                    'id' => $claim->id,
                    'claim_number' => $claim->claim_number,
                    'hcp_name' => $claim->hcp->name ?? null,
                    'service_date' => $claim->service_date?->format('Y-m-d'),
                    'total_amount_claimed' => $claim->total_amount_claimed,
                    'total_amount_paid' => $claim->total_amount_paid,
                    'status' => $claim->status,
                    'dependent_name' => $claim->dependent ? 
                        $claim->dependent->first_name . ' ' . $claim->dependent->last_name : null,
                    'diagnosis_description' => $claim->diagnosis_description,
                    'rejection_reason' => $claim->rejection_reason,
                    'is_pre_authorized' => $claim->is_pre_authorized,
                    'pre_auth_code' => $claim->pre_auth_code,
                ];
            }),
            'meta' => [
                'current_page' => $claims->currentPage(),
                'last_page' => $claims->lastPage(),
                'per_page' => $claims->perPage(),
                'total' => $claims->total(),
            ],
        ]);
    }

    /**
     * Find healthcare providers
     */
    public function findHcp(Request $request): JsonResponse
    {
        $query = HealthCareProvider::query()
            ->where('status', 'active');

        // Search by name or location
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('address', 'like', "%{$request->search}%")
                  ->orWhere('city', 'like', "%{$request->search}%");
            });
        }

        // Filter by tier
        if ($request->tier) {
            $query->where('tier', $request->tier);
        }

        // Filter by type
        if ($request->type) {
            $query->where('type', $request->type);
        }

        $hcps = $query->limit(50)->get();

        return response()->json([
            'data' => $hcps->map(function($hcp) {
                return [
                    'id' => $hcp->id,
                    'name' => $hcp->name,
                    'type' => $hcp->type,
                    'tier' => $hcp->tier,
                    'address' => $hcp->address,
                    'city' => $hcp->city,
                    'state' => $hcp->state,
                    'phone' => $hcp->phone,
                    'email' => $hcp->email,
                    'performance_score' => $hcp->performance_score,
                    'services_available' => $hcp->services ?? [],
                ];
            }),
        ]);
    }

    /**
     * Get complaints for the enrollee
     */
    public function complaints(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json(['data' => []], 200);
        }

        $complaints = Complaint::where('enrollee_id', $enrollee->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $complaints->map(function($complaint) {
                return [
                    'id' => $complaint->id,
                    'ticket_number' => $complaint->ticket_number,
                    'subject' => $complaint->subject,
                    'description' => $complaint->description,
                    'category' => $complaint->category,
                    'status' => $complaint->status,
                    'hcp_name' => $complaint->hcp_name,
                    'created_at' => $complaint->created_at?->toISOString(),
                    'resolution_note' => $complaint->resolution_note,
                    'resolved_at' => $complaint->resolved_at?->format('Y-m-d'),
                ];
            }),
        ]);
    }

    /**
     * Submit a new complaint
     */
    public function submitComplaint(Request $request): JsonResponse
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'required|string|min:20',
            'category' => 'nullable|string',
            'hcp_name' => 'nullable|string',
        ]);

        $user = $request->user();
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        // Generate ticket number
        $ticketNumber = 'CMP-' . date('Y') . '-' . str_pad(Complaint::count() + 1, 6, '0', STR_PAD_LEFT);

        $complaint = Complaint::create([
            'enrollee_id' => $enrollee->id,
            'ticket_number' => $ticketNumber,
            'subject' => $request->subject,
            'description' => $request->description,
            'category' => $request->category,
            'hcp_name' => $request->hcp_name,
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Complaint submitted successfully',
            'data' => [
                'id' => $complaint->id,
                'ticket_number' => $complaint->ticket_number,
                'status' => $complaint->status,
            ],
        ], 201);
    }

    /**
     * [PHASE 2b] — Enrollee taps "I'm here" on arrival at a facility.
     * Creates a check-in row the provider's dashboard polls for.
     */
    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'hcp_id' => 'required|integer|exists:health_care_providers,id',
            'dependent_id' => 'nullable|integer|exists:dependents,id',
        ]);

        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        if (!$enrollee->canMakeClaim()) {
            // Reuses the same eligibility check claims already rely on
            // (active status, plan not expired, benefit balance > 0) —
            // no point alerting a front desk for a member who can't
            // actually be seen under their plan right now.
            return response()->json([
                'message' => 'Your plan is not currently active for check-in. Contact your HMO if this seems wrong.',
            ], 422);
        }

        $checkin = HcpCheckin::create([
            'branch_id' => $enrollee->branch_id,
            'hcp_id' => $request->hcp_id,
            'enrollee_id' => $enrollee->id,
            'dependent_id' => $request->dependent_id,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Checked in. Front desk has been notified.',
            'data' => ['id' => $checkin->id, 'status' => $checkin->status],
        ], 201);
    }
}
