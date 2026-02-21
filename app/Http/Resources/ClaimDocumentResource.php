<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ClaimDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'claim_id' => $this->claim_id,
            'document_type' => $this->document_type,
            'document_type_label' => $this->getDocumentTypeLabel(),
            'original_filename' => $this->original_filename,
            'file_size' => $this->file_size,
            'file_size_formatted' => $this->formatFileSize(),
            'mime_type' => $this->mime_type,
            'description' => $this->description,
            'uploaded_by' => $this->uploaded_by ? [
                'id' => $this->uploader?->id,
                'name' => $this->uploader?->name,
            ] : null,
            'uploaded_at' => $this->created_at?->toISOString(),
            'download_url' => $this->getDownloadUrl(),
        ];
    }

    protected function getDocumentTypeLabel(): string
    {
        return match($this->document_type) {
            'prescription' => 'Prescription',
            'lab_result' => 'Lab Result',
            'discharge_summary' => 'Discharge Summary',
            'other' => 'Other Document',
            default => ucfirst(str_replace('_', ' ', $this->document_type)),
        };
    }

    protected function formatFileSize(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes > 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }

    protected function getDownloadUrl(): ?string
    {
        if (!$this->file_path) {
            return null;
        }
        
        // Return API route URL for download
        return route('claims.documents.download', [
            'claim' => $this->claim_id,
            'document' => $this->id
        ]);
    }
}