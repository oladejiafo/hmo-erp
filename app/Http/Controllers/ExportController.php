<?php

namespace App\Http\Controllers;

use App\Models\Claim;
use App\Models\Enrollee;
use App\Models\HCP;
use App\Models\Tariff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Auth;

class ExportController extends Controller
{
    
    public function claimsAging(): StreamedResponse
    {
        $data = Claim::selectRaw('
            CASE 
                WHEN DATEDIFF(NOW(), created_at) <= 7 THEN "0-7 days"
                WHEN DATEDIFF(NOW(), created_at) <= 14 THEN "8-14 days"
                WHEN DATEDIFF(NOW(), created_at) <= 30 THEN "15-30 days"
                ELSE "30+ days"
            END as aging_bucket,
            COUNT(*) as claim_count,
            SUM(total_amount_claimed) as total_claimed,
            SUM(total_amount_approved) as total_approved
        ')
        ->whereIn('status', ['submitted', 'auto_validated', 'under_review'])
        ->groupBy('aging_bucket')
        ->orderBy('aging_bucket')
        ->get();

        return $this->streamCsv('claims-aging.csv', [
            'Aging Bucket', 'Claim Count', 'Total Claimed', 'Total Approved'
        ], $data);
    }

    public function claimsByHcp(): StreamedResponse
    {
        $data = Claim::selectRaw('
            hcps.name as hcp_name,
            COUNT(*) as claim_count,
            SUM(total_amount_claimed) as total_claimed,
            SUM(total_amount_approved) as total_approved,
            AVG(risk_score) as avg_risk_score
        ')
        ->join('hcps', 'claims.hcp_id', '=', 'hcps.id')
        ->groupBy('hcps.id', 'hcps.name')
        ->orderByDesc('total_claimed')
        ->get();

        return $this->streamCsv('claims-by-hcp.csv', [
            'HCP Name', 'Claim Count', 'Total Claimed', 'Total Approved', 'Avg Risk Score'
        ], $data);
    }

    public function costByCorporate(): StreamedResponse
    {
        $data = Claim::selectRaw('
            corporates.name as corporate_name,
            COUNT(*) as claim_count,
            SUM(total_amount_claimed) as total_claimed,
            SUM(total_amount_paid) as total_paid,
            COUNT(DISTINCT enrollee_id) as unique_enrollees
        ')
        ->join('enrollees', 'claims.enrollee_id', '=', 'enrollees.id')
        ->join('corporates', 'enrollees.corporate_id', '=', 'corporates.id')
        ->groupBy('corporates.id', 'corporates.name')
        ->orderByDesc('total_claimed')
        ->get();

        return $this->streamCsv('cost-by-corporate.csv', [
            'Corporate', 'Claims', 'Unique Enrollees', 'Total Claimed', 'Total Paid'
        ], $data);
    }

    public function highCostEnrollees(): StreamedResponse
    {
        $data = Claim::selectRaw('
            CONCAT(enrollees.first_name, " ", enrollees.last_name) as enrollee_name,
            enrollees.enrollee_id,
            corporates.name as corporate_name,
            COUNT(*) as claim_count,
            SUM(total_amount_claimed) as total_claimed,
            AVG(risk_score) as avg_risk_score
        ')
        ->join('enrollees', 'claims.enrollee_id', '=', 'enrollees.id')
        ->join('corporates', 'enrollees.corporate_id', '=', 'corporates.id')
        ->groupBy('enrollees.id', 'enrollees.first_name', 'enrollees.last_name', 'enrollees.enrollee_id', 'corporates.name')
        ->havingRaw('SUM(total_amount_claimed) > 1000000') // 1M threshold
        ->orderByDesc('total_claimed')
        ->get();

        return $this->streamCsv('high-cost-enrollees.csv', [
            'Enrollee', 'Enrollee ID', 'Corporate', 'Claim Count', 'Total Claimed', 'Avg Risk Score'
        ], $data);
    }

    public function branchComparison(): StreamedResponse
    {
        $data = Claim::selectRaw('
            branches.name as branch_name,
            branches.code,
            COUNT(DISTINCT claims.id) as claim_count,
            COUNT(DISTINCT enrollees.id) as enrollee_count,
            COUNT(DISTINCT corporates.id) as corporate_count,
            SUM(total_amount_claimed) as total_claimed,
            SUM(total_amount_paid) as total_paid
        ')
        ->join('enrollees', 'claims.enrollee_id', '=', 'enrollees.id')
        ->join('branches', 'enrollees.branch_id', '=', 'branches.id')
        ->leftJoin('corporates', 'enrollees.corporate_id', '=', 'corporates.id')
        ->groupBy('branches.id', 'branches.name', 'branches.code')
        ->get();

        return $this->streamCsv('branch-comparison.csv', [
            'Branch', 'Code', 'Corporates', 'Enrollees', 'Claims', 'Total Claimed', 'Total Paid'
        ], $data);
    }

    public function enrollees(): StreamedResponse
    {
        $data = Enrollee::with(['corporate', 'branch', 'plan'])
            ->where('branch_id', Auth::user()->branch_id)
            ->get()
            ->map(fn($e) => [
                'Enrollee ID' => $e->enrollee_id,
                'Name' => $e->full_name,
                'Email' => $e->email,
                'Phone' => $e->phone,
                'Corporate' => $e->corporate->name ?? '',
                'Plan' => $e->plan->plan_name ?? '',
                'Status' => $e->status,
                'Expiry Date' => $e->expiry_date?->format('Y-m-d'),
            ]);

        return $this->streamCsv('enrollees.csv', [
            'Enrollee ID', 'Name', 'Email', 'Phone', 'Corporate', 'Plan', 'Status', 'Expiry Date'
        ], $data);
    }

    public function hcps(): StreamedResponse
    {
        $data = HCP::where('branch_id', Auth::user()->branch_id)
            ->get()
            ->map(fn($h) => [
                'Name' => $h->name,
                'Code' => $h->code,
                'Type' => $h->type,
                'Tier' => $h->tier,
                'State' => $h->state,
                'City' => $h->city,
                'Phone' => $h->phone,
                'Email' => $h->email,
                'Status' => $h->status,
            ]);

        return $this->streamCsv('hcps.csv', [
            'Name', 'Code', 'Type', 'Tier', 'State', 'City', 'Phone', 'Email', 'Status'
        ], $data);
    }

    public function tariffs(): StreamedResponse
    {
        $data = Tariff::with('hcp')
            ->whereHas('hcp', fn($q) => $q->where('branch_id', Auth::user()->branch_id))
            ->get()
            ->map(fn($t) => [
                'HCP' => $t->hcp->name,
                'Service Code' => $t->service_code,
                'Service Name' => $t->service_name,
                'Price' => $t->price,
                'Effective From' => $t->effective_from?->format('Y-m-d'),
                'Effective To' => $t->effective_to?->format('Y-m-d'),
            ]);

        return $this->streamCsv('tariffs.csv', [
            'HCP', 'Service Code', 'Service Name', 'Price', 'Effective From', 'Effective To'
        ], $data);
    }

    protected function streamCsv(string $filename, array $headers, $data): StreamedResponse
    {
        $callback = function() use ($headers, $data) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            
            foreach ($data as $row) {
                if (is_array($row)) {
                    fputcsv($file, $row);
                } else {
                    fputcsv($file, (array) $row);
                }
            }
            
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename={$filename}",
        ]);
    }
}