<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('user_notifications', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('user_notifications', 'notifiable_type')) {
                $table->string('notifiable_type')->nullable();
            }
            if (!Schema::hasColumn('user_notifications', 'notifiable_id')) {
                $table->unsignedBigInteger('notifiable_id')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_notifications', function (Blueprint $table) {
            //
        });
    }
};
