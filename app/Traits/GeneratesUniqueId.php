<?php

namespace App\Traits;

/**
 * Provides structured, sequential unique ID generation for ERP entities.
 * Format examples:
 *   Enrollees:  HMO-2024-000001
 *   Claims:     CLM-ABJ-2024-000001
 *   Batches:    BATCH-ABJ-2024-001
 *   Cards:      CARD-2024-000001
 *   Invoices:   INV-2024-000001
 *
 * Each model using this trait must define $uniqueIdConfig.
 */
trait GeneratesUniqueId
{
    /**
     * Call this from a service BEFORE creating the model.
     *
     * @param  string  $prefix   e.g. 'HMO', 'CLM'
     * @param  string  $column   The column to check uniqueness against
     * @param  int     $padding  Zero-pad length (default 6)
     * @param  string|null  $branchCode  Optional branch code to embed
     * @return string
     */
    public static function generateUniqueId(
        string $prefix,
        string $column,
        int $padding = 6,
        ?string $branchCode = null
    ): string {
        $year = date('Y');
        $branchPart = $branchCode ? "-{$branchCode}" : '';
        $basePrefix = "{$prefix}{$branchPart}-{$year}-";

        // Find the highest existing number with this prefix
        $last = static::withoutGlobalScopes()
            ->where($column, 'like', "{$basePrefix}%")
            ->orderByDesc($column)
            ->value($column);

        if ($last) {
            // Extract the sequential number from the end
            $lastNumber = (int) substr($last, strrpos($last, '-') + 1);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return $basePrefix . str_pad($nextNumber, $padding, '0', STR_PAD_LEFT);
    }
}