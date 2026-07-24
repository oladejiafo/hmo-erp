<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `plans` has no price field at all — only copay_amount (per-visit, not
 * the same thing). This is why the retail calculator ended up hardcoded:
 * there was nothing real to read. Fixes that at the source instead of
 * patching around it again.
 *
 * is_public: shown on the unauthenticated /join browse-plans page.
 * is_default: the fallback plan for anyone with no employer-negotiated
 * plan — exactly the "XYZ HMO Standard Plan" concept described. Only one
 * plan per corporate should be is_default=true; enforced in the
 * controller, not the DB (a DB-level unique-partial-index is possible but
 * driver-dependent across mysql/pgsql/sqlite, not worth the complexity
 * for a single boolean flag with one write path).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->decimal('annual_premium', 12, 2)->nullable()->after('max_benefit_value');
            $table->boolean('is_public')->default(false)->after('status');
            $table->boolean('is_default')->default(false)->after('is_public');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['annual_premium', 'is_public', 'is_default']);
        });
    }
};
