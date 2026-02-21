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
        Schema::create('dependents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollee_id')
                  ->constrained()
                  ->cascadeOnDelete()
                  ->comment('Principal enrollee this dependent belongs to');
            $table->string('dependent_id', 30)->unique()->comment('e.g. HMO-2024-000001-D1');
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('middle_name', 80)->nullable();
            $table->date('date_of_birth');
            $table->enum('gender', ['M', 'F']);
            $table->enum('relationship', ['spouse', 'child', 'parent', 'sibling'])
                  ->default('child');
            $table->string('phone', 20)->nullable();
            $table->string('photo_path')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->index('enrollee_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dependents');
    }
};
