<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\GenerateScheduledReportsJob;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/// * * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1

Schedule::job(new GenerateScheduledReportsJob)->dailyAt('06:00');

Schedule::command('sanctum:prune-expired --hours=24')->daily();

/**
    * * * * * cd /path-to-erp && php artisan schedule:run >> /dev/null 2>&1
*/ 
// ── License validation ────────────────────────────────────────────────────────
// Schedule::command('license:check')->daily();
Schedule::command('license:check')
         ->daily()
         ->withoutOverlapping()
         ->runInBackground()
         ->onFailure(function () {
             // Silent failure — LicenseService handles grace period logic internally.
             // The command itself logs warnings via Log::warning().
         });