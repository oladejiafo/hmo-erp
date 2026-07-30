<?php
/**
 * FILE: database/migrations/2026_09_02_000001_add_plan_id_and_sent_at_to_corporate_invoices.php
 *
 * Found while investigating why CorporateInvoice::create() throws
 * MassAssignmentException on every call. There turned out to be THREE
 * independent, mutually-inconsistent implementations of invoice
 * generation (InvoiceService, and two different methods on
 * CorporateInvoiceController), none matching the actual migrated
 * corporate_invoices schema, plus a CorporateInvoiceResource that
 * references a named route (corporates.invoices.download) that doesn't
 * exist anywhere - meaning even the invoice LISTING page was broken,
 * not just creation.
 *
 * Every implementation agreed invoices should be tied to a specific
 * corporate plan, and should track when they were sent - both real,
 * consistently-intended features that just never got a column. Adding
 * them here rather than dropping the intent.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('corporate_invoices', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('corporate_id')->constrained('plans')->nullOnDelete();
            $table->timestamp('sent_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('corporate_invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn('sent_at');
        });
    }
};
