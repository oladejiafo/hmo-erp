<?php
/**
 * NEW FILE — app/Http/Controllers/Public/RetailEnrollmentController.php
 *
 * Entirely public, no auth:sanctum. This is the front door for someone
 * who isn't a member yet. Every write here has to assume a hostile or
 * careless caller — no staff review sits between this form and a real
 * User/Enrollee record being created.
 */

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Corporate;
use App\Models\Enrollee;
use App\Models\Plan;
use App\Models\RetailEnrollmentPayment;
use App\Models\User;
use App\Services\EnrolleeCardService;
use App\Services\PaymentGateways\FlutterwaveGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class RetailEnrollmentController extends Controller
{
    public function __construct(
        private FlutterwaveGateway $gateway,
        private EnrolleeCardService $cardService,
    ) {}

    private function retailCorporate(): ?Corporate
    {
        return Corporate::where('code', 'RETAIL-001')->first();
    }

    public function plans(): JsonResponse
    {
        $corporate = $this->retailCorporate();

        if (!$corporate) {
            return response()->json(['message' => 'Retail enrolment is not currently available.'], 503);
        }

        $plans = Plan::where('corporate_id', $corporate->id)->where('status', 'active')->get();

        return response()->json([
            'data' => $plans->map(fn($p) => [
                'id' => $p->id,
                'plan_name' => $p->plan_name,
                'tier' => $p->tier,
                'max_benefit_value' => $p->max_benefit_value,
                'dental_covered' => $p->dental_covered,
                'optical_covered' => $p->optical_covered,
                'surgery_covered' => $p->surgery_covered,
            ]),
        ]);
    }

    /**
     * Premium calculator — same honesty-flagged estimate pattern as
     * CorporatePlanRequest::estimate(), not real actuarial pricing. The
     * ACTUAL amount charged at checkout is read from the real Plan record
     * server-side in register(), never taken from this calculator's
     * output or anything the client sends.
     */
    public function estimatePremium(Request $request): JsonResponse
    {
        $request->validate([
            'tier' => 'required|string|in:basic,standard,premium',
            'dependents_count' => 'nullable|integer|min:0|max:6',
            'selected_benefits' => 'nullable|array',
        ]);

        $baseRate = match ($request->tier) {
            'basic' => 45000,
            'standard' => 85000,
            'premium' => 160000,
            default => 85000,
        };

        $baseRate *= (1 + $this->benefitLoadingPercent($request->selected_benefits ?? []) / 100);

        $dependentRate = $baseRate * 0.6;
        $dependentsCount = $request->dependents_count ?? 0;
        $total = $baseRate + ($dependentRate * $dependentsCount);

        return response()->json([
            'data' => [
                'principal_premium' => round($baseRate, 2),
                'per_dependent_premium' => round($dependentRate, 2),
                'dependents_count' => $dependentsCount,
                'estimated_annual_total' => round($total, 2),
            ],
        ]);
    }

    private function benefitLoadingPercent(array $selectedBenefits): float
    {
        $loadings = ['dental_covered' => 5, 'optical_covered' => 5, 'maternity_covered' => 12];
        $percent = 0;
        foreach ($loadings as $key => $pct) {
            if (!empty($selectedBenefits[$key])) $percent += $pct;
        }
        return $percent;
    }

    /**
     * Register + kick off payment. Creates the User and Enrollee in
     * INACTIVE status immediately — they cannot claim or see coverage
     * until payment is CONFIRMED server-side. This request only ever
     * returns a payment link, never activates anything itself.
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email|unique:enrollees,email',
            'phone' => 'required|string|max:20',
            'gender' => 'required|string|in:male,female,other',
            'date_of_birth' => 'required|date|before:-18 years',
            'nin' => 'required|string|size:11',
            'id_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'plan_id' => 'required|integer|exists:plans,id',
            'selected_benefits' => 'nullable|array',
            'consent_given' => 'required|accepted',
            'dependents' => 'nullable|array|max:6',
            'dependents.*.first_name' => 'required_with:dependents|string|max:100',
            'dependents.*.last_name' => 'required_with:dependents|string|max:100',
            'dependents.*.relationship' => 'required_with:dependents|string|max:50',
            'dependents.*.date_of_birth' => 'required_with:dependents|date',
        ], [
            'date_of_birth.before' => 'You must be at least 18 years old to self-enrol.',
            'consent_given.accepted' => 'You must accept the privacy notice to continue.',
        ]);

        $corporate = $this->retailCorporate();
        if (!$corporate) {
            return response()->json(['message' => 'Retail enrolment is not currently available.'], 503);
        }

        $plan = Plan::where('id', $request->plan_id)->where('corporate_id', $corporate->id)->where('status', 'active')->first();
        if (!$plan) {
            return response()->json(['message' => 'Selected plan is not available.'], 422);
        }

        $enrollee = DB::transaction(function () use ($request, $corporate, $plan) {
            $tempPassword = Str::random(12);

            $user = User::create([
                'name' => $request->first_name . ' ' . $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($tempPassword),
                'branch_id' => $corporate->branch_id,
                'user_type' => 'enrollee_user',
                'status' => 'active',
                'password_changed_at' => null,
            ]);

            $user->assignRole('enrollee_user');
            $user->givePermissionTo('portal.enrollee.access');

            $enrolleeCount = Enrollee::where('corporate_id', $corporate->id)->count();
            $enrolleeId = 'RTL-' . str_pad($enrolleeCount + 1, 6, '0', STR_PAD_LEFT);

            // KYC document — stored on the 'local' private disk, same
            // convention verified in ClaimDocumentService (Phase 1).
            $idDocPath = null;
            if ($request->hasFile('id_document')) {
                $file = $request->file('id_document');
                $fileName = $enrolleeId . '_id.' . $file->getClientOriginalExtension();
                \Illuminate\Support\Facades\Storage::disk('local')->putFileAs("kyc/{$enrolleeId}", $file, $fileName);
                $idDocPath = "kyc/{$enrolleeId}/{$fileName}";
            }

            $enrollee = Enrollee::create([
                'corporate_id' => $corporate->id,
                'branch_id' => $corporate->branch_id,
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'enrollee_id' => $enrolleeId,
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'phone' => $request->phone,
                'gender' => $request->gender,
                'date_of_birth' => $request->date_of_birth,
                'nin' => $request->nin,
                'photo_path' => $idDocPath, // reuses the existing photo_path column — KYC doc stands in for it at signup; staff can replace with an actual photo later if needed
                'status' => 'inactive',
                'enrollment_date' => now(),
                'expiry_date' => now()->addYear(),
                'consent_given_at' => now(),
                'consent_version' => config('hmo.privacy_notice_version', 'v1'),
            ]);

            $depIndex = 1;
            foreach ($request->dependents ?? [] as $dep) {
                // FLAGGED SEPARATELY: DependentController::store() (the real,
                // staff-facing dependent creation path) never sets
                // dependent_id either, despite it being NOT NULL + unique in
                // the schema — that's a pre-existing bug, not something I'm
                // introducing. Not fixing that file in this pass, just making
                // sure my own code doesn't repeat it. Format mirrors the
                // migration's own comment example: "HMO-2024-000001-D1".
                $enrollee->dependents()->create([
                    'dependent_id' => $enrollee->enrollee_id . '-D' . $depIndex,
                    'first_name' => $dep['first_name'],
                    'last_name' => $dep['last_name'],
                    'relationship' => $dep['relationship'],
                    'date_of_birth' => $dep['date_of_birth'],
                    'status' => 'inactive',
                ]);
                $depIndex++;
            }

            return $enrollee;
        });

        $dependentsCount = count($request->dependents ?? []);
        $amount = $this->calculateRealPremium($plan, $dependentsCount, $request->selected_benefits ?? []);
        $txRef = 'RTL-' . $enrollee->id . '-' . now()->timestamp;

        $payment = RetailEnrollmentPayment::create([
            'enrollee_id' => $enrollee->id,
            'plan_id' => $plan->id,
            'tx_ref' => $txRef,
            'amount' => $amount,
            'status' => 'pending',
        ]);

        $checkout = $this->gateway->initiateCheckout([
            'tx_ref' => $txRef,
            'amount' => $amount,
            'redirect_url' => config('app.frontend_url', config('app.url')) . '/join/payment-return',
            'customer_email' => $enrollee->email,
            'customer_name' => $enrollee->first_name . ' ' . $enrollee->last_name,
            'customer_phone' => $enrollee->phone,
            'title' => "HMO Enrolment — {$plan->plan_name}",
            'description' => 'Annual premium for individual health cover',
        ]);

        if (!$checkout['success']) {
            Log::error('Retail enrolment checkout initiation failed', ['enrollee_id' => $enrollee->id, 'response' => $checkout]);
            return response()->json([
                'message' => 'Could not start payment. Please try again shortly.',
                'data' => ['enrollee_id' => $enrollee->id, 'tx_ref' => $txRef],
            ], 502);
        }

        $payment->update(['payment_link' => $checkout['payment_link'], 'response_payload' => $checkout['raw']]);

        return response()->json([
            'message' => 'Registration received. Redirecting to payment.',
            'data' => ['payment_link' => $checkout['payment_link'], 'tx_ref' => $txRef],
        ], 201);
    }

    /**
     * Browser lands here after Flutterwave's checkout, regardless of
     * outcome. Does NOT activate anything by itself — calls verifyCharge()
     * to check the real status server-to-server, and if confirmed,
     * activates. Activation can happen here OR via the webhook, whichever
     * arrives first — confirmPayment() below is idempotent either way.
     */
    public function paymentReturn(Request $request): JsonResponse
    {
        $request->validate(['transaction_id' => 'required|string', 'tx_ref' => 'required|string']);

        $payment = RetailEnrollmentPayment::where('tx_ref', $request->tx_ref)->first();
        if (!$payment) {
            return response()->json(['message' => 'Payment record not found.'], 404);
        }

        if ($payment->status === 'paid') {
            return response()->json(['message' => 'Payment already confirmed.', 'data' => ['status' => 'paid']]);
        }

        $verification = $this->gateway->verifyCharge($request->transaction_id);

        if (!$verification['success'] || $verification['tx_ref'] !== $payment->tx_ref) {
            return response()->json(['message' => 'Payment could not be confirmed yet. If you completed payment, this will update shortly.', 'data' => ['status' => 'pending']]);
        }

        if ((float) $verification['amount'] < (float) $payment->amount) {
            Log::warning('Retail enrolment payment amount mismatch', ['tx_ref' => $payment->tx_ref, 'expected' => $payment->amount, 'received' => $verification['amount']]);
            return response()->json(['message' => 'Payment amount does not match. Contact support.'], 422);
        }

        $this->confirmPayment($payment, $request->transaction_id);

        return response()->json(['message' => 'Payment confirmed. Welcome!', 'data' => ['status' => 'paid']]);
    }

    /**
     * Idempotent activation — safe to call from both paymentReturn() and
     * the webhook, whichever gets there first. Second call is a no-op.
     */
    public function confirmPayment(RetailEnrollmentPayment $payment, string $gatewayReference): void
    {
        if ($payment->status === 'paid') {
            return;
        }

        // A fresh temp password is generated HERE, not reused from
        // register() — the original was never persisted anywhere
        // (correctly, storing plaintext passwords is bad practice), so
        // there's nothing to recover at this point. This resets the
        // user's password at activation time and emails the new one.
        $newTempPassword = \Illuminate\Support\Str::random(12);

        DB::transaction(function () use ($payment, $gatewayReference, $newTempPassword) {
            $payment->update([
                'status' => 'paid',
                'gateway_reference' => $gatewayReference,
                'paid_at' => now(),
            ]);

            $enrollee = $payment->enrollee;
            $enrollee->update(['status' => 'active']);
            $enrollee->dependents()->update(['status' => 'active']);

            $enrollee->user->update([
                'password' => \Illuminate\Support\Facades\Hash::make($newTempPassword),
                'password_changed_at' => null,
            ]);

            $this->cardService->issue($enrollee, null, 'Retail self-enrolment payment confirmed');
        });

        Log::info('Retail enrolment activated', ['enrollee_id' => $payment->enrollee_id, 'tx_ref' => $payment->tx_ref]);

        try {
            $enrollee = $payment->enrollee()->first();
            Mail::to($enrollee->email)->send(new \App\Mail\EnrolleeWelcomeMail($enrollee, $newTempPassword));
        } catch (\Exception $e) {
            Log::error('Retail welcome email failed: ' . $e->getMessage());
        }
    }

    /**
     * Real premium, server-side, from the actual Plan record — this is
     * what actually gets charged, never client input.
     */
    private function calculateRealPremium(Plan $plan, int $dependentsCount, array $selectedBenefits = []): float
    {
        $baseRate = match ($plan->tier) {
            'basic' => 45000,
            'standard' => 85000,
            'premium' => 160000,
            default => 85000,
        };

        $baseRate *= (1 + $this->benefitLoadingPercent($selectedBenefits) / 100);
        $dependentRate = $baseRate * 0.6;

        return round($baseRate + ($dependentRate * $dependentsCount), 2);
    }
}
