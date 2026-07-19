<?php
/**
 * NEW FILE - app/Http/Controllers/TicketController.php
 * Staff-facing ticket queue. Mirrors PreAuthController's index/show/assign
 * shape (permission-gated, branch-scoped via BelongsToBranch global scope).
 */

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Services\TicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    public function __construct(protected TicketService $ticketService) {}

    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['raisedBy:id,name', 'enrollee:id,first_name,last_name,enrollee_id', 'corporate:id,name', 'hcp:id,name', 'assignedToUser:id,name']);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($priority = $request->input('priority')) {
            $query->where('priority', $priority);
        }

        if ($request->boolean('unassigned')) {
            $query->unassigned();
        }

        if ($request->boolean('assigned_to_me')) {
            $query->where('assigned_to', Auth::id());
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        $tickets = $query->orderByDesc('created_at')->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => collect($tickets->items())->map(fn($t) => [
                'id' => $t->id,
                'ticket_number' => $t->ticket_number,
                'subject' => $t->subject,
                'priority' => $t->priority,
                'status' => $t->status,
                'source' => $t->source,
                'raised_by' => $t->raisedBy?->name,
                'context' => $t->enrollee?->first_name . ' ' . $t->enrollee?->last_name
                    ?: $t->corporate?->name
                    ?: $t->hcp?->name
                    ?: null,
                'assigned_to' => $t->assignedToUser?->name,
                'sla_status' => $t->sla_status,
                'created_at' => $t->created_at?->format('Y-m-d H:i'),
            ]),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['raisedBy', 'enrollee', 'corporate', 'hcp', 'assignedToUser', 'resolver', 'messages.user:id,name,user_type']);

        return response()->json(['data' => $ticket]);
    }

    public function assign(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate(['user_id' => 'required|integer|exists:users,id']);

        $ticket->update([
            'assigned_to' => $request->user_id,
            'assigned_by' => Auth::id(),
            'assigned_at' => now(),
            'status' => $ticket->status->value === 'open' ? 'in_progress' : $ticket->status->value,
        ]);

        return response()->json(['message' => 'Ticket assigned.', 'data' => $ticket->fresh()]);
    }

    public function reply(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|min:1|max:5000',
            'is_internal_note' => 'nullable|boolean',
        ]);

        $message = $this->ticketService->addMessage(
            $ticket,
            $request->user(),
            $request->message,
            $request->boolean('is_internal_note')
        );

        return response()->json(['message' => 'Reply added.', 'data' => $message], 201);
    }

    public function resolve(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate(['resolution_note' => 'required|string|min:5|max:2000']);

        $ticket->update([
            'status' => 'resolved',
            'resolution_note' => $request->resolution_note,
            'resolved_at' => now(),
            'resolved_by' => Auth::id(),
        ]);

        return response()->json(['message' => 'Ticket resolved.', 'data' => $ticket->fresh()]);
    }

    public function close(Ticket $ticket): JsonResponse
    {
        if ($ticket->status->value !== 'resolved') {
            return response()->json(['message' => 'Only resolved tickets can be closed.'], 422);
        }

        $ticket->update(['status' => 'closed', 'closed_at' => now()]);

        return response()->json(['message' => 'Ticket closed.', 'data' => $ticket->fresh()]);
    }

    public function reopen(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:5|max:1000']);

        $ticket->update([
            'status' => 'in_progress',
            'closed_at' => null,
        ]);

        $this->ticketService->addMessage($ticket, $request->user(), "Reopened: {$request->reason}", true);

        return response()->json(['message' => 'Ticket reopened.', 'data' => $ticket->fresh()]);
    }
}
