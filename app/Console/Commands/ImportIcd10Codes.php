<?php
/**
 * FILE: app/Console/Commands/ImportIcd10Codes.php
 *
 * PHASE 3 - Mini EMR.
 * ICD-10-CM is roughly 70,000+ codes - too large to hand-write into a
 * seeder. Run this once against a downloaded code set instead:
 *
 *   php artisan icd10:import storage/app/icd10/codes.csv
 *
 * Expected CSV columns (header row required): code,description,category
 * category is optional - leave the column empty if you don't have one.
 *
 * A free, standard source: CMS.gov publishes the official ICD-10-CM code
 * list every year (search "CMS ICD-10-CM code tables"). Their raw format
 * is fixed-width text, not CSV - convert it once with a spreadsheet tool
 * or a short script before running this command. The WHO ICD-10 browser
 * (icd.who.int) is another option if you want the international version
 * rather than the US clinical modification.
 */
namespace App\Console\Commands;

use App\Models\Icd10Code;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportIcd10Codes extends Command
{
    protected $signature = 'icd10:import {path : Path to the CSV file, relative to the project root or absolute}';
    protected $description = 'Import or refresh the ICD-10 reference table from a CSV file (code,description,category)';

    public function handle(): int
    {
        $path = $this->argument('path');

        if (! file_exists($path)) {
            $this->error("File not found: {$path}");
            return self::FAILURE;
        }

        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $header = array_map(fn($h) => strtolower(trim($h)), $header);

        $codeIdx = array_search('code', $header);
        $descIdx = array_search('description', $header);
        $catIdx  = array_search('category', $header);

        if ($codeIdx === false || $descIdx === false) {
            $this->error('CSV must have at least "code" and "description" columns in the header row.');
            fclose($handle);
            return self::FAILURE;
        }

        $batch = [];
        $count = 0;
        $now = now();

        $this->info('Importing ICD-10 codes...');
        $bar = $this->output->createProgressBar();

        while (($row = fgetcsv($handle)) !== false) {
            $code = trim($row[$codeIdx] ?? '');
            $desc = trim($row[$descIdx] ?? '');
            if ($code === '' || $desc === '') {
                continue;
            }

            $batch[] = [
                'code'        => $code,
                'description' => $desc,
                'category'    => $catIdx !== false ? trim($row[$catIdx] ?? '') ?: null : null,
                'billable'    => true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ];
            $count++;

            // Upsert in chunks of 500 to keep memory flat on a 70k+ row file
            if (count($batch) >= 500) {
                Icd10Code::upsert($batch, ['code'], ['description', 'category', 'updated_at']);
                $bar->advance(count($batch));
                $batch = [];
            }
        }

        if (! empty($batch)) {
            Icd10Code::upsert($batch, ['code'], ['description', 'category', 'updated_at']);
            $bar->advance(count($batch));
        }

        $bar->finish();
        fclose($handle);

        $this->newLine(2);
        $this->info("Done. {$count} codes imported or refreshed.");

        return self::SUCCESS;
    }
}
