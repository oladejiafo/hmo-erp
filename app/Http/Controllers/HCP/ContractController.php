<?php

namespace App\Http\Controllers\HCP;

use App\Http\Controllers\Controller;
use App\Http\Requests\HCP\StoreContractRequest;
use App\Http\Requests\HCP\UpdateContractRequest;
use App\Http\Resources\ContractResource;
use App\Models\HcpContract;
use App\Models\HealthCareProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
{
    /**
     * Get all contracts for an HCP
     * 
     * @param Request $request
     * @param HealthCareProvider $hcp
     * @return JsonResponse
     */
    public function index(Request $request, HealthCareProvider $hcp): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.contracts');
        
        $contracts = $hcp->contracts()
            ->with(['approvedBy'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->active !== null, function($q) use ($request) {
                if ($request->active) {
                    $q->where('status', 'active')
                      ->where('start_date', '<=', now())
                      ->where(function($q) {
                          $q->where('end_date', '>=', now())
                            ->orWhereNull('end_date');
                      });
                }
            })
            ->orderByDesc('start_date')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => ContractResource::collection($contracts),
            'meta' => [
                'current_page' => $contracts->currentPage(),
                'last_page' => $contracts->lastPage(),
                'per_page' => $contracts->perPage(),
                'total' => $contracts->total(),
                'has_active' => $hcp->activeContract()->exists(),
            ],
        ]);
    }

    /**
     * Create a new contract for an HCP
     * 
     * @param StoreContractRequest $request
     * @param HealthCareProvider $hcp
     * @return JsonResponse
     */
    public function store(StoreContractRequest $request, HealthCareProvider $hcp): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.contracts');
        
        // Check if there's an active contract already
        if ($hcp->activeContract()->exists()) {
            $active = $hcp->activeContract()->first();
            return response()->json([
                'message' => 'HCP already has an active contract',
                'active_contract' => new ContractResource($active),
            ], 422);
        }

        $data = $request->validated();
        $data['contract_number'] = $this->generateContractNumber($hcp);
        $data['status'] = 'draft';
        $data['created_by'] = Auth::id();

        $contract = $hcp->contracts()->create($data);

        // Handle document upload if provided
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store("hcp-contracts/{$hcp->id}", 'public');
            $contract->update(['document_path' => $path]);
        }

        return response()->json([
            'message' => 'Contract created successfully',
            'data' => new ContractResource($contract),
        ], 201);
    }

    /**
     * Get a specific contract
     * 
     * @param HealthCareProvider $hcp
     * @param HcpContract $contract
     * @return JsonResponse
     */
    public function show(HealthCareProvider $hcp, HcpContract $contract): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.contracts');
        
        // Ensure contract belongs to hcp
        if ($contract->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Contract not found for this HCP'], 404);
        }

        return response()->json([
            'data' => new ContractResource($contract->load(['approvedBy', 'createdBy'])),
        ]);
    }

    /**
     * Update a contract
     * 
     * @param UpdateContractRequest $request
     * @param HealthCareProvider $hcp
     * @param HcpContract $contract
     * @return JsonResponse
     */
    public function update(UpdateContractRequest $request, HealthCareProvider $hcp, HcpContract $contract): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.contracts');
        
        // Ensure contract belongs to hcp
        if ($contract->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Contract not found for this HCP'], 404);
        }

        // Only draft contracts can be updated
        if ($contract->status !== 'draft') {
            return response()->json(['message' => 'Only draft contracts can be updated'], 422);
        }

        $contract->update($request->validated());

        return response()->json([
            'message' => 'Contract updated successfully',
            'data' => new ContractResource($contract),
        ]);
    }

    /**
     * Submit contract for approval
     * 
     * @param HealthCareProvider $hcp
     * @param HcpContract $contract
     * @return JsonResponse
     */
    public function submit(HealthCareProvider $hcp, HcpContract $contract): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.contracts');
        
        // Ensure contract belongs to hcp
        if ($contract->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Contract not found for this HCP'], 404);
        }

        if ($contract->status !== 'draft') {
            return response()->json(['message' => 'Contract already submitted or processed'], 422);
        }

        $contract->update([
            'status' => 'pending_approval',
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Contract submitted for approval',
            'data' => new ContractResource($contract),
        ]);
    }

    /**
     * Approve contract
     * 
     * @param HealthCareProvider $hcp
     * @param HcpContract $contract
     * @return JsonResponse
     */
    public function approve(HealthCareProvider $hcp, HcpContract $contract): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.accredit');
        
        // Ensure contract belongs to hcp
        if ($contract->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Contract not found for this HCP'], 404);
        }

        if ($contract->status !== 'pending_approval') {
            return response()->json(['message' => 'Contract is not pending approval'], 422);
        }

        $contract->update([
            'status' => 'active',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Contract approved and activated',
            'data' => new ContractResource($contract),
        ]);
    }

    /**
     * Terminate contract
     * 
     * @param Request $request
     * @param HealthCareProvider $hcp
     * @param HcpContract $contract
     * @return JsonResponse
     */
    public function terminate(Request $request, HealthCareProvider $hcp, HcpContract $contract): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('hcps.accredit');
        
        // Ensure contract belongs to hcp
        if ($contract->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Contract not found for this HCP'], 404);
        }

        if (!in_array($contract->status, ['active', 'pending_approval'])) {
            return response()->json(['message' => 'Contract cannot be terminated'], 422);
        }

        $request->validate(['reason' => 'required|string|min:10']);

        $contract->update([
            'status' => 'terminated',
            'terminated_at' => now(),
            'termination_reason' => $request->reason,
        ]);

        return response()->json([
            'message' => 'Contract terminated',
            'data' => new ContractResource($contract),
        ]);
    }

    /**
     * Download contract document
     * 
     * @param HealthCareProvider $hcp
     * @param HcpContract $contract
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function downloadDocument(HealthCareProvider $hcp, HcpContract $contract)
    {
        /** @disregard P1013 */
        $this->authorize('hcps.contracts');
        
        // Ensure contract belongs to hcp
        if ($contract->hcp_id !== $hcp->id) {
            return response()->json(['message' => 'Contract not found for this HCP'], 404);
        }

        if (!$contract->document_path || !Storage::disk('public')->exists($contract->document_path)) {
            return response()->json(['message' => 'Document not found'], 404);
        }
        /** @disregard P1013 */
        return Storage::disk('public')->download(
            $contract->document_path,
            "contract-{$contract->contract_number}.pdf"
        );
    }

    /**
     * Generate unique contract number
     */
    protected function generateContractNumber(HealthCareProvider $hcp): string
    {
        $year = now()->year;
        $prefix = 'CNT';
        $hcpCode = substr($hcp->hcp_code, -4);
        
        $lastContract = HcpContract::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();
            
        $sequence = $lastContract ? (intval(substr($lastContract->contract_number, -4)) + 1) : 1;
        
        return sprintf("%s-%s-%s-%04d", $prefix, $year, $hcpCode, $sequence);
    }
}