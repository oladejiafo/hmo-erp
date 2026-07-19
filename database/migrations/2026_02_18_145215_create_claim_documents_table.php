<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('claim_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->string('original_filename', 255);
            $table->string('stored_path')->comment('Encrypted path in S3/MinIO');
            $table->string('mime_type', 100);
            $table->unsignedInteger('file_size_kb')->default(0);
            $table->enum('doc_type', [
                'invoice',
                'prescription',
                'lab_result',
                'discharge_summary',
                'pre_auth_letter',
                'referral_letter',
                'x_ray_scan',
                'other',
            ])->default('invoice');
            $table->text('ocr_extracted_text')
                  ->nullable()
                  ->comment('Text extracted by OCR pipeline - used by fraud AI');
            $table->boolean('ocr_processed')->default(false);
            $table->timestamp('ocr_processed_at')->nullable();
            $table->foreignId('uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamps();

            $table->index('claim_id');
            $table->index('doc_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claim_documents');
    }
};
