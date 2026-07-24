<?php
/**
 * PATCH NOTE: this is your real, current EnrolleePortalController.php,
 * verified complete and unchanged in every method that already existed —
 * including benefits(), which was substantially rewritten (mobile-oriented
 * response shape) since I last touched this file. That work is preserved
 * exactly as-is, not overwritten.
 *
 * FIXES [RESTORED]: confirmUtilization, disputeUtilization, reimbursements,
 * submitReimbursement were referenced by routes/api.php but missing from
 * this file — a real, live bug (those 4 routes were 500ing). Restored here.
 * claims() also gets provider_payment/enrollee_confirmation added to its
 * response, same fix — the DB columns and model support existed, the
 * controller just never exposed them.
 *
 * NEW [PHASE 8]: appointment booking — bookAppointment, appointments,
 * cancelAppointment.
 */
// app/Http/Controllers/Portal/EnrolleePortalController.php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\HealthCareProvider;
use App\Models\HcpCheckin;
use App\Models\ReimbursementRequest; // [RESTORED]
use App\Models\Appointment; // [PHASE 8]
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use App\Models\Ticket;
use App\Services\TicketService;
use App\Models\Doctor;

class EnrolleePortalController extends Controller
{
    public function __construct(protected TicketService $ticketService) {}

    /**
     * Get the enrollee's ID card details
     */
    public function idCard(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json([
                'message' => 'No enrollee record found for this user',
                'data' => null
            ], 404);
        }

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
    
            $enrollee->load(['plan', 'corporate', 'primaryHcp', 'dependents']);
    
            $pdf = Pdf::loadView('pdf.enrollee_id_card', [
                'enrollee' => $enrollee,
                'user' => $user,
                'date' => now()->format('Y-m-d')
            ]);
    
            $pdf->setPaper('a4', 'portrait');
            $pdf->setOptions([
                'defaultFont' => 'sans-serif',
                'isRemoteEnabled' => true
            ]);
    
            Log::info('PDF generated successfully');
    
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

        $benefitUsed = Claim::where('enrollee_id', $enrollee->id)
            ->whereYear('created_at', now()->year)
            ->whereIn('status', ['approved', 'paid'])
            ->sum('total_amount_approved');

        $maxBenefit = $enrollee->plan->max_benefit_value ?? 0;

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
     * [UNCHANGED — this is your independently-evolved mobile version, preserved exactly]
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

        $benefitUsed = Claim::where('enrollee_id', $enrollee->id)
            ->whereYear('created_at', now()->year)
            ->whereIn('status', ['approved', 'paid'])
            ->sum('total_amount_approved');

        $maxBenefit = $plan->max_benefit_value ?? 0;

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

        $limits = [
            'Inpatient Limit'  => (int) ($plan->inpatient_limit ?? 0),
            'Outpatient Limit' => (int) ($plan->outpatient_limit ?? 0),
            'Dental Limit'     => (int) ($plan->dental_limit ?? 0),
            'Optical Limit'    => (int) ($plan->optical_limit ?? 0),
            'Maternity Limit'  => (int) ($plan->maternity_limit ?? 0),
        ];

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
     * [FIX — RESTORED] now includes provider_payment (payment transparency)
     * and enrollee_confirmation (utilization confirmation), matching what
     * confirmUtilization()/disputeUtilization() below actually need.
     */
    public function claims(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;
        
        if (!$enrollee) {
            return response()->json(['data' => [], 'meta' => []], 200);
        }

        $query = Claim::where('enrollee_id', $enrollee->id)
            ->with(['hcp', 'dependent', 'payment']); // [FIX] eager-load payment

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

                    // [FIX — RESTORED] payment transparency
                    'provider_payment' => $claim->payment ? [
                        'amount' => $claim->payment->amount,
                        'status' => $claim->payment->status,
                        'paid_at' => $claim->payment->paid_at?->format('Y-m-d'),
                        'payment_reference' => $claim->payment->payment_reference,
                    ] : null,

                    // [FIX — RESTORED] utilization confirmation
                    'enrollee_confirmation' => [
                        'status' => $claim->enrollee_confirmation_status?->value ?? 'pending',
                        'confirmed_at' => $claim->enrollee_confirmed_at?->format('Y-m-d H:i'),
                        'disputed_at' => $claim->enrollee_disputed_at?->format('Y-m-d H:i'),
                        'dispute_reason' => $claim->enrollee_dispute_reason,
                        'can_act' => method_exists($claim, 'canBeConfirmedByEnrollee') ? $claim->canBeConfirmedByEnrollee() : false,
                    ],
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
     * [FIX — RESTORED] Enrollee confirms a claim represents a service they
     * actually received. Was referenced by routes/api.php but missing from
     * this file.
     */
    public function confirmUtilization(Request $request, Claim $claim): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee || $claim->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Claim not found'], 404);
        }

