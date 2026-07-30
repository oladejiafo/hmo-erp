<?php
/**
 * FILE: app/Services/NdpaReportService.php
 *
 * PHASE 6 - Compliance. NDPA-specific reports, separate from NhiaReportService
 * deliberately - NHIA and NDPA are two different regulators with two
 * different concerns (claims/utilisation returns vs. data protection),
 * and mixing them into one service made the naming confusing. This
 * duplicates a handful of small spreadsheet-formatting helper methods
 * from NhiaReportService rather than extracting a shared trait - a
 * conscious choice: NhiaReportService generates your regulator-facing
 * NHIA returns and is already working. Refactoring it to share code
 * with a brand new service isn't worth the risk of regressing something
 * that already works, for the sake of a few dozen lines of DRY-ness.
 *
 * Feeds into the same generated_reports pipeline as NHIA reports - same
 * queue, same download flow, same everything on the frontend once the
 * report_type is one of the two added here.
 */
namespace App\Services;

use App\Models\Consent;
use App\Models\Enrollee;
use App\Models\GeneratedReport;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\Style\{Alignment, Fill};
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class NdpaReportService
{
    private array $hmoInfo;

    public function __construct()
    {
        $this->hmoInfo = [
            'name' => config('hmo.name', 'HMO NAME'),
        ];
    }

    public function generate(GeneratedReport $report): void
    {
        $report->update(['status' => 'generating']);

        try {
            match ($report->report_type) {
                'ndpa_data_processing_register' => $this->generateDataProcessingRegister($report),
                'ndpa_consent_audit'             => $this->generateConsentAudit($report),
                default => throw new \InvalidArgumentException("Unknown NDPA report type: {$report->report_type}"),
            };
        } catch (\Throwable $e) {
            $report->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * NDPA Article-style Record of Processing Activities: what personal
     * data this app processes, for what purpose, on what legal basis,
     * and how long it's retained. This one is mostly static/declarative
     * (it documents the SYSTEM's processing activities, not per-enrollee
     * data), with live counts pulled in so it's not just a hardcoded page.
     */
    public function generateDataProcessingRegister(GeneratedReport $report): void
    {
        $spreadsheet = $this->createWorkbook();
        $sheet = $spreadsheet->getActiveSheet()->setTitle('Processing Register');

        $this->writeHeader($sheet, 'DATA PROCESSING REGISTER', $report->period);

        $headers = ['Category of Data', 'Purpose', 'Legal Basis', 'Data Subjects', 'Retention', 'Current Records'];
        $this->writeHeaders($sheet, 6, $headers);

        $activeEnrollees = Enrollee::where('status', 'active')->count();
        $totalEnrollees  = Enrollee::count();

        $rows = [
            ['Identity data (name, DOB, NIN, photo)', 'Enrollee identification and verification', 'Contract (HMO membership)', 'Enrollees & dependents', 'Duration of membership + 7 years', $totalEnrollees],
            ['Health/clinical data (diagnoses, prescriptions, consultation notes)', 'Delivery of healthcare services and claims processing', 'Contract + vital interest', 'Enrollees & dependents', 'Duration of membership + 7 years', $totalEnrollees],
            ['Financial data (bank details, payment records)', 'Provider payment processing and claims settlement', 'Contract', 'Healthcare providers', 'Duration of contract + 7 years', \App\Models\HealthCareProvider::count()],
            ['Contact data (phone, email, address)', 'Service communication and notifications', 'Contract + consent (marketing)', 'Enrollees, dependents, corporate contacts', 'Duration of membership', $activeEnrollees],
            ['Consent records', 'Demonstrating lawful basis for processing', 'Legal obligation', 'All data subjects', 'Duration of membership + 7 years', Consent::count()],
        ];

        $row = 7;
        foreach ($rows as $r) {
            $sheet->fromArray($r, null, 'A' . $row);
            $row++;
        }

        $this->autoStyleSheet($sheet, count($headers));
        $this->saveReport($report, $spreadsheet);

        $report->update([
            'status' => 'ready',
            'record_count' => count($rows),
            'generated_at' => now(),
        ]);
    }

    /**
     * Every consent decision made in the reporting period - the thing a
     * DPO or regulator actually asks for: "show me what people consented
     * to and when". Pulls straight from the append-only consents table.
     */
    public function generateConsentAudit(GeneratedReport $report): void
    {
        $start = $report->period_start;
        $end   = $report->period_end;

        $consents = Consent::with('enrollee:id,first_name,last_name,enrollee_id')
            ->whereBetween('decided_at', [$start, $end])
            ->orderBy('decided_at')
            ->get();

        $spreadsheet = $this->createWorkbook();
        $sheet = $spreadsheet->getActiveSheet()->setTitle('Consent Audit');

        $this->writeHeader($sheet, 'CONSENT AUDIT LOG', $report->period);

        $headers = ['Date', 'Enrollee', 'Enrollee ID', 'Purpose', 'Decision', 'Version', 'IP Address'];
        $this->writeHeaders($sheet, 6, $headers);

        $row = 7;
        foreach ($consents as $c) {
            $sheet->fromArray([
                $c->decided_at->format('d/m/Y H:i'),
                $c->enrollee?->first_name . ' ' . $c->enrollee?->last_name,
                $c->enrollee?->enrollee_id,
                Consent::PURPOSES[$c->purpose] ?? $c->purpose,
                $c->granted ? 'GRANTED' : 'WITHDRAWN',
                $c->version,
                $c->ip_address,
            ], null, 'A' . $row);
            $row++;
        }

        $this->autoStyleSheet($sheet, count($headers));
        $this->saveReport($report, $spreadsheet);

        $report->update([
            'status' => 'ready',
            'record_count' => $consents->count(),
            'generated_at' => now(),
        ]);
    }

    // ── Shared spreadsheet helpers - same pattern as NhiaReportService ──────

    private function createWorkbook(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getProperties()
            ->setCreator($this->hmoInfo['name'])
            ->setTitle('NDPA Report')
            ->setCompany($this->hmoInfo['name']);
        return $spreadsheet;
    }

    private function writeHeader($sheet, string $title, ?string $period): void
    {
        $sheet->mergeCells('A1:G1');
        $sheet->setCellValue('A1', strtoupper($this->hmoInfo['name']));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->mergeCells('A3:G3');
        $sheet->setCellValue('A3', strtoupper($title));
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(12);
        $sheet->getStyle('A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A4', 'Period: ' . ($period ?? 'N/A'));
        $sheet->setCellValue('D4', 'Generated: ' . now()->format('d M Y H:i'));
    }

    private function writeHeaders($sheet, int $row, array $headers): void
    {
        $sheet->fromArray($headers, null, 'A' . $row);
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $range = 'A' . $row . ':' . $lastCol . $row;
        $sheet->getStyle($range)->getFont()->setBold(true);
        $sheet->getStyle($range)->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF1E3A5F');
        $sheet->getStyle($range)->getFont()->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle($range)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    }

    private function autoStyleSheet($sheet, int $colCount): void
    {
        foreach (range(1, $colCount) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }
    }

    private function saveReport(GeneratedReport $report, Spreadsheet $spreadsheet): void
    {
        $dir = 'reports/' . now()->format('Y/m');
        $filename = $report->report_type . '_' . ($report->period ?? now()->format('Ymd')) . '_' . now()->format('Ymd_His') . '.xlsx';
        $fullPath = $dir . '/' . $filename;

        $tmpPath = sys_get_temp_dir() . '/' . $filename;
        (new XlsxWriter($spreadsheet))->save($tmpPath);

        Storage::disk('local')->put($fullPath, file_get_contents($tmpPath));
        unlink($tmpPath);

        $report->update(['file_path_xlsx' => $fullPath]);
    }
}
