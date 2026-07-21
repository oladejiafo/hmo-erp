<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Baseline NDPA consent capture. This was flagged as an open question
 * back in the original roadmap discussion ("NDPA compliance owner — no
 * answer yet") and never resolved. Self-enrolment is exactly the moment
 * this stops being optional — a stranger is handing over NIN, date of
 * birth, and health-plan intent through a public form with no staff
 * involved at all.
 *
 * This is NOT a full DPO/subject-access-request framework — that's a
 * bigger, separate compliance project. This is the minimum: record that
 * consent was given, when, and to which version of the privacy notice,
 * so there's a real audit trail rather than nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollees', function (Blueprint $table) {
            $table->timestamp('consent_given_at')->nullable()->after('nin');
            $table->string('consent_version', 20)->nullable()->after('consent_given_at');
        });
    }

    public function down(): void
    {
        Schema::table('enrollees', function (Blueprint $table) {
            $table->dropColumn(['consent_given_at', 'consent_version']);
        });
    }
};
