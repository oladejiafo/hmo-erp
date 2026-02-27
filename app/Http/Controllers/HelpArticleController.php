<?php
/**
 * FILE: app/Http/Controllers/HelpArticleController.php
 */
namespace App\Http\Controllers;

use App\Models\HelpArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HelpArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $role = Auth::user()?->roles()?->first()?->name ?? 'enrollee';
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

        $articles = $query->select([
            'id','title','slug','category','is_featured',
            'sort_order','view_count','helpful_count','updated_at',
        ])->paginate($request->per_page ?? 20);

        $items = $articles->through(fn ($a) => array_merge($a->toArray(), [
            'excerpt' => $a->excerpt,
            'category_label' => $a->category_label,
            'category_icon' => $a->category_icon,
        ]));

        $categories = HelpArticle::published()->visibleTo($role)
            ->selectRaw('category, count(*) as article_count')
            ->groupBy('category')
            ->get()
            ->map(fn ($c) => [
                'key' => $c->category,
                'label' => HelpArticle::CATEGORIES[$c->category]['label'] ?? $c->category,
                'icon' => HelpArticle::CATEGORIES[$c->category]['icon'] ?? '📄',
                'count' => $c->article_count,
            ]);

        $featured = HelpArticle::published()->visibleTo($role)
            ->where('is_featured', true)
            ->orderBy('sort_order')
            ->limit(6)
            ->select(['id','title','slug','category','sort_order'])
            ->get()
            ->map(fn ($a) => array_merge($a->toArray(), [
                'category_label' => $a->category_label,
                'category_icon' => $a->category_icon,
            ]));

        return response()->json([
            'data' => $items,
            'categories' => $categories,
            'featured' => $featured,
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'total' => $articles->total(),
            ],
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        /** @disregard P1013 */
        $role = Auth::user()?->roles()?->first()?->name ?? 'enrollee';
        $article = HelpArticle::published()->visibleTo($role)->where('slug', $slug)->firstOrFail();
        $article->incrementViews();

        $related = HelpArticle::published()->visibleTo($role)
            ->where('category', $article->category)
            ->where('id', '!=', $article->id)
            ->limit(5)
            ->select(['id','title','slug'])
            ->get();

        return response()->json([
            'data' => array_merge($article->toArray(), [
                'category_label' => $article->category_label,
                'category_icon' => $article->category_icon,
            ]),
            'related' => $related,
        ]);
    }

    public function forPage(Request $request): JsonResponse
    {
        /** @disregard P1013 */
        $role = Auth::user()?->roles()?->first()?->name ?? 'enrollee';
        $page = $request->validate(['page' => 'required|string'])['page'];

        $articles = HelpArticle::published()->visibleTo($role)
            ->forPage($page)
            ->orderBy('sort_order')
            ->select(['id','title','slug','category'])
            ->get()
            ->map(fn ($a) => array_merge($a->toArray(), [
                'excerpt' => $a->excerpt,
                'category_label' => $a->category_label,
                'category_icon' => $a->category_icon,
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

    // Admin methods
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'category' => 'required|in:' . implode(',', array_keys(HelpArticle::CATEGORIES)),
            'content' => 'required|string',
            'visible_to_roles' => 'nullable|array',
            'related_pages' => 'nullable|array',
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $article = HelpArticle::create([
            ...$data,
            'slug' => HelpArticle::generateSlug($data['title']),
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        return response()->json(['message'=>'Article created.', 'data'=>$article], 201);
    }

    public function update(Request $request, HelpArticle $article): JsonResponse
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:200',
            'category' => 'sometimes|in:' . implode(',', array_keys(HelpArticle::CATEGORIES)),
            'content' => 'sometimes|string',
            'visible_to_roles' => 'nullable|array',
            'related_pages' => 'nullable|array',
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $article->update([...$data, 'updated_by' => Auth::id()]);
        return response()->json(['message'=>'Article updated.', 'data'=>$article->fresh()]);
    }

    public function destroy(HelpArticle $article): JsonResponse
    {
        $article->delete();
        return response()->json(['message' => 'Article deleted.']);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $articles = HelpArticle::withTrashed()
            ->when($request->category, fn($q,$v)=>$q->where('category',$v))
            ->when($request->q, fn($q,$v)=>$q->search($v))
            ->orderBy('category')->orderBy('sort_order')
            ->paginate(30);

        return response()->json([
            'data' => $articles->through(fn($a) => array_merge($a->toArray(), [
                'category_label' => $a->category_label,
                'excerpt' => $a->excerpt,
            ])),
            'meta' => ['total'=>$articles->total()],
        ]);
    }
}