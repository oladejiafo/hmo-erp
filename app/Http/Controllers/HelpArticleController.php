<?php

/**
 * FILE: app/Http/Controllers/HelpArticleController.php
 *
 * CHANGE 1: Added 'content' to SELECT in index().
 *   The excerpt accessor reads $this->content. Without it in SELECT, content
 *   is null → preg_replace crashes inside through() → articles list returns [].
 *   The featured and categories queries are separate (no through/excerpt) so
 *   they kept working - that's why 6 featured cards showed but articles didn't.
 *
 * CHANGE 2: through() now returns an explicit array excluding 'content' from
 *   the payload - we only needed it to build the excerpt string.
 *
 * CHANGE 3: Route order note - in routes/api.php, move /{slug} to LAST.
 *   It currently catches /for-page and /admin/list (treating them as slugs).
 */

namespace App\Http\Controllers;

use App\Models\HelpArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class HelpArticleController extends Controller
{
    private function currentRole(): string
    {
        $user = Auth::user();
        if (!$user) return 'enrollee';
        /** @disregard P1013 */
        return (string) ($user->roles?->first()?->name ?? $user->role ?? 'enrollee');
    }

    public function indexxx(Request $request): JsonResponse
    {
        $role = $this->currentRole();
        $query = HelpArticle::published()->visibleTo($role)->orderBy('sort_order');

        if ($request->filled('q')) {
            $query->search($request->q);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('page_context')) {
            $query->forPage($request->page_context);
        }

        // CHANGE: 'content' added - required by getExcerptAttribute()
        // Without it, $this->content is null inside through() → TypeError → empty list
        $articles = $query->select([
            'id',
            'title',
            'slug',
            'category',
            'content',      // ← required for excerpt; stripped from output below
            'is_featured',
            'sort_order',
            'view_count',
            'helpful_count',
            'updated_at',
        ])->paginate((int) ($request->per_page ?? 20));

        // CHANGE: explicit output array - content excluded from API response
        $items = $articles->through(fn(HelpArticle $a) => [
            'id'             => $a->id,
            'title'          => $a->title,
            'slug'           => $a->slug,
            'category'       => $a->category,
            'category_label' => $a->category_label,
            'category_icon'  => $a->category_icon,
            'excerpt'        => $a->excerpt,   // now safe - content is loaded
            'is_featured'    => $a->is_featured,
            'sort_order'     => $a->sort_order,
            'view_count'     => $a->view_count,
            'helpful_count'  => $a->helpful_count,
            'updated_at'     => $a->updated_at,
        ]);

        $categories = HelpArticle::published()->visibleTo($role)
            ->selectRaw('category, count(*) as article_count')
            ->groupBy('category')
            ->get()
            ->map(fn($c) => [
                'key'   => $c->category,
                'label' => HelpArticle::CATEGORIES[$c->category]['label'] ?? $c->category,
                'icon'  => HelpArticle::CATEGORIES[$c->category]['icon']  ?? '📄',
                'count' => (int) $c->article_count,
            ]);

        $featured = HelpArticle::published()->visibleTo($role)
            ->where('is_featured', true)
            ->orderBy('sort_order')
            ->limit(6)
            ->select(['id', 'title', 'slug', 'category', 'sort_order'])
            ->get()
            ->map(fn($a) => array_merge($a->toArray(), [
                'category_label' => $a->category_label,
                'category_icon'  => $a->category_icon,
            ]));

        return response()->json([
            'data'       => $items,
            'categories' => $categories,
            'featured'   => $featured,
            'meta'       => [
                'current_page' => $articles->currentPage(),
                'last_page'    => $articles->lastPage(),
                'total'        => $articles->total(),
            ],
        ]);
    }
    public function index(Request $request): JsonResponse
    {
        // Get user role
        $user = Auth::user();
        $role = $this->currentRole();
        $role = trim($role, '"');

        Log::info('=== HELP INDEX START ===');
        Log::info('User role: ' . $role);

        // Build query
        $query = HelpArticle::published()->visibleTo($role)->orderBy('sort_order');

        if ($request->filled('q')) {
            $query->search($request->q);
            Log::info('Search term: ' . $request->q);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
            Log::info('Category filter: ' . $request->category);
        }

        // Log the SQL before execution
        Log::info('SQL: ' . $query->toSql());
        Log::info('Bindings: ' . json_encode($query->getBindings()));

        // Get ALL articles (no pagination)
        $articles = $query->select([
            'id',
            'title',
            'slug',
            'category',
            'content',
            'is_featured',
            'sort_order',
            'view_count',
            'helpful_count',
            'updated_at',
        ])->get();

        // Log raw results
        Log::info('RAW ARTICLES COUNT: ' . $articles->count());

        if ($articles->isNotEmpty()) {
            Log::info('FIRST ARTICLE ID: ' . $articles->first()->id);
            Log::info('FIRST ARTICLE TITLE: ' . $articles->first()->title);
        } else {
            Log::warning('NO ARTICLES FOUND IN DATABASE QUERY');
        }

        // Transform using map()
        $items = $articles->map(function (HelpArticle $a) {
            // Log each article transformation
            Log::debug('Transforming article ID: ' . $a->id);

            return [
                'id'             => $a->id,
                'title'          => $a->title,
                'slug'           => $a->slug,
                'category'       => $a->category,
                'category_label' => $a->category_label,
                'category_icon'  => $a->category_icon,
                'excerpt'        => $a->excerpt,
                'is_featured'    => $a->is_featured,
                'sort_order'     => $a->sort_order,
                'view_count'     => $a->view_count,
                'helpful_count'  => $a->helpful_count,
                'updated_at'     => $a->updated_at,
            ];
        });

        Log::info('TRANSFORMED ITEMS COUNT: ' . $items->count());

        // Category sidebar
        $categories = HelpArticle::published()->visibleTo($role)
            ->selectRaw('category, count(*) as article_count')
            ->groupBy('category')
            ->get()
            ->map(fn(HelpArticle $c) => [
                'key'   => $c->category,
                'label' => HelpArticle::CATEGORIES[$c->category]['label'] ?? $c->category,
                'icon'  => HelpArticle::CATEGORIES[$c->category]['icon']  ?? '📄',
                'count' => (int) $c->article_count,
            ]);

        // Featured articles
        $featured = HelpArticle::published()->visibleTo($role)
            ->where('is_featured', true)
            ->orderBy('sort_order')
            ->limit(6)
            ->select(['id', 'title', 'slug', 'category', 'sort_order'])
            ->get()
            ->map(fn(HelpArticle $a) => [
                'id'             => $a->id,
                'title'          => $a->title,
                'slug'           => $a->slug,
                'category'       => $a->category,
                'category_label' => $a->category_label,
                'category_icon'  => $a->category_icon,
            ]);

        Log::info('=== HELP INDEX END ===');

        return response()->json([
            'data'       => $items,
            'categories' => $categories,
            'featured'   => $featured,
            'meta'       => [
                'total' => $items->count(),
            ],
        ]);
    }
    public function show(Request $request, string $slug): JsonResponse
    {
        $role = $this->currentRole();
        $article = HelpArticle::published()->visibleTo($role)->where('slug', $slug)->firstOrFail();
        $article->incrementViews();

        $related = HelpArticle::published()->visibleTo($role)
            ->where('category', $article->category)
            ->where('id', '!=', $article->id)
            ->limit(5)
            ->select(['id', 'title', 'slug'])
            ->get();

        return response()->json([
            'data' => array_merge($article->toArray(), [
                'category_label' => $article->category_label,
                'category_icon'  => $article->category_icon,
            ]),
            'related' => $related,
        ]);
    }

    public function forPage(Request $request): JsonResponse
    {
        $role = $this->currentRole();
        $page = $request->validate(['page' => 'required|string'])['page'];

        $articles = HelpArticle::published()->visibleTo($role)
            ->forPage($page)
            ->orderBy('sort_order')
            ->select(['id', 'title', 'slug', 'category', 'content'])
            ->get()
            ->map(fn($a) => array_merge($a->toArray(), [
                'excerpt'        => $a->excerpt,
                'category_label' => $a->category_label,
                'category_icon'  => $a->category_icon,
            ]));

        return response()->json(['data' => $articles]);
    }

    public function feedback(Request $request, HelpArticle $article): JsonResponse
    {
        $request->validate(['helpful' => 'required|boolean']);
        $request->helpful
            ? $article->increment('helpful_count')
            : $article->increment('not_helpful_count');

        return response()->json(['message' => 'Thank you for your feedback.']);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'            => 'required|string|max:200',
            'category'         => 'required|in:' . implode(',', array_keys(HelpArticle::CATEGORIES)),
            'content'          => 'required|string',
            'visible_to_roles' => 'nullable|array',
            'related_pages'    => 'nullable|array',
            'is_published'     => 'boolean',
            'is_featured'      => 'boolean',
            'sort_order'       => 'integer|min:0',
        ]);

        $article = HelpArticle::create([
            ...$data,
            'slug'       => HelpArticle::generateSlug($data['title']),
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        return response()->json(['message' => 'Article created.', 'data' => $article], 201);
    }

    public function update(Request $request, HelpArticle $article): JsonResponse
    {
        $data = $request->validate([
            'title'            => 'sometimes|string|max:200',
            'category'         => 'sometimes|in:' . implode(',', array_keys(HelpArticle::CATEGORIES)),
            'content'          => 'sometimes|string',
            'visible_to_roles' => 'nullable|array',
            'related_pages'    => 'nullable|array',
            'is_published'     => 'boolean',
            'is_featured'      => 'boolean',
            'sort_order'       => 'integer|min:0',
        ]);

        $article->update([...$data, 'updated_by' => Auth::id()]);
        return response()->json(['message' => 'Article updated.', 'data' => $article->fresh()]);
    }

    public function destroy(HelpArticle $article): JsonResponse
    {
        $article->delete();
        return response()->json(['message' => 'Article deleted.']);
    }
    public function adminShow(HelpArticle $article): JsonResponse
    {
        return response()->json([
            'data' => array_merge($article->toArray(), [
                'category_label' => $article->category_label,
                'category_icon' => $article->category_icon,
            ]),
        ]);
    }
    public function adminIndex(Request $request): JsonResponse
    {
        $articles = HelpArticle::withTrashed()
            ->when($request->category, fn($q, $v) => $q->where('category', $v))
            ->when($request->q,        fn($q, $v) => $q->search($v))
            ->orderBy('category')->orderBy('sort_order')
            ->get();  // ← Change from paginate(30) to get()

        $items = $articles->map(fn($a) => array_merge($a->toArray(), [
            'category_label' => $a->category_label,
            'excerpt'        => $a->excerpt,
        ]));

        return response()->json([
            'data' => $items,
            'meta' => ['total' => $items->count()],
        ]);
    }
}
