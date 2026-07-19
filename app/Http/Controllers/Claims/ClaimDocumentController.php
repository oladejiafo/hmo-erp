<?php

namespace App\Http\Controllers\Claims;

use App\Http\Controllers\Controller;
use App\Http\Requests\Claims\StoreClaimDocumentRequest;
use App\Http\Resources\ClaimDocumentResource;
use App\Models\Claim;
use App\Models\ClaimDocument;
use App\Services\ClaimDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ClaimDocumentController extends Controller
{
    public function __construct(
        protected ClaimDocumentService $documentService
    ) {}

    /**
     * Get all documents for a claim
     * 
     * @param Claim $claim
     * @return JsonResponse
     */
    public function index(Claim $claim): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('claims.view');
        
        $documents = $claim->documents()
            ->orderByDesc('created_at')
            ->get();
            
        return response()->json([
            'data' => ClaimDocumentResource::collection($documents)
        ]);
    }

    /**
     * Upload a document for a claim
     * 
     * @param StoreClaimDocumentRequest $request
     * @param Claim $claim
     * @return JsonResponse
     */
    public function store(StoreClaimDocumentRequest $request, Claim $claim): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('claims.submit');
        
        $document = $this->documentService->upload(
            $claim,
            $request->file('document'),
            $request->document_type,
            $request->description
        );

        return response()->json([
            'message' => 'Document uploaded successfully',
            'data' => new ClaimDocumentResource($document)
        ], 201);
    }

    /**
     * Download a document
     * 
     * @param Claim $claim
     * @param ClaimDocument $document
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function download(Claim $claim, ClaimDocument $document)
    {
        /** @disregard P1013 */
        $this->authorize('claims.view');
        
        // Ensure document belongs to claim
        if ($document->claim_id !== $claim->id) {
            return response()->json(['message' => 'Document not found for this claim'], 404);
        }

        if (!Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        /** @disregard P1013 */
        return Storage::disk('local')->download(
            $document->file_path,
            $document->original_filename
        );
    }

    /**
     * Delete a document
     * 
     * @param Claim $claim
     * @param ClaimDocument $document
     * @return JsonResponse
     */
    public function destroy(Claim $claim, ClaimDocument $document): JsonResponse
    {
        /** @disregard P1013 */
        $this->authorize('claims.submit');
        
        // Ensure document belongs to claim
        if ($document->claim_id !== $claim->id) {
            return response()->json(['message' => 'Document not found for this claim'], 404);
        }

        $this->documentService->delete($document);

        return response()->json([
            'message' => 'Document deleted successfully'
        ]);
    }
}