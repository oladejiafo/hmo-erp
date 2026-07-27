<?php
/**
 * FILE: app/Models/Icd10Code.php
 *
 * PHASE 3 - Mini EMR. Reference data - no branch scoping, shared across
 * the whole system.
 */
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Icd10Code extends Model
{
    protected $fillable = ['code', 'description', 'category', 'billable'];

    protected $casts = [
        'billable' => 'boolean',
    ];

    /**
     * Typeahead search - matches on code prefix (doctors often know the
     * first few characters) or a plain LIKE on description as a fallback
     * so it still works on SQLite in local dev, where fullText() index
     * lookups aren't available.
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $term = trim($term);

        return $query->where(function (Builder $q) use ($term) {
            $q->where('code', 'like', $term . '%')
              ->orWhere('description', 'like', '%' . $term . '%');
        });
    }
}
