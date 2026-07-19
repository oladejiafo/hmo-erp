<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FILE LOCATION: database/migrations/2025_01_01_000006_create_compliance_tables.php
 *
 * Compliance Calendar module.
 *
 * Tracks regulatory and internal compliance obligations:
 *   - NHIS monthly/quarterly returns
 *   - NAICOM filing deadlines
 *   - NITDA data protection reports
 *   - Internal audit schedules
 *   - Contract renewal reminders
 *   - Staff certification renewals
 *
 * Tables:
 *   compliance_filings       - individual obligation records
 *   compliance_documents     - supporting documents per filing
 *
 * Depends on: branches, users
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── compliance_filings ────────────────────────────────────────────────
        Schema::create('compliance_filings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('branch_id')
                  ->constrained()
                  ->restrictOnDelete();

            // What type of obligation this is
            $table->enum('category', [
                'nhis_return',          // NHIS monthly claim returns
                'naicom_filing',        // NAICOM regulatory filing
                'nitda_report',         // NITDA data protection annual report
                'internal_audit',       // Scheduled internal audit
                'contract_renewal',     // HCP or corporate contract renewal
                'accreditation',        // HCP accreditation renewal
                'tax_filing',           // Tax returns (FIRS, state IRS)
                'board_resolution',     // Board or management resolutions
                'staff_certification',  // Staff professional cert renewal
                'other',
            ])->index();

            $table->string('title')
                  ->comment('Short descriptive title e.g. "NHIS Q2 2025 Claim Return"');

            $table->text('description')->nullable();

            // Key dates
            $table->date('due_date')
                  ->comment('Hard deadline for filing/submission');

            $table->date('reminder_date')
                  ->nullable()
                  ->comment('When to start sending alerts (defaults to 7 days before due_date)');

            $table->date('completed_date')
                  ->nullable()
                  ->comment('Null until filing is marked complete');

            // Filing lifecycle
            $table->enum('status', [
                'upcoming',    // Due date is in the future, no action yet
                'in_progress', // Someone is working on it
                'submitted',   // Filed/submitted to authority
                'completed',   // Confirmed complete (acknowledgement received)
                'overdue',     // Past due_date, still not completed
                'waived',      // Regulator granted extension or waiver
            ])->default('upcoming')->index();

            $table->enum('priority', ['low', 'medium', 'high', 'critical'])
                  ->default('medium')
                  ->index();

            // Recurrence for repeating obligations
            $table->enum('recurrence', [
                'none',
                'monthly',
                'quarterly',
                'biannual',
                'annual',
            ])->default('none');

            // Responsible parties
            $table->foreignId('assigned_to')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('User responsible for completing this filing');

            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->foreignId('completed_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // Submission tracking
            $table->string('submission_reference')->nullable()
                  ->comment('Reference number from the regulatory body upon submission');

            $table->text('completion_notes')->nullable();
            $table->text('notes')->nullable();

            // For contract_renewal and accreditation categories
            $table->string('related_entity_type')->nullable()
                  ->comment('e.g. App\Models\HealthCareProvider');
            $table->unsignedBigInteger('related_entity_id')->nullable();

            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index(['branch_id', 'due_date']);
            $table->index('due_date');
        });

        // ── compliance_documents ──────────────────────────────────────────────
        Schema::create('compliance_documents', function (Blueprint $table) {
            $table->id();

            $table->foreignId('filing_id')
                  ->constrained('compliance_filings')
                  ->cascadeOnDelete();

            $table->string('doc_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable()
                  ->comment('In bytes');

            $table->foreignId('uploaded_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamp('created_at')->useCurrent();

            $table->index('filing_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_documents');
        Schema::dropIfExists('compliance_filings');
    }
};