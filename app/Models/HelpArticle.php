<?php
/**
 * FILE: app/Models/HelpArticle.php
 * 
 * CHANGE: getExcerptAttribute() — added null guard on content.
 * preg_replace() throws TypeError (PHP 8.2) or returns null (8.1) when
 * $this->content is null, which happens when content is not in the SELECT.
 */
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class HelpArticle extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title','slug','category','content','visible_to_roles',
        'related_pages','is_published','is_featured','sort_order',
        'created_by','updated_by','view_count','helpful_count','not_helpful_count',
    ];

    protected $casts = [
        'visible_to_roles' => 'array',
        'related_pages' => 'array',
        'is_published' => 'boolean',
        'is_featured' => 'boolean',
    ];

    const CATEGORIES = [
        'getting_started' => ['label' => 'Getting Started', 'icon' => '🚀'],
        'enrollees' => ['label' => 'Enrollees & Members', 'icon' => '👥'],
        'claims' => ['label' => 'Claims Management', 'icon' => '📋'],
        'pre_auth' => ['label' => 'Pre-Authorisation', 'icon' => '🔐'],
        'plans' => ['label' => 'Health Plans', 'icon' => '🛡️'],
        'reports' => ['label' => 'Reports & Compliance', 'icon' => '📊'],
        'finance' => ['label' => 'Finance & Payments', 'icon' => '💰'],
        'hcps' => ['label' => 'Healthcare Providers', 'icon' => '🏥'],
        'administration' => ['label' => 'System Administration', 'icon' => '⚙️'],
        'self_service' => ['label' => 'Member Self-Service', 'icon' => '📱'],
    ];

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    public function scopeVisibleTo(Builder $q, string $role): Builder
    {
        return $q->where(function ($q) use ($role) {
            $q->whereNull('visible_to_roles')
              ->orWhereJsonContains('visible_to_roles', $role);
        });
    }

    public function scopeSearch(Builder $q, string $term): Builder
    {
        return $q->where(function ($q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
              ->orWhere('content', 'like', "%{$term}%");
        });
    }

    public function scopeForPage(Builder $q, string $page): Builder
    {
        return $q->whereJsonContains('related_pages', $page);
    }

    public function getCategoryLabelAttribute(): string
    {
        return self::CATEGORIES[$this->category]['label'] ?? ucfirst($this->category);
    }

    public function getCategoryIconAttribute(): string
    {
        return self::CATEGORIES[$this->category]['icon'] ?? '📄';
    }

    // FIX: null guard — content is not always loaded (not in SELECT on list queries)
    public function getExcerptAttribute(): string
    {
        $raw = $this->attributes['content'] ?? null;
        if ($raw === null || $raw === '') return '';
        $plain = preg_replace('/[#*_`\[\]()>-]/', '', (string) $raw);
        return Str::limit(trim((string) $plain), 150);
    }

    public static function generateSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 1;
        while (static::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }

    public function incrementViews(): void
    {
        $this->increment('view_count');
    }
}