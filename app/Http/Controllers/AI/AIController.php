<?php
namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Services\AIService;
use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\FraudFlag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AIController extends Controller
{
    public function __construct(protected AIService $ai) {}

    public function classifyDocument(Request $request): JsonResponse
    {
        $request->validate([
            'document_text' => 'required|string|min:10'
        ]);
        
        return response()->json(
            $this->ai->classifyDocument($request->document_text)
        );
    }

    public function smartRoute(Request $request): JsonResponse
    {
        $request->validate([
            'claim_id' => 'nullable|integer',
            'claim_amount' => 'required_without:claim_id|numeric',
            'claim_type' => 'required_without:claim_id|string',
            'risk_score' => 'nullable|numeric'
        ]);

        if ($request->claim_id) {
            $claim = Claim::with(['hcp', 'enrollee'])->find($request->claim_id);
            if (!$claim) {
                return response()->json([
                    'message' => "Claim #{$request->claim_id} not found."
                ], 404);
            }
            
            $data = [
                'claim_amount' => $claim->total_amount_claimed,
                'claim_type' => $claim->claim_type,
                'risk_score' => $claim->risk_score ?? 0,
                'pa_status' => $claim->pa_status,
                'fraud_flags' => $claim->fraudFlags()->count(),
                'hcp_tier' => $claim->hcp?->tier,
            ];
        } else {
            $data = $request->only([
                'claim_amount', 'claim_type', 'risk_score', 
                'pa_status', 'fraud_flags', 'hcp_tier'
            ]);
        }

        return response()->json($this->ai->smartRoute($data));
    }

    public function ocrDocument(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240'
        ]);

        $file = $request->file('file');
        $base64 = base64_encode(file_get_contents($file->path()));
        
        return response()->json(
            $this->ai->ocrDocument(
                $base64, 
                $file->getMimeType(), 
                $file->getClientOriginalName()
            )
        );
    }

    public function summarizeReport(Request $request): JsonResponse
    {
        $request->validate([
            'report_type' => 'required|string',
            'report_data' => 'required|array'
        ]);

        return response()->json(
            $this->ai->summarizeReport(
                $request->report_type, 
                $request->report_data
            )
        );
    }

    public function fraudClusters(): JsonResponse
    {
        $flags = FraudFlag::with('claim')
            ->where('created_at', '>=', now()->subMonths(3))
            ->get()
            ->map(fn($f) => [
                'flag_type' => $f->flag_type,
                'score' => $f->score,
                'amount' => $f->claim?->total_amount_claimed ?? 0,
                'hour' => $f->created_at->hour,
            ])
            ->toArray();

        return response()->json($this->ai->fraudClusters($flags));
    }

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|in:user,assistant',
            'messages.*.content' => 'required|string',
            'persona' => 'sometimes|in:staff,enrollee,finance'
        ]);

        $persona = $request->input('persona', 'staff');
        $stats = [];

        if ($persona === 'staff') {
            $stats = [
                'total_claims' => Claim::count(),
                'pending_claims' => Claim::whereIn('status', ['submitted', 'auto_validated'])->count(),
                'active_enrollees' => Enrollee::where('status', 'active')->count(),
                'today' => now()->format('Y-m-d'),
            ];
        }

        return response()->json([
            'message' => $this->ai->chat($request->messages, $persona, $stats)
        ]);
    }
}