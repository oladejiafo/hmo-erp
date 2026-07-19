<?php

namespace App\Console\Commands;

use App\Services\LicenseService;
use Illuminate\Console\Command;

/**
 * CheckLicense - ERP artisan command
 *
 * Performs a license check-in with the central licensing server.
 * Scheduled to run automatically. Can also be run manually.
 *
 * SCHEDULE (in routes/console.php or Console/Kernel.php):
 *
 *   // Runs every 12 hours - the LicenseService only actually calls the server
 *   // when the cache has expired, so this is safe to run frequently.
 *   Schedule::command('license:check')->everyTwelveHours();
 *
 * USAGE:
 *   php artisan license:check           - normal check-in
 *   php artisan license:check --force   - force check-in even if cache still valid
 *   php artisan license:check --status  - show current status without check-in
 *
 * FILE: app/Console/Commands/CheckLicense.php
 */
class CheckLicense extends Command
{
    protected $signature   = 'license:check {--force} {--status}';
    protected $description = 'Check in with the licensing server and update the local license cache.';

    public function __construct(private LicenseService $licenseService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        // ── Status-only mode ──────────────────────────────────────────────
        if ($this->option('status')) {
            $summary = $this->licenseService->statusSummary();
            $this->displayStatus($summary);
            return self::SUCCESS;
        }

        // ── Check if check-in is actually needed ──────────────────────────
        if (! $this->option('force')) {
            $cache = \App\Models\LicenseCache::instance();
            if ($cache->valid_until && now()->lt($cache->valid_until)) {
                $this->info('License cache is still valid until ' . $cache->valid_until->toDateTimeString() . '. Skipping check-in.');
                $this->info('Use --force to check in anyway.');
                return self::SUCCESS;
            }
        }

        // ── Perform check-in ──────────────────────────────────────────────
        $this->info('Performing license check-in...');

        $status = $this->licenseService->performCheckin();

        if ($status === null) {
            $this->warn('Check-in failed (network error or server unavailable).');
            $this->warn('The system will continue operating normally while failures are within tolerance.');
            $this->displayStatus($this->licenseService->statusSummary());
            return self::FAILURE;
        }

        $this->info("Check-in successful. Status: {$status}");
        $this->displayStatus($this->licenseService->statusSummary());

        return self::SUCCESS;
    }

    private function displayStatus(array $summary): void
    {
        $statusColor = match ($summary['status']) {
            'valid'      => 'green',
            'grace'      => 'yellow',
            'restricted' => 'red',
            default      => 'gray',
        };

        $this->newLine();
        $this->line("  <fg={$statusColor};options=bold>Status:</> " . strtoupper($summary['status']));
        $this->line("  Plan:    " . ($summary['plan']        ?? '-'));
        $this->line("  Client:  " . ($summary['client_name'] ?? '-'));
        $this->line("  Key:     " . ($summary['license_key'] ?? '-'));
        $this->line("  Expires: " . ($summary['license_expires_at'] ?? 'Never (lifetime)'));

        if ($summary['is_grace']) {
            $this->line("  <fg=yellow>Grace ends: {$summary['grace_ends_at']} ({$summary['grace_days_remaining']} days remaining)</>");
        }

        if ($summary['is_restricted']) {
            $this->line("  <fg=red>System is in RESTRICTED MODE - write operations are blocked.</>");
        }

        $this->line("  Last check-in: " . ($summary['last_successful_checkin'] ?? 'Never'));
        $this->line("  Failures: {$summary['consecutive_failures']}");

        if ($summary['emergency_token_active']) {
            $this->line("  <fg=yellow>Emergency token active until: {$summary['emergency_token_expires']}</>");
        }

        $this->newLine();
    }
}