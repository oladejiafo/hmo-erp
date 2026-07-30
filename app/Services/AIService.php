<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\FacadesLog;
use App\Support\Clustering\DBSCAN; // native replacement for Phpml\Clustering\DBSCAN - see class docblock for why
use Illuminate\Support\Facades\Log;

class AIService
{
    protected string $anthropicKey;
    protected string $openaiKey;
    protected string $model = 'claude-3-sonnet-20241022';
    protected int $timeout = 60;

    public function __construct()
    {
        $this->anthropicKey = config('services.anthropic.key', env('ANTHROPIC_API_KEY'));
        $this->openaiKey = config('services.openai.key', env('OPENAI_API_KEY', ''));
    }

    // ==================== CORE CALLER ====================

    public function call(string $systemPrompt, string $userMessage, int $maxTokens = 1024): ?string
    {
        $errors = [];
        
        // Try Claude first
        try {
            Log::info('Attempting Claude call');
            
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'x-api-key' => $this->anthropicKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => $this->model,
                    'max_tokens' => $maxTokens,
                    'system' => $systemPrompt,
                    'messages' => [['role' => 'user', 'content' => $userMessage]],
                ]);
    
            if ($response->successful()) {
                Log::info('Claude succeeded');
                return $response->json('content.0.text');
            }
            