        if (!method_exists($claim, 'canBeConfirmedByEnrollee') || !$claim->canBeConfirmedByEnrollee()) {
            return response()->json(['message' => 'This claim can no longer be confirmed or disputed.'], 422);
        }

        $claim->update([
            'enrollee_confirmation_status' => \App\Enums\ClaimConfirmationStatus::CONFIRMED,
            'enrollee_confirmed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Thanks — you\'ve confirmed this claim.',
            'data' => ['status' => 'confirmed'],
        ]);
    }

    /**
     * [FIX — RESTORED] Enrollee disputes a claim.
     */
    public function disputeUtilization(Request $request, Claim $claim): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:10|max:2000']);

        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee || $claim->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Claim not found'], 404);
        }

        if (!method_exists($claim, 'canBeConfirmedByEnrollee') || !$claim->canBeConfirmedByEnrollee()) {
            return response()->json(['message' => 'This claim can no longer be confirmed or disputed.'], 422);
        }

        $claim->update([
            'enrollee_confirmation_status' => \App\Enums\ClaimConfirmationStatus::DISPUTED,
            'enrollee_disputed_at' => now(),
            'enrollee_dispute_reason' => $request->reason,
        ]);

        if (class_exists(\App\Models\FraudFlag::class)) {
            \App\Models\FraudFlag::create([
                'claim_id' => $claim->id,
                'hcp_id' => $claim->hcp_id,
                'enrollee_id' => $claim->enrollee_id,
                'flag_type' => 'member_disputed_utilization',
                'flag_score' => 50,
                'details' => ['reason' => $request->reason, 'source' => 'enrollee_portal'],
                'description' => 'Member reported this claim does not reflect a service they received.',
                'status' => 'open',
            ]);
        }

        return response()->json([
            'message' => 'Dispute recorded. Our team will review this.',
            'data' => ['status' => 'disputed'],
        ]);
    }

    /**
     * Find healthcare providers
     */
    public function findHcp(Request $request): JsonResponse
    {
        $query = HealthCareProvider::query()
            ->where('status', 'active');

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('address', 'like', "%{$request->search}%")
                  ->orWhere('city', 'like', "%{$request->search}%");
            });
        }

        if ($request->tier) {
            $query->where('tier', $request->tier);
        }

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

    public function searchDoctors(Request $request): JsonResponse
    {
        $query = Doctor::where('status', 'active')->with('hcp:id,name,city');
        if ($request->hcp_id) $query->where('hcp_id', $request->hcp_id);
        if ($request->specialty) $query->where('specialty', 'like', "%{$request->specialty}%");
        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                ->orWhere('specialty', 'like', "%{$request->search}%");
            });
        }
        $doctors = $query->limit(30)->get();
        return response()->json([
            'data' => $doctors->map(fn($d) => [
                'id' => $d->id, 'name' => $d->name, 'specialty' => $d->specialty,
                'qualification' => $d->qualification, 'hcp_id' => $d->hcp_id,
                'hcp_name' => $d->hcp->name, 'hcp_city' => $d->hcp->city,
            ]),
        ]);
    }

    public function doctorSlots(Request $request, Doctor $doctor): JsonResponse
    {
        $request->validate(['date' => 'required|date|after_or_equal:today']);
        return response()->json(['data' => $doctor->availableSlots($request->date)]);
}

    public function complaints(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee) {
            return response()->json(['data' => []], 200);
        }

        $tickets = Ticket::forEnrollee($enrollee->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $tickets->map(fn($t) => [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'subject' => $t->subject,
                'description' => $t->description,
                'category' => $t->category,
                'status' => $t->status,
                'priority' => $t->priority,
                'hcp_name' => $t->hcp_name,
                'created_at' => $t->created_at?->toISOString(),
                'resolution_note' => $t->resolution_note,
                'resolved_at' => $t->resolved_at?->format('Y-m-d'),
            ]),
        ]);
    }

    public function submitComplaint(Request $request): JsonResponse
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'required|string|min:20',
            'category' => 'nullable|string',
            'hcp_name' => 'nullable|string',
        ]);

        $user = $request->user();

        if (!$user->enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        $ticket = $this->ticketService->createForUser($user, $request->only(['subject', 'description', 'category', 'hcp_name']));

        return response()->json([
            'message' => 'Complaint submitted successfully',
            'data' => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'status' => $ticket->status,
            ],
        ], 201);
    }

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

    public function ticketShow(Request $request, Ticket $ticket): JsonResponse
    {
        $enrollee = $request->user()->enrollee;

        if (!$enrollee || $ticket->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        $ticket->load('publicMessages.user:id,name,user_type');

        return response()->json([
            'data' => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'messages' => $ticket->publicMessages->map(fn($m) => [
                    'id' => $m->id,
                    'sender_type' => $m->sender_type,
                    'message' => $m->message,
                    'created_at' => $m->created_at?->format('Y-m-d H:i'),
                ]),
            ],
        ]);
    }

    public function ticketReply(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate(['message' => 'required|string|min:1|max:2000']);

        $enrollee = $request->user()->enrollee;

        if (!$enrollee || $ticket->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Ticket not found'], 404);
        }

        if (!$ticket->isEditableByRaiser()) {
            return response()->json(['message' => 'This ticket is closed and can no longer be replied to.'], 422);
        }

        $this->ticketService->addMessage($ticket, $request->user(), $request->message);

        return response()->json(['message' => 'Reply sent.']);
    }

    // ─── [RESTORED — Phase 1] Reimbursement requests ───────────────────────

    public function reimbursements(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee) {
            return response()->json(['data' => []], 200);
        }

        $requests = ReimbursementRequest::forEnrollee($enrollee->id)
            ->with('claim')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $requests->map(function($r) {
                return [
                    'id' => $r->id,
                    'reimbursement_number' => $r->reimbursement_number,
                    'claim_number' => $r->claim->claim_number ?? null,
                    'amount_requested' => $r->amount_requested,
                    'amount_approved' => $r->amount_approved,
                    'reason' => $r->reason,
                    'status' => $r->status,
                    'reviewer_notes' => $r->reviewer_notes,
                    'created_at' => $r->created_at?->format('Y-m-d'),
                    'reviewed_at' => $r->reviewed_at?->format('Y-m-d'),
                    'paid_at' => $r->paid_at?->format('Y-m-d'),
                ];
            }),
        ]);
    }

    public function submitReimbursement(Request $request): JsonResponse
    {
        $request->validate([
            'claim_id' => 'nullable|exists:claims,id',
            'dependent_id' => 'nullable|exists:dependents,id',
            'amount_requested' => 'required|numeric|min:1',
            'reason' => 'required|string|min:10|max:2000',
            'receipt' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee) {
            return response()->json(['message' => 'Enrollee not found'], 404);
        }

        if ($request->claim_id) {
            $ownsClaim = Claim::where('id', $request->claim_id)
                ->where('enrollee_id', $enrollee->id)
                ->exists();

            if (!$ownsClaim) {
                return response()->json(['message' => 'Claim not found'], 404);
            }
        }

        $reimbursementNumber = ReimbursementRequest::generateUniqueId(
            'RMB', 'reimbursement_number', 6, $user->branch?->code
        );

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $fileName = $reimbursementNumber . '_' . time() . '.' . $file->getClientOriginalExtension();
            $folder = "reimbursements/{$enrollee->id}/receipts";
            \Illuminate\Support\Facades\Storage::disk('local')->putFileAs($folder, $file, $fileName);
            $receiptPath = "{$folder}/{$fileName}";
        }

        $reimbursement = ReimbursementRequest::create([
            'branch_id' => $enrollee->branch_id,
            'reimbursement_number' => $reimbursementNumber,
            'enrollee_id' => $enrollee->id,
            'dependent_id' => $request->dependent_id,
            'claim_id' => $request->claim_id,
            'amount_requested' => $request->amount_requested,
            'reason' => $request->reason,
            'receipt_path' => $receiptPath,
            'status' => \App\Enums\ReimbursementStatus::PENDING,
        ]);

        return response()->json([
            'message' => 'Reimbursement request submitted.',
            'data' => [
                'id' => $reimbursement->id,
                'reimbursement_number' => $reimbursement->reimbursement_number,
                'status' => $reimbursement->status,
            ],
        ], 201);
    }

    // ─── [PHASE 8] Appointment booking ──────────────────────────────────────

    /**
     * List own upcoming and past appointments.
     */
    public function appointments(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollee = $user->enrollee;

        if (!$enrollee) {
            return response()->json(['data' => []], 200);
        }

        $query = Appointment::where('enrollee_id', $enrollee->id)
            ->with(['hcp:id,name,phone,address', 'dependent:id,first_name,last_name']);

        if ($request->upcoming) {
            $query->whereIn('status', ['requested', 'confirmed', 'rescheduled'])
                ->where('preferred_date', '>=', now()->toDateString());
        }

        $appointments = $query->orderByDesc('preferred_date')->get();

        return response()->json([
            'data' => $appointments->map(fn($a) => [
                'id' => $a->id,
                'hcp_name' => $a->hcp->name ?? null,
                'hcp_address' => $a->hcp->address ?? null,
                'hcp_phone' => $a->hcp->phone ?? null,
                'dependent_name' => $a->dependent ? $a->dependent->first_name . ' ' . $a->dependent->last_name : null,
                'preferred_date' => $a->preferred_date?->format('Y-m-d'),
                'preferred_time_slot' => $a->preferred_time_slot,
                'confirmed_date' => $a->confirmed_date?->format('Y-m-d'),
                'confirmed_time' => $a->confirmed_time,
                'reason' => $a->reason,
                'status' => $a->status,
                'cancellation_reason' => $a->cancellation_reason,
                'is_cancellable' => $a->isCancellable(),
                'created_at' => $a->created_at?->format('Y-m-d'),
            ]),
        ]);
    }

    /**
     * Book a new appointment. No real slot-availability system exists in
     * this codebase (see the migration's docblock) — this is a request the
     * facility confirms, not a guaranteed booking against a live calendar.
     */
    public function bookAppointment(Request $request): JsonResponse
    {
        $request->validate([
            'hcp_id' => 'required|integer|exists:health_care_providers,id',
            'doctor_id' => 'nullable|integer|exists:doctors,id',
            'slot_time' => 'nullable|string',
            'dependent_id' => 'nullable|integer|exists:dependents,id',
            'preferred_date' => 'required|date|after_or_equal:today',
            'preferred_time_slot' => 'nullable|string|in:morning,afternoon,evening',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $enrollee = $user->enrollee;
        if (!$enrollee) return response()->json(['message' => 'Enrollee not found'], 404);
        if (!$enrollee->canMakeClaim()) return response()->json(['message' => 'Your plan is not currently active for booking.'], 422);

        $isDoctorSlotBooking = $request->doctor_id && $request->slot_time;

        if ($isDoctorSlotBooking) {
            $doctor = Doctor::findOrFail($request->doctor_id);
            $availableSlots = $doctor->availableSlots($request->preferred_date);
            if (!in_array($request->slot_time, $availableSlots)) {
                return response()->json(['message' => 'That slot is no longer available. Please pick another.'], 422);
            }
        }

        $appointment = \App\Models\Appointment::create([
            'branch_id' => $enrollee->branch_id,
            'enrollee_id' => $enrollee->id,
            'dependent_id' => $request->dependent_id,
            'hcp_id' => $request->hcp_id,
            'doctor_id' => $request->doctor_id,
            'preferred_date' => $request->preferred_date,
            'preferred_time_slot' => $request->preferred_time_slot,
            'reason' => $request->reason,
            'notes' => $request->notes,
            'status' => $isDoctorSlotBooking ? 'confirmed' : 'requested',
            'confirmed_date' => $isDoctorSlotBooking ? $request->preferred_date : null,
            'confirmed_time' => $isDoctorSlotBooking ? $request->slot_time : null,
        ]);

        return response()->json([
            'message' => $isDoctorSlotBooking
                ? "Confirmed for {$request->preferred_date} at {$request->slot_time}."
                : 'Appointment requested. The facility will confirm your slot.',
            'data' => ['id' => $appointment->id, 'status' => $appointment->status],
        ], 201);
    }

    public function cancelAppointment(Request $request, Appointment $appointment): JsonResponse
    {
        $enrollee = $request->user()->enrollee;

        if (!$enrollee || $appointment->enrollee_id !== $enrollee->id) {
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        if (!$appointment->isCancellable()) {
            return response()->json(['message' => 'This appointment can no longer be cancelled.'], 422);
        }

        $appointment->update([
            'status' => 'cancelled',
            'cancellation_reason' => $request->input('reason', 'Cancelled by member'),
        ]);

        return response()->json(['message' => 'Appointment cancelled.']);
    }
}
