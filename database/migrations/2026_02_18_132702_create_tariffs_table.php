<?php
// database/migrations/2026_02_18_132702_create_tariffs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tariffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hcp_id')
                  ->constrained('health_care_providers')
                  ->cascadeOnDelete();
            $table->string('service_code', 30)->comment('e.g. CONS-001, LAB-CBC-001');
            $table->string('service_name', 200);
            $table->enum('category', [
                'consultation',
                'procedure',
                'laboratory',
                'radiology',
                'drug',
                'surgery',
                'dental',
                'optical',
                'physiotherapy',
                'maternity',
                'emergency',
            ])->default('consultation');
            $table->decimal('agreed_price', 15, 2)->comment('NGN price agreed in contract');
            $table->decimal('nhis_price', 15, 2)
                  ->nullable()
                  ->comment('NHIS reference price if applicable');
            $table->boolean('is_active')->default(true);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->foreignId('uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamps();

            $table->unique(['hcp_id', 'service_code'], 'unique_hcp_service');
            $table->index(['hcp_id', 'category']);
            $table->index(['hcp_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tariffs');
    }
};