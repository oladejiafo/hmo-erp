<?php
/**
 * FILE: database/migrations/2026_08_26_000001_create_data_breach_incidents_table.php
 *
 * PHASE 6 - Compliance. NDPA (and most data protection regimes generally)
 * require a documented breach register - what happened, when discovered,
 * who was affected, whether the regulator/data subjects were notified,
 * and how it was remediated. This didn't exist anywhere in the app.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_breach_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');

            $table->string('title');
            $table->text('description');
            $table->string('data_categories_affected'); // e.g. "NIN, health records, bank details"
            $table->unsignedInteger('affected_records_count')->default(0);

            $table->string('severity', 20)->default('medium'); // low | medium | high | critical

            $table->timestamp('occurred_at')->nullable();   // when the breach actually happened, if known
            // $table->timestamp('discovered_at');   
            $table->dateTime('discovered_at')->notNull();           // when it was found - the clock that matters for notification deadlines

            $table->boolean('regulator_notified')->default(false);
            $table->timestamp('regulator_notified_at')->nullable();

            $table->boolean('data_subjects_notified')->default(false);
            $table->timestamp('data_subjects_notified_at')->nullable();

            $table->text('remediation_actions')->nullable();
            $table->string('status', 20)->default('open'); // open | contained | resolved

            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index('discovered_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_breach_incidents');
    }
};
