<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\HcpTariff;

/**
 * Same fix as plans.corporate_id, applied to hcp_tariffs.hcp_id. NULL now
 * means an HMO-wide base tariff, the reference price for any service an
 * HCP hasn't negotiated their own rate for. The unique index
 * (hcp_id, service_code) still works with NULL hcp_id in MySQL/Postgres
 * since NULLs are not compared as equal for uniqueness, standard SQL
 * behavior, no workaround needed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hcp_tariffs', function (Blueprint $table) {
            $table->dropForeign(['hcp_id']);
        });
        Schema::table('hcp_tariffs', function (Blueprint $table) {
            $table->foreignId('hcp_id')->nullable()->change();
            $table->foreign('hcp_id')->references('id')->on('health_care_providers')->cascadeOnDelete();
        });

        if (! HcpTariff::whereNull('hcp_id')->exists()) {
            $baseTariffs = [
                ['service_code' => 'CONS-GEN-001', 'service_name' => 'General Consultation', 'category' => 'consultation', 'agreed_price' => 5000],
                ['service_code' => 'LAB-CBC-001', 'service_name' => 'Complete Blood Count', 'category' => 'laboratory', 'agreed_price' => 3500],
                ['service_code' => 'LAB-MAL-001', 'service_name' => 'Malaria Test', 'category' => 'laboratory', 'agreed_price' => 2000],
                ['service_code' => 'RAD-XRAY-001', 'service_name' => 'X-Ray (single view)', 'category' => 'radiology', 'agreed_price' => 8000],
                ['service_code' => 'EMER-001', 'service_name' => 'Emergency Consultation', 'category' => 'emergency', 'agreed_price' => 10000],
            ];

            foreach ($baseTariffs as $t) {
                HcpTariff::create([
                    'hcp_id' => null,
                    ...$t,
                    'is_active' => true,
                    'effective_from' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('hcp_tariffs', function (Blueprint $table) {
            $table->dropForeign(['hcp_id']);
        });
        \Illuminate\Support\Facades\DB::table('hcp_tariffs')->whereNull('hcp_id')->delete();
        Schema::table('hcp_tariffs', function (Blueprint $table) {
            $table->foreignId('hcp_id')->nullable(false)->change();
            $table->foreign('hcp_id')->references('id')->on('health_care_providers')->cascadeOnDelete();
        });
    }
};
