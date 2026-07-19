<?php
/**
 * NEW FILE - app/Services/TicketService.php
 *
 * One creation path for all four ticket sources (enrollee/corporate/
 * provider/staff) instead of duplicating the same logic four times across
 * three portal controllers plus a staff controller. Each portal controller
 * just validates its own input shape and calls this.
 */

namespace App\Services;

use App\Enums\TicketPriority;
use App\Models\Ticket;
use App\Models\User;

class TicketService
{
    /**
     * @param User $user The authenticated user raising the ticket (portal user or staff)
     * @param array $data subject, description, category, priority?, hcp_id?, hcp_name?
     */
    public function createForUser(User $user, array $data): Ticket
    {
        $priority = TicketPriority::tryFrom($data['priority'] ?? 'medium') ?? TicketPriority::MEDIUM;

        $source = match ($user->user_type) {
            'enrollee_user'  => 'enrollee_portal',
            'corporate_user' => 'corporate_portal',
            'hcp_user'       => 'provider_portal',
            default          => 'hmo_staff',
        };

        $ticketNumber = Ticket::generateUniqueId('TKT', 'ticket_number', 6, $user->branch?->code);

        return Ticket::create([
            'branch_id' => $user->branch_id,
            'ticket_number' => $ticketNumber,
            'subject' => $data['subject'],
            'description' => $data['description'],
            'category' => $data['category'] ?? null,
            'priority' => $priority->value,
            'status' => 'open',
            'source' => $source,
            'raised_by_user_id' => $user->id,
            'enrollee_id' => $user->enrollee_id,
            'corporate_id' => $user->corporate_id,
            'hcp_id' => $user->hcp_id,
            'hcp_name' => $data['hcp_name'] ?? null,
            'sla_target_hours' => $priority->defaultSlaHours(),
        ]);
    }

    /**
     * Add a message to the thread. $isStaff controls sender_type/internal-note eligibility.
     */
    public function addMessage(Ticket $ticket, User $user, string $message, bool $isInternalNote = false): \App\Models\TicketMessage
    {
        $senderType = match ($user->user_type) {
            'enrollee_user'  => 'enrollee',
            'corporate_user' => 'corporate',
            'hcp_user'       => 'provider',
            default          => 'staff',
        };

        $ticketMessage = $ticket->messages()->create([
            'user_id' => $user->id,
            'sender_type' => $senderType,
            'message' => $message,
            'is_internal_note' => $isInternalNote && $senderType === 'staff',
            // internal notes only make sense from staff - a portal user
            // can't mark their own message internal, ignored if attempted
        ]);

        // A reply from staff on an open ticket nudges it to in_progress -
        // mirrors how a claim moves out of "submitted" the moment someone
        // touches it. A reply from the portal user doesn't change status;
        // them replying isn't staff having started work.
        if ($senderType === 'staff' && $ticket->status->value === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }
        

        // [PHASE 3] Notify whoever raised the ticket when staff reply.
        // Not the reverse - staff already see all tickets in their queue,
        // they don't need a notification for every portal-user reply.
        if ($senderType === 'staff') {
            /** @disregard P1013 */
            app(\App\Services\NotificationService::class)->ticketReplied($ticket, $ticket->raisedBy);
        }

        return $ticketMessage;
    }
}
