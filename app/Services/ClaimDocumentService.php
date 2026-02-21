<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\ClaimDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ClaimDocumentService
{
    /**
     * Upload a document for a claim
     */
    public function upload(Claim $claim, UploadedFile $file, string $documentType, ?string $description = null): ClaimDocument
    {
        $path = $this->storeFile($claim, $file);
        
        return ClaimDocument::create([
            'claim_id' => $claim->id,
            'document_type' => $documentType,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'description' => $description,
            'uploaded_by' => Auth::id(),
        ]);
    }

    /**
     * Delete a document
     */
    public function delete(ClaimDocument $document): bool
    {
        // Delete physical file
        if (Storage::disk('local')->exists($document->file_path)) {
            Storage::disk('local')->delete($document->file_path);
        }
        
        return $document->delete();
    }

    /**
     * Store file and return path
     */
    protected function storeFile(Claim $claim, UploadedFile $file): string
    {
        $fileName = $this->generateFileName($claim, $file);
        $path = "claims/{$claim->id}/documents/{$fileName}";
        
        Storage::disk('local')->putFileAs(
            "claims/{$claim->id}/documents",
            $file,
            $fileName
        );
        
        return $path;
    }

    /**
     * Generate unique filename
     */
    protected function generateFileName(Claim $claim, UploadedFile $file): string
    {
        $timestamp = now()->format('Y-m-d_His');
        $extension = $file->getClientOriginalExtension();
        $random = Str::random(8);
        
        return "claim_{$claim->id}_{$timestamp}_{$random}.{$extension}";
    }
}