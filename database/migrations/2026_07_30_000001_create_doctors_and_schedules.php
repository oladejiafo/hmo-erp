<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hcp_id')->constrained('health_care_providers')->cascadeOnDelete();
            $table->string('name');
            $table->string('specialty', 100);
            $table->string('qualification', 100)->nullable();
            $table->string('status', 20)->default('active'); // active | inactive
            $table->timestamps();
            $table->index(['hcp_id', 'specialty']);
        });

        // Recurring weekly availability — simple, not a full calendar.
        Schema::create('doctor_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0=Sunday..6=Saturday
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('slot_minutes')->default(30);
            $table->timestamps();
            $table->index(['doctor_id', 'day_of_week']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('doctor_id')->nullable()->after('hcp_id')->constrained('doctors')->nullOnDelete();
            $table->boolean('reminder_sent')->default(false)->after('status');
            // confirmed_time (existing column) now holds the exact HH:MM slot
            // when a doctor+slot booking is used, same field as before.
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('doctor_id');
            $table->dropColumn('reminder_sent');
        });
        Schema::dropIfExists('doctor_schedules');
        Schema::dropIfExists('doctors');
    }
};
