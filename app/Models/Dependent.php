<?php

namespace App\Models;

use App\Traits\HasAuditLog; 

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Dependent extends Model
{
    use HasFactory, HasAuditLog;

    protected $table = 'dependents';

    protected $fillable = [
        'enrollee_id',
        'dependent_id',
        'first_name',
        'last_name',
        'middle_name',
        'date_of_birth',
        'gender',
        'relationship',
        'phone',
        'photo_path',
        'status',
        'blood_group', 'genotype', 'added_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    /**
     * Get the enrollee that owns the dependent.
     */
    public function enrollee()
    {
        return $this->belongsTo(Enrollee::class);
    }

    /**
     * Get the claims for the dependent.
     */
    public function claims()
    {
        return $this->hasMany(Claim::class);
    }

    /**
     * Get the dependent's full name.
     */
    public function getFullNameAttribute(): string
    {
        return trim($this->first_name . ' ' . $this->middle_name . ' ' . $this->last_name);
    }

    /**
     * Get the dependent's age.
     */
    public function getAgeAttribute(): ?int
    {
        if (!$this->date_of_birth) {
            return null;
        }
        return $this->date_of_birth->age;
    }

    /**
     * Generate a unique dependent ID.
     */
    public static function generateUniqueId(string $prefix, string $column, int $digits = 4): string
    {
        $lastRecord = self::where($column, 'LIKE', $prefix . '%')
            ->orderBy($column, 'desc')
            ->first();

        if ($lastRecord) {
            $lastNumber = (int) substr($lastRecord->$column, -$digits);
            $newNumber = str_pad($lastNumber + 1, $digits, '0', STR_PAD_LEFT);
        } else {
            $newNumber = str_pad(1, $digits, '0', STR_PAD_LEFT);
        }

        return $prefix . '-' . $newNumber;
    }
}
