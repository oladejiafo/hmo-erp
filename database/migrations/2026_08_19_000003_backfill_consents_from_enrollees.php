<?php
/**
 * FILE: database/migrations/2026_08_19_000003_backfill_consents_from_enrollees.php
 *
 * Every enrollee who already has consent_given_at set gets one
 * data_processing consent row in the new table, preserving their real
 * original consent date rather than starting everyone's history at
 * "today". Safe to re-run: skips any enrollee who already has a
 * data_processing row (idempotency, same reasoning as the encryption
 * migration).
 */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('enrollees')
            ->whereNotNull('consent_given_at')
            ->orderBy('id')
            ->chunkById(200, function ($enrollees) {
                foreach ($enrollees as $enrollee) {
                    $alreadyBackfilled = DB::table('consents')
                        ->where('enrollee_id', $enrollee->id)
                        ->where('purpose', 'data_processing')
                        ->exists();

                    if ($alreadyBackfilled) {
                        continue;
                    }

                    DB::table('consents')->insert([
                        'branch_id'   => $enrollee->branch_id,
                        'enrollee_id' => $enrollee->id,
                        'purpose'     => 'data_processing',
                        'granted'     => true,
                        'version'     => $enrollee->consent_version ?? 'v1',
                        'decided_at'  => $enrollee->consent_given_at,
                        'created_at'  => $enrollee->consent_given_at,
                        'updated_at'  => $enrollee->consent_given_at,
                    ]);
                }
            });
    }

    public function down(): void
    {
        DB::table('consents')->where('purpose', 'data_processing')->delete();
    }
};
