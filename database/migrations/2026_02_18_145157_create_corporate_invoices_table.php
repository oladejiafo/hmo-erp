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
        Schema::create('corporate_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('corporate_id')
                  ->constrained()
                  ->cascadeOnDelete();
            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete();
            $table->string('invoice_number', 50)->unique();
            $table->string('description')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled'])
                  ->default('draft');
            $table->date('issue_date');
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->foreignId('created_by')
                  ->constrained('users')
                  ->restrictOnDelete();
            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->index(['corporate_id', 'status']);
            $table->index(['branch_id', 'status']);
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('corporate_invoices');
    }
};
