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
        Schema::create('enrollee_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollee_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->string('card_number', 30)->unique()->comment('Printed card number');
            $table->string('qr_code_data')->comment('QR payload - encodes enrollee_id + plan + expiry');
            $table->string('qr_image_path')->nullable()->comment('Path to generated QR PNG');
            $table->enum('status', ['active', 'expired', 'lost', 'replaced', 'cancelled'])
                  ->default('active');
            $table->date('issued_at');
            $table->date('expires_at');
            $table->foreignId('issued_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->string('replacement_reason')->nullable();
            $table->timestamps();

            $table->index('enrollee_id');
            $table->index('card_number');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollee_cards');
    }
};
