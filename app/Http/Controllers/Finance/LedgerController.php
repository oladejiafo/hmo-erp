<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\LedgerEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LedgerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $entries = LedgerEntry::with(['createdBy:id,name'])
            ->when($request->entry_type, fn ($q, $t) => $q->where('entry_type', $t))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->when($request->date_from, fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->where('created_at', '<=', $d . ' 23:59:59'))
            ->orderByDesc('created_at')
            ->paginate($request->per_page ?? 30);

        return response()->json(['data' => $entries]);
    }

    public function summary(Request $request): JsonResponse
    {
         /** @disregard P1013 */
        $branchId = auth()->user()->isHQ() && $request->branch_id
            ? $request->branch_id
            : auth()->user()->branch_id;

        $summary = DB::table('ledger_entries')
            ->where('branch_id', $branchId)
            ->when($request->year, fn ($q, $y) => $q->whereYear('created_at', $y))
            ->selectRaw('
                entry_type,
                category,
                SUM(amount) as total,
                COUNT(*) as count
            ')
            ->groupBy('entry_type', 'category')
            ->get();

        $totalDebits  = $summary->where('entry_type', 'debit')->sum('total');
        $totalCredits = $summary->where('entry_type', 'credit')->sum('total');

        return response()->json([
            'data' => [
                'breakdown'     => $summary,
                'total_debits'  => $totalDebits,
                'total_credits' => $totalCredits,
                'net_position'  => $totalCredits - $totalDebits,
            ],
        ]);
    }
}