            // Log the error but continue to OpenAI
            $errors[] = 'Claude failed: ' . $response->status() . ' - ' . $response->body();
            Log::warning('Claude failed, trying OpenAI', ['response' => $response->body()]);
            
        } catch (\Exception $e) {
            $errors[] = 'Claude exception: ' . $e->getMessage();
            Log::warning('Claude exception, trying OpenAI', ['error' => $e->getMessage()]);
        }
    
        // Try OpenAI fallback (your OpenAI key works!)
        if (!empty($this->openaiKey)) {
            try {
                Log::info('Attempting OpenAI fallback');
                
                $response = Http::timeout($this->timeout)
                    ->withToken($this->openaiKey)
                    ->post('https://api.openai.com/v1/chat/completions', [
                        'model' => 'gpt-4o-mini',
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $userMessage],
                        ],
                        'max_tokens' => $maxTokens,
                    ]);
    
                if ($response->successful()) {
                    Log::info('OpenAI succeeded');
                    return $response->json('choices.0.message.content');
                }
                
                $errors[] = 'OpenAI failed: ' . $response->status() . ' - ' . $response->body();
                
            } catch (\Exception $e) {
                $errors[] = 'OpenAI exception: ' . $e->getMessage();
            }
        }
    
        // Both failed - log all errors
        Log::error('All AI providers failed', ['errors' => $errors]);
        
        return null;
    }

    public function callVision(string $systemPrompt, string $base64, string $mediaType): ?string
    {
        try {
            $response = Http::timeout(90)
                ->withHeaders([
                    'x-api-key' => $this->anthropicKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => $this->model,
                    'max_tokens' => 2048,
                    'system' => $systemPrompt,
                    'messages' => [[
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'image',
                                'source' => [
                                    'type' => 'base64',
                                    'media_type' => $mediaType,
                                    'data' => $base64,
                                ],
                            ],
                            ['type' => 'text', 'text' => 'Extract all medical data from this document as JSON.'],
                        ],
                    ]],
                ]);

            if ($response->successful()) {
                return $response->json('content.0.text');
            }
        } catch (\Exception $e) {
            Log::error('Vision failed', ['error' => $e->getMessage()]);
        }
        return null;
    }

    public function parseJson(string $text): ?array
    {
        // Remove markdown fences
        $cleaned = preg_replace(['/^```(?:json)?\s*/m', '/\s*```$/m'], '', $text);
        $decoded = json_decode(trim($cleaned), true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    }

    // ==================== FEATURE METHODS ====================

    public function classifyDocument(string $documentText): array
    {
        $system = "You are a Nigerian HMO claims classification expert. "
            . "Analyse the claim document text. Return ONLY valid JSON: "
            . '{"claim_type":"outpatient|inpatient|surgery|maternity|pharmacy|investigation|dental|optical",'
            . '"icd_codes":["A00.0"],"pa_required":true,"confidence":85,"reasoning":"brief"}';
        
        $result = $this->call($system, $documentText);
        
        if ($result && $parsed = $this->parseJson($result)) {
            return $parsed;
        }
        
        return [
            'claim_type' => 'unknown',
            'icd_codes' => [],
            'pa_required' => false,
            'confidence' => 0,
            'reasoning' => 'AI unavailable. Please classify manually.'
        ];
    }

    public function smartRoute(array $claimData): array
    {
        $system = "You are a claims routing expert for a Nigerian HMO. "
            . "Return ONLY valid JSON: "
            . '{"queue":"auto_approve|standard|medical_review|supervisor|finance",'
            . '"priority":"low|normal|high|urgent","eta":"string","reasoning":"string","flags":[]}';
        
        $result = $this->call($system, json_encode($claimData));
        
        if ($result && $parsed = $this->parseJson($result)) {
            return $parsed;
        }
        
        return $this->ruleBasedRoute($claimData);
    }

    public function ocrDocument(string $base64, string $mediaType, string $filename): array
    {
        $system = "Extract data from this hospital bill. Return ONLY valid JSON: "
            . '{"patient_name":null,"service_date":"YYYY-MM-DD","diagnosis":null,'
            . '"provider_name":null,"total_amount":0,"items":[{"service":"","quantity":1,"price":0}],'
            . '"raw_text":"","confidence_scores":{}}';
        
        $result = $this->callVision($system, $base64, $mediaType);
        
        if ($result && $parsed = $this->parseJson($result)) {
            return $parsed;
        }
        
        return [
            'patient_name' => null,
            'service_date' => null,
            'diagnosis' => null,
            'provider_name' => null,
            'total_amount' => null,
            'items' => [],
            'raw_text' => 'OCR unavailable.',
            'confidence_scores' => []
        ];
    }

    public function summarizeReport(string $reportType, array $reportData): array
    {
        $system = "You are a healthcare finance analyst. Return ONLY valid JSON: "
            . '{"summary":"2 sentences","bullets":["x","x","x","x","x"],'
            . '"key_metric":"string","recommendation":"string"}';
        
        $message = "Report type: {$reportType}\n" . json_encode($reportData);
        $result = $this->call($system, $message, 1500);
        
        if ($result && $parsed = $this->parseJson($result)) {
            return $parsed;
        }
        
        return [
            'summary' => 'AI unavailable.',
            'bullets' => ['Try again later.'],
            'key_metric' => 'N/A',
            'recommendation' => 'Manual review.'
        ];
    }

    public function chatx(array $messages, string $persona = 'staff', array $stats = []): string
    {
        
        $personas = [
            'staff' => 'Expert Nigerian HMO operations assistant. Know NHIA, ICD-10, PA rules, capitation.',
            'enrollee' => 'HealthBot - friendly member-facing assistant. Simple language, no jargon.',
            'finance' => 'Finance assistant for capitation, batches, reconciliation. Be analytical.'
        ];
        
        $system = $personas[$persona] ?? $personas['staff'];
        
        if ($persona === 'staff' && !empty($stats)) {
            $system .= "\nSystem: " . json_encode($stats);
        }
        
        $formatted = array_map(fn($m) => ['role' => $m['role'], 'content' => $m['content']], 
                              array_slice($messages, -10));
        
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'x-api-key' => $this->anthropicKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => $this->model,
                    'max_tokens' => 1024,
                    'system' => $system,
                    'messages' => $formatted,
                ]);

            if ($response->successful()) {
                return $response->json('content.0.text') ?? 'No response generated.';
            }
        } catch (\Exception $e) {
            Log::error('Chat failed', ['error' => $e->getMessage()]);
        }
        
        return 'The AI assistant is temporarily unavailable. Please try again.';
    }
    public function chat(array $messages, string $persona = 'staff', array $stats = []): string
    {
        Log::info('AIService chat called', [
            'message_count' => count($messages),
            'persona' => $persona,
            'stats' => $stats
        ]);
    
        $personas = [
            'staff' => 'Expert Nigerian HMO operations assistant. Know NHIA, ICD-10, PA rules, capitation.',
            'enrollee' => 'HealthBot - friendly member-facing assistant. Simple language, no jargon.',
            'finance' => 'Finance assistant for capitation, batches, reconciliation. Be analytical.'
        ];
        
        $system = $personas[$persona] ?? $personas['staff'];
        
        if ($persona === 'staff' && !empty($stats)) {
            $system .= "\nSystem: " . json_encode($stats);
        }
        
        // Extract just the last user message for simplicity
        $lastUserMessage = '';
        foreach (array_reverse($messages) as $msg) {
            if ($msg['role'] === 'user') {
                $lastUserMessage = $msg['content'];
                break;
            }
        }
        
        Log::info('Calling AI with', [
            'system' => substr($system, 0, 100),
            'message' => $lastUserMessage
        ]);
        
        // Use your existing call method
        $result = $this->call($system, $lastUserMessage);
        
        if ($result) {
            Log::info('AI returned: ' . substr($result, 0, 100));
            return $result;
        }
        
        Log::error('AI returned null');
        return 'The AI assistant is temporarily unavailable. Please try again.';
    }

    public function fraudClusters(array $flags): array
    {
        if (count($flags) < 10) {
            return ['clusters' => [], 'noise_points' => 0, 'message' => 'Min 10 flags needed.'];
        }
        
        try {
            // Prepare data for clustering
            $samples = [];
            foreach ($flags as $flag) {
                $samples[] = [
                    (float)($flag['score'] ?? 0),
                    (float)($flag['amount'] ?? 0) / 100000,
                    (float)($flag['hour'] ?? 0)
                ];
            }
            
            $dbscan = new DBSCAN(epsilon: 12, minSamples: 3);
            $clusters = $dbscan->cluster($samples);
            
            if (empty($clusters)) {
                return ['clusters' => [], 'noise_points' => count($flags)];
            }
            
            // Calculate cluster summaries
            $summaries = [];
            $total = 0;
            foreach ($clusters as $i => $points) {
                $total += count($points);
                $scores = array_column($points, 0);
                $summaries[] = [
                    'index' => $i + 1,
                    'count' => count($points),
                    'avg_score' => round(array_sum($scores) / count($scores), 1)
                ];
            }
            
            // Ask Claude to label clusters
            $system = 'Label each fraud cluster in plain English. Return ONLY JSON array: '
                    . '[{"label":"Short Name","description":"One sentence.","count":0,"avg_score":0.0}]';
            
            $result = $this->call($system, json_encode($summaries));
            
            if ($result && $parsed = $this->parseJson($result)) {
                return [
                    'clusters' => $parsed,
                    'noise_points' => count($flags) - $total
                ];
            }
            
            // Fallback labels
            return [
                'clusters' => array_map(fn($s) => [
                    'label' => 'Cluster ' . $s['index'],
                    'description' => 'Unlabelled cluster.',
                    'count' => $s['count'],
                    'avg_score' => $s['avg_score']
                ], $summaries),
                'noise_points' => count($flags) - $total
            ];
            
        } catch (\Exception $e) {
            Log::error('DBSCAN failed', ['error' => $e->getMessage()]);
            return ['clusters' => [], 'noise_points' => 0];
        }
    }

    protected function ruleBasedRoute(array $data): array
    {
        $amount = (float)($data['claim_amount'] ?? 0);
        $risk = (float)($data['risk_score'] ?? 0);
        $fraudFlags = (int)($data['fraud_flags'] ?? 0);
        
        if ($risk >= 70 || $fraudFlags > 2) {
            return [
                'queue' => 'supervisor',
                'priority' => 'urgent',
                'eta' => '1-2 days',
                'reasoning' => 'High risk/fraud flags.',
                'flags' => []
            ];
        }
        
        if ($amount > 2000000) {
            return [
                'queue' => 'finance',
                'priority' => 'high',
                'eta' => '3-5 days',
                'reasoning' => 'Above finance threshold.',
                'flags' => []
            ];
        }
        
        if ($amount > 500000) {
            return [
                'queue' => 'medical_review',
                'priority' => 'normal',
                'eta' => '24-48 hours',
                'reasoning' => 'High-value claim.',
                'flags' => []
            ];
        }
        
        if ($amount < 50000 && $risk < 30) {
            return [
                'queue' => 'auto_approve',
                'priority' => 'low',
                'eta' => 'same-day',
                'reasoning' => 'Low-risk, low-value.',
                'flags' => []
            ];
        }
        
        return [
            'queue' => 'standard',
            'priority' => 'normal',
            'eta' => '24-48 hours',
            'reasoning' => 'Standard queue.',
            'flags' => []
        ];
    }
}