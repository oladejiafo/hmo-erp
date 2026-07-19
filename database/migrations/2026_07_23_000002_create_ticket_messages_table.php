<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Conversation thread on a ticket - the old `complaints` table only had a
 * single resolution_note, no back-and-forth. This is the one genuinely new
 * capability tickets add over complaints, not just a rename.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->string('sender_type', 20);
            // staff | enrollee | corporate | provider - mirrors tickets.source values
            // so the frontend can style "your message" vs "HMO reply" without
            // a join back to tickets on every message render.

            $table->text('message');
            $table->boolean('is_internal_note')->default(false);
            // staff-only notes, never shown to the portal user - same idea as
            // Claim::reviewer_notes vs rejection_reason being separate fields,
            // just generalized into a per-message flag instead of a separate column.

            $table->timestamps();

            $table->index('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_messages');
    }
};
