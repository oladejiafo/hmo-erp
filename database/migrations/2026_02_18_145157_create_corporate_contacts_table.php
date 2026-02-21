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
        Schema::create('corporate_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('corporate_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('title', 80)->nullable()->comment('e.g. HR Manager, CEO');
            $table->string('email', 150)->nullable();
            $table->string('phone', 20)->nullable();
            $table->enum('type', ['primary', 'billing', 'hr', 'technical'])
                  ->default('primary');
            $table->boolean('is_portal_user')
                  ->default(false)
                  ->comment('Whether this contact has login access to corporate portal');
            $table->timestamps();

            $table->index('corporate_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('corporate_contacts');
    }
};
