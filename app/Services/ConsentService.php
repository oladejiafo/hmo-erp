<?php
/**
 * FILE: app/Services/ConsentService.php
 *
 * PHASE 6 - Compliance. Single place that writes and reads consent
 * decisions, so "grant" and "revoke" always go through the same
 * validation (a real purpose, a real version) regardless of which
 * controller calls it.
 */
namespace App\Services;

use App\Models\Consent;
use App\Models\Enrollee;
use Illuminate\Support\Collection;

class ConsentService
{
    /**
     * Record a grant or revoke decision. Always inserts a new row - see
     * the migration docblock for why this is append-only rather than an
     * update-in-place.
     */
    public function decide(Enrollee $enrollee, string $purpose, bool $granted, ?string $ipAddress = null, ?string $userAgent = null): Consent
    {
        if (! array_key_exists($purpose, Consent::PURPOSES)) {
            throw new \InvalidArgumentException("Unknown consent purpose: {$purpose}");
        }

        return Consent::create([
            'branch_id'   => $enrollee->branch_id,
            'enrollee_id' => $enrollee->id,
            'purpose'     => $purpose,
            'granted'     => $granted,
            'version'     => config('hmo.privacy_notice_version', 'v1'),
            'decided_at'  => now(),
            'ip_address'  => $ipAddress,
            'user_agent'  => $userAgent ? substr($userAgent, 0, 255) : null,
        ]);
    }

    /**
     * Current status per purpose - the latest decision for each one.
     * Purposes with no decision at all yet come back as null (not
     * granted, not revoked - simply never asked / never answered).
     *
     * @return Collection<string, Consent|null>
     */
    public function currentStatus(Enrollee $enrollee): Collection
    {
        $latestPerPurpose = Consent::where('enrollee_id', $enrollee->id)
            ->orderByDesc('decided_at')->orderByDesc('id') // id as tiebreaker - decided_at can tie within the same second
            ->get()
            ->unique('purpose')
            ->keyBy('purpose');

        return collect(array_keys(Consent::PURPOSES))
            ->mapWithKeys(fn($purpose) => [$purpose => $latestPerPurpose->get($purpose)]);
    }

    public function hasConsented(Enrollee $enrollee, string $purpose): bool
    {
        $latest = Consent::where('enrollee_id', $enrollee->id)
            ->where('purpose', $purpose)
            ->orderByDesc('decided_at')->orderByDesc('id') // id as tiebreaker - decided_at can tie within the same second
            ->first();

        return $latest?->granted ?? false;
    }

    /**
     * Full decision history for one purpose - for the enrollee's own
     * "here's every time I changed my mind" view, or for a DPO/regulator
     * audit request.
     */
    public function history(Enrollee $enrollee, string $purpose): Collection
    {
        return Consent::where('enrollee_id', $enrollee->id)
            ->where('purpose', $purpose)
            ->orderByDesc('decided_at')->orderByDesc('id') // id as tiebreaker - decided_at can tie within the same second
            ->get();
    }
}
