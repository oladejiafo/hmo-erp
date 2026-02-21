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
        Schema::create('claim_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('tariff_id')
                  ->nullable()
                  ->constrained('hcp_tariffs')
                  ->nullOnDelete()
                  ->comment('Matched tariff line — null if service not in agreed tariff list');
            $table->string('service_code', 30)->nullable();
            $table->string('service_name', 200);
            $table->enum('category', [
                'consultation', 'procedure', 'laboratory', 'radiology',
                'drug', 'surgery', 'dental', 'optical', 'physiotherapy',
                'maternity', 'emergency',
            ])->default('consultation');
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->decimal('unit_price_claimed', 15, 2);
            $table->decimal('total_price_claimed', 15, 2);
            $table->decimal('tariff_unit_price', 15, 2)
                  ->nullable()
                  ->comment('What the agreed tariff says the price should be');
            $table->decimal('amount_approved', 15, 2)
                  ->nullable()
                  ->comment('Final approved amount for this line item');
            $table->enum('status', ['pending', 'approved', 'adjusted', 'rejected'])
                  ->default('pending');
            $table->string('adjustment_reason')->nullable();
            $table->timestamps();

            $table->index('claim_id');
            $table->index('status');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('claim_items');
    }
};
