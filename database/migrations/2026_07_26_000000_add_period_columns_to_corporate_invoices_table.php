<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CORRECTION — the frontend (CorpInvoicesPage.jsx, verified real file) reads
 * inv.period_from / inv.period_to / inv.period_label, and the pasted
 * CorporatePortalController used those same names plus `amount_due`.
 * Neither period_from/period_to/period_label NOR amount_due exist in the
 * real corporate_invoices table (verified real migration — it only has
 * issue_date, due_date, and total_amount). This is the same class of
 * frontend/backend/schema drift found repeatedly in this project, this
 * time surfaced by a real production SQL error.
 *
 * Fix has two parts:
 * 1. This migration — adds real, nullable period_start/period_end columns.
 *    Nullable because invoices generated before this migration have no
 *    period data; the controller falls back to deriving a label from
 *    issue_date for those older rows rather than showing blank.
 * 2. The controller fix (in this same package) — amount_due -> total_amount
 *    everywhere, and period_from/period_to/period_label now genuinely
 *    sourced from real columns instead of nonexistent ones.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('corporate_invoices', function (Blueprint $table) {
            $table->date('period_start')->nullable()->after('description');
            $table->date('period_end')->nullable()->after('period_start');
        });
    }

    public function down(): void
    {
        Schema::table('corporate_invoices', function (Blueprint $table) {
            $table->dropColumn(['period_start', 'period_end']);
        });
    }
};