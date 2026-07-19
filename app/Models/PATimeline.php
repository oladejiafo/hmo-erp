<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * FILE LOCATION: app/Models/PATimeline.php
 *
 * Append-only audit trail for PA events.
 * No updated_at column - rows are never modified after insert.
 *
 * @property int         $id
 * @property int         $pre_authorisation_id
 * @property string      $event
 * @property string|null $event_label
 * @property int|null    $actor_id
 * @property string|null $actor_name
 * @property string|null $note
 * @property string|null $status_after
 * @property array|null  $meta
 * @property \Carbon\Carbon $created_at
 */
class PATimeline extends Model
{
    // No updated_at column in this table
    const UPDATED_AT = null;

    protected $table = 'pa_timelines';

    protected $fillable = [
        'pre_authorisation_id',
        'event',
        'event_label',
        'actor_id',
        'actor_name',
        'note',
        'status_after',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    // ─────────────────────────────────────────────────────────────────────
    // RELATIONSHIPS
    // ─────────────────────────────────────────────────────────────────────

    public function preAuthorisation(): BelongsTo
    {
        return $this->belongsTo(PreAuthorisation::class, 'pre_authorisation_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}