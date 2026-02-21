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
        Schema::create('corporates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete()
                  ->comment('Owning branch — usually the branch that signed the corporate');
            $table->string('name', 150);
            $table->string('code', 30)->unique()->comment('Internal corporate code e.g. CORP-0001');
            $table->string('rc_number', 50)->nullable()->comment('CAC registration number');
            $table->string('industry', 80)->nullable();
            $table->string('address')->nullable();
            $table->string('city', 80)->nullable();
            $table->string('state', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('logo_path')->nullable();
            $table->enum('status', ['active', 'suspended', 'expired', 'terminated'])
                  ->default('active');
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->unsignedInteger('total_employees')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('branch_id');
            $table->index('status');
            $table->index('contract_end_date')->comment('For renewal reminders');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('corporates');
    }
};
