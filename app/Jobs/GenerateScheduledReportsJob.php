<?php
/**
 * FILE: app/Jobs/GenerateScheduledReportsJob.php
 *
 * Runs on a daily schedule (via Kernel.php).
 * Checks report_schedules table and fires any reports due today.
 *
 * Register in app/Console/Kernel.php:
 *   $schedule->job(new GenerateScheduledReportsJob)->daily()->at('06:00');
 */
namespace App\Jobs;

use App\Models\GeneratedReport;
use App\Services\NhiaReportService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GenerateScheduledReportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function handle(NhiaReportService $service): void
    {
        $today     = Carbon::today();
        $schedules = DB::table('report_schedules')->where('enabled', true)->get();

        foreach ($schedules as $schedule) {
            if (!$this->isDue($schedule, $today)) continue;

            [$period, $start, $end] = $this->resolvePeriod($schedule, $today);

            // Don't regenerate if already done this period
            $exists = GeneratedReport::where('report_type', $schedule->report_type)
                ->where('period', $period)
                ->whereIn('status', ['queued','generating','ready'])
                ->exists();
            if ($exists) continue;

            $report = GeneratedReport::create([
                'generated_by' => null,  // system-generated
                'report_type'  => $schedule->report_type,
                'period'       => $period,
                'period_start' => $start,
                'period_end'   => $end,
                'format'       => $schedule->format ?? 'xlsx',
                'config'       => $schedule->config ? json_decode($schedule->config, true) : null,
                'status'       => 'queued',
            ]);

            try {
                $service->generate($report);
                DB::table('report_schedules')
                    ->where('report_type', $schedule->report_type)
                    ->update(['last_run_at' => now(), 'next_run_at' => $this->nextRun($schedule, $today)]);

                Log::info("Scheduled report generated: {$schedule->report_type} for {$period}");
            } catch (\Throwable $e) {
                Log::error("Scheduled report failed: {$schedule->report_type}", ['error' => $e->getMessage()]);
            }
        }
    }

    private function isDue(object $schedule, Carbon $today): bool
    {
        return match ($schedule->frequency) {
            'monthly'   => $today->day === (int) $schedule->day_of_month,
            'quarterly' => in_array($today->month, [1,4,7,10]) && $today->day === (int) $schedule->day_of_month,
            'annually'  => $today->month === 1 && $today->day === (int) $schedule->day_of_month,
            default     => false,
        };
    }

    private function resolvePeriod(object $schedule, Carbon $today): array
    {
        $prev = $today->copy()->subMonth();
        return match ($schedule->frequency) {
            'monthly'   => [$prev->format('Y-m'), $prev->startOfMonth()->format('Y-m-d'), $prev->endOfMonth()->format('Y-m-d')],
            'quarterly' => [$prev->format('Y').'-Q'.ceil($prev->month/3), $prev->startOfQuarter()->format('Y-m-d'), $prev->endOfQuarter()->format('Y-m-d')],
            'annually'  => [($today->year-1).'',$today->year-1 .'-01-01',$today->year-1 .'-12-31'],
            default     => [$prev->format('Y-m'), $prev->startOfMonth()->format('Y-m-d'), $prev->endOfMonth()->format('Y-m-d')],
        };
    }

    private function nextRun(object $schedule, Carbon $today): string
    {
        return match ($schedule->frequency) {
            'quarterly' => $today->copy()->addMonths(3)->startOfMonth()->addDays($schedule->day_of_month - 1)->toDateString(),
            'annually'  => $today->copy()->addYear()->startOfYear()->addDays($schedule->day_of_month - 1)->toDateString(),
            default     => $today->copy()->addMonth()->startOfMonth()->addDays($schedule->day_of_month - 1)->toDateString(),
        };
    }
}