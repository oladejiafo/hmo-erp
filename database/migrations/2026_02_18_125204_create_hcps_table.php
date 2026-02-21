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
        Schema::create('hcps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete()
                  ->comment('Branch that manages/owns this HCP relationship');
            $table->string('hcp_code', 30)->unique()->comment('Internal code e.g. HCP-HOS-0001');
            $table->string('name', 150);
            $table->enum('type', ['hospital', 'clinic', 'pharmacy', 'lab', 'specialist'])
                  ->default('clinic');
            $table->string('address')->nullable();
            $table->string('city', 80)->nullable();
            $table->string('state', 50)->nullable();
            $table->string('lga', 80)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('alt_phone', 20)->nullable();
            $table->string('nhis_accreditation_no', 50)
                  ->nullable()
                  ->comment('National Health Insurance Scheme accreditation number');
            $table->enum('tier', ['primary', 'secondary', 'tertiary'])
                  ->default('primary')
                  ->comment('Care level — determines claim routing and approval limits');
            $table->enum('status', ['pending', 'active', 'suspended', 'blacklisted', 'terminated'])
                  ->default('pending');
            $table->decimal('performance_score', 5, 2)
                  ->default(100.00)
                  ->comment('0-100 score based on claim patterns, fraud flags, resolution time');
            $table->date('accredited_at')->nullable();
            $table->date('contract_expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('branch_id');
            $table->index('status');
            $table->index('type');
            $table->index('tier');
            $table->index('state');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hcps');
    }
};
