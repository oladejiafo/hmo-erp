<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\SystemSetting; // This is already added at the top ✓
use App\Models\Claim; // Add this if not already imported

class AIController extends Controller
{
    protected string $serviceUrl;
    protected string $serviceKey;
    protected int $timeout;

    public function __construct()
    {
        $this->serviceUrl = config('services.ai.url', env('AI_SERVICE_URL', 'http://localhost:8001'));
        $this->serviceKey = config('services.ai.key', env('AI_SERVICE_KEY'));
        $this->timeout = config('services.ai.timeout', env('AI_SERVICE_TIMEOUT', 30));
    }

    /**
     * Forward request to AI microservice with graceful fallback
     */
    protected function forwardRequest(string $endpoint, array $payload, array $fallback): JsonResponse
    {
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders(['X-AI-Key' => $this->serviceKey])
                ->post($this->serviceUrl . $endpoint, $payload);

            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            Log::warning('AI service error', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            
        } catch (\Exception $e) {
            Log::error('AI service unavailable', [
                'endpoint' => $endpoint,
                'error' => $e->getMessage()
            ]);
        }

        // Graceful fallback
        return response()->json($fallback);
    }

    public function classifyDocument(Request $request): JsonResponse
    {
        $request->validate([
            'claim_id' => 'sometimes|exists:claims,id',
            'document_text' => 'required_without:claim_id|string',
        ]);

        return $this->forwardRequest('/classify', $request->all(), [
            'claim_type' => 'Unknown',
            'icd_codes' => [],
            'pa_required' => false,
            'confidence' => 0,
            'reasoning' => 'AI service unavailable. Using fallback rules.',
        ]);
    }

    public function smartRoute(Request $request): JsonResponse
    {
        $request->validate([
            'claim_id' => 'required|exists:claims,id',
        ]);

        // Get claim data for context
        $claim = Claim::with(['hcp', 'enrollee'])->find($request->claim_id);
        
        // Get dynamic thresholds from system settings
        $highValueThreshold = SystemSetting::get('financial.ai_high_value_threshold', 500000);
        $quarantineThreshold = SystemSetting::get('fraud.auto_quarantine_threshold', 70);
        
        $payload = [
            'claim_amount' => $claim->total_amount_claimed,
            'claim_type' => $claim->claim_type,
            'risk_score' => $claim->risk_score,
            'pa_status' => $claim->pa_status,
            'fraud_flags' => $claim->fraudFlags()->count(),
            'hcp_tier' => $claim->hcp?->tier,
            'thresholds' => [ // Include thresholds for context
                'high_value' => $highValueThreshold,
                'quarantine' => $quarantineThreshold,
            ],
        ];

        return $this->forwardRequest('/route', $payload, [
            'queue' => $this->ruleBasedRouting($claim),
            'eta' => '24-48 hours',
            'reasoning' => 'AI service unavailable. Using standard routing rules.',
        ]);
    }

    public function ocrDocument(Request $request): JsonResponse
    {
        $request->validate([
            'document_id' => 'sometimes|exists:claim_documents,id',
            'file' => 'required_without:document_id|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        // Handle file upload if present
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $base64File = base64_encode(file_get_contents($file->path()));
            $payload = [
                'filename' => $file->getClientOriginalName(),
                'content_type' => $file->getMimeType(),
                'content' => $base64File,
            ];
        } else {
            // Get document from database
            $document = \App\Models\ClaimDocument::find($request->document_id);
            $payload = [
                'filename' => $document->filename,
                'content_type' => $document->mime_type,
                'content' => base64_encode($document->getContent()),
            ];
        }

        return $this->forwardRequest('/ocr', $payload, [
            'patient_name' => null,
            'service_date' => null,
            'diagnosis' => null,
            'items' => [],
            'total_amount' => null,
            'provider_name' => null,
            'raw_text' => 'OCR service unavailable.',
            'confidence_scores' => [],
        ]);
    }

    public function summarizeReport(Request $request): JsonResponse
    {
        $request->validate([
            'report_type' => 'required|string',
            'report_data' => 'required|array',
            'report_data.*' => 'array',
        ]);

        return $this->forwardRequest('/summarise', $request->all(), [
            'summary' => 'AI summary unavailable.',
            'bullets' => ['Please try again later.'],
            'key_metric' => 'N/A',
            'recommendation' => 'Manual review recommended.',
        ]);
    }

    public function fraudClusters(): JsonResponse
    {
        // Get last 3 months of fraud flags
        $flags = \App\Models\FraudFlag::with('claim')
            ->where('created_at', '>=', now()->subMonths(3))
            ->get()
            ->map(fn($f) => [
                'flag_type' => $f->flag_type,
                'score' => $f->score,
                'amount' => $f->claim?->total_amount_claimed ?? 0,
                'hour' => $f->created_at->hour,
            ])
            ->toArray();

        return $this->forwardRequest('/cluster', ['flags' => $flags], [
            'clusters' => [],
            'noise_points' => 0,
            'fallback_reason' => 'Clustering service unavailable.',
        ]);
    }

    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|in:user,assistant',
            'messages.*.content' => 'required|string',
            'persona' => 'sometimes|in:staff,enrollee,finance',
        ]);

        // Add system stats for context
        if ($request->input('persona', 'staff') === 'staff') {
            $stats = [
                'total_claims' => Claim::count(),
                'pending_claims' => Claim::whereIn('status', ['submitted', 'auto_validated'])->count(),
                'active_enrollees' => \App\Models\Enrollee::where('status', 'active')->count(),
                'today' => now()->format('Y-m-d'),
            ];
            $request->merge(['system_stats' => $stats]);
        }

        return $this->forwardRequest('/chat', $request->all(), [
            'message' => 'I apologize, but the AI assistant is currently unavailable. Please try again later or contact support.',
        ]);
    }

    /**
     * Rule-based routing fallback when AI service is unavailable
     * Now uses dynamic thresholds from system settings
     */
    protected function ruleBasedRouting($claim): string
    {
        // Get dynamic thresholds
        $quarantineThreshold = SystemSetting::get('fraud.auto_quarantine_threshold', 70);
        $highValueThreshold = SystemSetting::get('financial.ai_high_value_threshold', 500000);
        $ceoThreshold = SystemSetting::get('financial.pa_ceo_threshold', 2000000);
        
        if ($claim->risk_score >= $quarantineThreshold) {
            return 'supervisor';
        }
        
        if ($claim->total_amount_claimed > $ceoThreshold) {
            return 'finance';
        }
        
        if ($claim->total_amount_claimed > $highValueThreshold) {
            return 'medical_review';
        }
        
        if ($claim->fraudFlags()->count() > 0) {
            return 'medical_review';
        }
        
        return 'standard';
    }
}