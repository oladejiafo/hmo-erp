<?php
/**
 * FILE: database/migrations/2026_08_19_000001_encrypt_pii_and_bank_fields.php
 *
 * PHASE 6 - Compliance. Field-level encryption for the two genuinely
 * sensitive plaintext fields found in the schema: enrollees.nin
 * (National Identity Number) and hcp_bank_details.account_number.
 *
 * TWO THINGS THIS MIGRATION HANDLES THAT ARE EASY TO GET WRONG:
 *
 * 1. Column width. Laravel's `encrypted` cast produces roughly 200
 *    characters of ciphertext even for a 10-character plaintext value
 *    (measured directly against this app's real APP_KEY before writing
 *    this). Both columns were VARCHAR(20). Without widening them first,
 *    every encrypted write would get silently truncated or rejected by
 *    MySQL strict mode - either way, real financial and identity data
 *    corrupted. This migration widens both to TEXT before anything else.
 *
 * 2. Idempotency. This runs once against production data that's
 *    currently plaintext, but MUST also be safe if it somehow runs
 *    twice, or runs on a fresh install with no legacy data, or runs
 *    after the app code (with the new `encrypted` casts) is already
 *    live. Every row is checked with a decrypt-attempt first: if it
 *    already decrypts successfully, it's left alone. Only genuinely
 *    plaintext values get encrypted. Safe to re-run at any time.
 *
 * Requires APP_KEY to be set before running - it already is in every
 * environment this app runs in, but flagging it since a missing
 * APP_KEY would make this migration fail loudly (safely) rather than
 * silently write garbage.
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollees', function (Blueprint $table) {
            $table->text('nin')->nullable()->change();
        });

        Schema::table('hcp_bank_details', function (Blueprint $table) {
            $table->text('account_number')->change();
        });

        $this->encryptColumn('enrollees', 'nin', nullable: true);
        $this->encryptColumn('hcp_bank_details', 'account_number', nullable: false);
    }

    /**
     * Encrypt every row's value in $column, unless it's already a
     * decryptable ciphertext (idempotency check) or empty.
     */
    private function encryptColumn(string $table, string $column, bool $nullable): void
    {
        DB::table($table)->orderBy('id')->chunkById(200, function ($rows) use ($table, $column) {
            foreach ($rows as $row) {
                $value = $row->{$column};

                if ($value === null || $value === '') {
                    continue;
                }

                if ($this->isAlreadyEncrypted($value)) {
                    continue; // idempotency: re-running this migration is always safe
                }

                DB::table($table)->where('id', $row->id)->update([
                    $column => Crypt::encryptString($value),
                ]);
            }
        });
    }

    private function isAlreadyEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);
            return true;
        } catch (DecryptException $e) {
            return false;
        }
    }

    public function down(): void
    {
        // Deliberately not reversible: decrypting back to plaintext on a
        // rollback would mean writing sensitive data back out in the
        // clear, which defeats the entire point of this migration. If
        // you need to roll back, decrypt manually and deliberately, not
        // as a side effect of `php artisan migrate:rollback`.
    }
};
