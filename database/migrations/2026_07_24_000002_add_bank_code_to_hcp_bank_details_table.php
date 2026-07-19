<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Check if column exists before adding
        if (!Schema::hasColumn('hcp_bank_details', 'bank_code')) {
            Schema::table('hcp_bank_details', function (Blueprint $table) {
                $table->string('bank_code', 10)->nullable()->after('bank_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('hcp_bank_details', 'bank_code')) {
            Schema::table('hcp_bank_details', function (Blueprint $table) {
                $table->dropColumn('bank_code');
            });
        }
    }
};