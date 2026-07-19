<?php
/**
 * NEW FILE — app/Http/Controllers/Corporate/PlanRequestController.php
 * Staff review of HR-submitted plan requests. Approval converts the
 * request into a real Plan via the same fields CorporatePlanController's
 * store() would set — verified Plan::generateCode()'s real signature
 * (corporateCode, planName) before using it.
 */

namespace App\Http\Controllers\Corporate;

use App\Http\Controllers\Controller;
use App\Models\CorporatePlanRequest;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PlanRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CorporatePlanRequest::with(['corporate:id,name', 'requestedBy:id,name']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $requests = $query->orderByDesc('created_at')->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => collect($requests->items())->map(fn($r) => [
                'id' => $r->id,
                'corporate_name' => $r->corporate->name,
                'requested_by' => $r->requestedBy->name,
                'plan_name' => $r->plan_name,
                'tier' => $r->tier,
                'expected_employee_count' => $r->expected_employee_count,
                'budget_cap' => $r->budget_cap,
                'estimated_annual_premium' => $r->estimated_annual_premium,
                'status' => $r->status,
                'created_at' => $r->created_at?->format('Y-m-d'),
            ]),
            'meta' => ['current_page' => $requests->currentPage(), 'last_page' => $requests->lastPage(), 'total' => $requests->total()],
        ]);
    }

    public function show(CorporatePlanRequest $planRequest): JsonResponse
    {
        $planRequest->load(['corporate', 'requestedBy', 'reviewer', 'resultingPlan']);
        return response()->json(['data' => $planRequest]);
    }

    /**
     * Approve and convert into a real Plan. Staff sets the real premium and
     * benefit ceiling here — the request's estimate is a starting point,
     * not binding. Every other field gets a sane default; staff can edit
     * the resulting Plan afterward via the normal CorporatePlanController
     * screens the same as any other plan.
     */
    public function approve(Request $request, CorporatePlanRequest $planRequest): JsonResponse
    {
        $request->validate([
            'annual_premium' => 'required|numeric|min:0',
            'max_benefit_value' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($planRequest->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted requests can be approved.'], 422);
        }

        $corporate = $planRequest->corporate;
        $benefits = $planRequest->selected_benefits ?? [];

        $plan = Plan::create([
            'corporate_id' => $corporate->id,
            'created_by' => Auth::id(),
            'plan_name' => $planRequest->plan_name,
            'plan_code' => Plan::generateCode($corporate->code, $planRequest->plan_name),
            'plan_type' => 'group',
            'tier' => $planRequest->tier,
            'max_benefit_value' => $request->max_benefit_value,
            'dental_covered' => !empty($benefits['dental_covered']),
            'optical_covered' => !empty($benefits['optical_covered']),
            'maternity_covered' => !empty($benefits['maternity_covered']),
            'surgery_covered' => array_key_exists('surgery_covered', $benefits) ? !empty($benefits['surgery_covered']) : true,
            'physiotherapy_covered' => !empty($benefits['physiotherapy_covered']),
            'mental_health_covered' => !empty($benefits['mental_health_covered']),
            'max_dependents' => 4,
            'effective_date' => now(),
            'status' => 'active',
            'description' => "Created from HR self-service plan request #{$planRequest->id}.",
        ]);

        $planRequest->update([
            'status' => 'approved',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'reviewer_notes' => $request->notes,
            'resulting_plan_id' => $plan->id,
        ]);

        return response()->json([
            'message' => "Plan created: {$plan->plan_name} ({$plan->plan_code})",
            'data' => ['plan_request' => $planRequest->fresh(), 'plan' => $plan],
        ]);
    }

    public function reject(Request $request, CorporatePlanRequest $planRequest): JsonResponse
    {
        $request->validate(['notes' => 'required|string|min:5|max:1000']);

        if ($planRequest->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted requests can be rejected.'], 422);
        }

        $planRequest->update([
            'status' => 'rejected',
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
            'reviewer_notes' => $request->notes,
        ]);

        return response()->json(['message' => 'Plan request rejected.', 'data' => $planRequest->fresh()]);
    }
}
