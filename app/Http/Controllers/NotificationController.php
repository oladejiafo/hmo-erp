<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * FILE LOCATION: app/Http/Controllers/NotificationController.php
 *
 * Manages the in-app notification centre for the authenticated user.
 * All endpoints are scoped to the authenticated user — no cross-user access.
 *
 * ROUTES (add to routes/api.php, no extra permission needed — auth:sanctum is enough):
 *   GET    /notifications                → index()
 *   GET    /notifications/unread-count   → unreadCount()
 *   PATCH  /notifications/{id}/read      → markRead()
 *   POST   /notifications/mark-all-read  → markAllRead()
 */
class NotificationController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // INDEX — paginated notification list for the authenticated user
    // GET /notifications
    // ─────────────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $userId = auth()->id();

        $notifications = UserNotification::forUser($userId)
            ->when($request->unread_only, fn ($q) => $q->unread())
            ->when($request->type,        fn ($q, $t) => $q->byType($t))
            ->when($request->severity,    fn ($q, $s) => $q->bySeverity($s))
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 30);

        return response()->json([
            'data' => $notifications->map(fn ($n) => $this->format($n)),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
                'total'        => $notifications->total(),
                'unread_total' => UserNotification::forUser($userId)->unread()->count(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UNREAD COUNT — lightweight poll for the topbar bell badge
    // GET /notifications/unread-count
    // ─────────────────────────────────────────────────────────────────────────

    public function unreadCount(): JsonResponse
    {
        /** @disregard P1013 */
        $count    = UserNotification::forUser(auth()->id())->unread()->count();
        /** @disregard P1013 */
        $critical = UserNotification::forUser(auth()->id())->unread()->bySeverity('critical')->count();

        return response()->json([
            'data' => [
                'count'    => $count,
                'critical' => $critical,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK READ — mark a single notification as read
    // PATCH /notifications/{id}/read
    // ─────────────────────────────────────────────────────────────────────────

    public function markRead(UserNotification $notification): JsonResponse
    {
        /** @disregard P1013 */
        if ($notification->user_id !== auth()->id()) {
            abort(403);
        }

        $notification->markRead();

        return response()->json(['data' => $this->format($notification)]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MARK ALL READ — mark every unread notification as read for this user
    // POST /notifications/mark-all-read
    // ─────────────────────────────────────────────────────────────────────────

    public function markAllRead(): JsonResponse
    {
        /** @disregard P1013 */
        $updated = UserNotification::forUser(auth()->id())
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'data'    => ['marked_read' => $updated],
            'message' => "{$updated} notification(s) marked as read.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE
    // ─────────────────────────────────────────────────────────────────────────

    private function format(UserNotification $n): array
    {
        return [
            'id'          => $n->id,
            'type'        => $n->type,
            'severity'    => $n->severity,
            'title'       => $n->title,
            'body'        => $n->body,
            'action_url'  => $n->action_url,
            'is_read'     => $n->isRead(),
            'read_at'     => $n->read_at?->toIso8601String(),
            'created_at'  => $n->created_at?->toIso8601String(),
            'created_ago' => $n->created_at?->diffForHumans(),
        ];
    }
}