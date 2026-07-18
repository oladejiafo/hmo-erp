<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 — Fraud/trust loop.
 *
 * Adds enrollee-side utilization confirmation to the existing claims table.
 * This is the "did you actually receive this service" check — the enrollee
 * confirms or disputes a claim before it moves further down the approval chain.
 *
 * NOTE: assumes `claims` table exists already (it does, per Claim.php).
 * No changes to existing columns, this is purely additive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->string('enrollee_confirmation_status', 20)
                ->default('pending')
                ->after('is_pre_authorized');
            // pending | confirmed | disputed

            $table->timestamp('enrollee_confirmed_at')->nullable()->after('enrollee_confirmation_status');
            $table->timestamp('enrollee_disputed_at')->nullable()->after('enrollee_confirmed_at');
            $table->text('enrollee_dispute_reason')->nullable()->after('enrollee_disputed_at');

            $table->index('enrollee_confirmation_status');
        });
    }

    public function down(): void
    {
        Schema::table('claims', function (Blueprint $table) {
            $table->dropIndex(['enrollee_confirmation_status']);
            $table->dropColumn([
                'enrollee_confirmation_status',
                'enrollee_confirmed_at',
                'enrollee_disputed_at',
                'enrollee_dispute_reason',
            ]);
        });
    }
};
