<?php

namespace App\Http\Controllers\Corporate;

use App\Http\Controllers\Controller;
use App\Http\Requests\Corporate\StoreCorporateRequest;
use App\Http\Requests\Corporate\SuspendCorporateRequest;
use App\Http\Requests\Corporate\UpdateCorporateRequest;
use App\Http\Resources\CorporateResource;
use App\Models\Corporate;
use App\Services\BulkEnrolleeImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Mail\CorporateWelcomeMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;


class CorporateController extends Controller
{
    public function __construct(
        protected BulkEnrolleeImportService $importService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $corporates = Corporate::query()
            ->with(['branch:id,name,code'])
            ->withCount(['enrollees', 'activeEnrollees', 'plans'])
            ->when($request->search, function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('code', 'like', "%{$s}%")
                      ->orWhere('rc_number', 'like', "%{$s}%");
                });
            })
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->state, fn ($q, $s) => $q->where('state', $s))
            ->when($request->expiring_within, fn ($q, $d) => $q->expiringWithin((int) $d))
            ->orderBy($request->sort_by ?? 'name', $request->sort_dir ?? 'asc')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => CorporateResource::collection($corporates),
            'meta' => [
                'current_page' => $corporates->currentPage(),
                'last_page'    => $corporates->lastPage(),
                'per_page'     => $corporates->perPage(),
                'total'        => $corporates->total(),
            ],
        ]);
    }

    public function store(StoreCorporateRequest $request): JsonResponse
    {
        $validated = $request->validated();
    
        // Auto-generate corporate code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = Corporate::generateUniqueId('CORP', 'code', 5);
        }
    
        $corporate = DB::transaction(function () use ($validated, $request) {
            // Create corporate
            $corporate = Corporate::create($validated);
    
            // 🔥 AUTO-CREATE USER ACCOUNT for primary contact
            if ($request->has('primary_contact_email') && $request->has('primary_contact_name')) {
                $tempPassword = Str::random(10);
                $user = User::create([
                    'name' => $request->primary_contact_name,
                    'email' => $request->primary_contact_email,
                    'password' => Hash::make($tempPassword),
                    'branch_id' => $corporate->branch_id,
                    'user_type' => 'corporate_user',
                    'corporate_id' => $corporate->id,
                    'status' => 'active',
                    'password_changed_at' => null,
                ]);
    
                // Assign corporate role
                $user->assignRole('corporate_user');
    
                // Grant portal access permission
                $user->givePermissionTo('portal.corporate.access');
    
                // Send welcome email
                try {
                    Mail::to($user->email)->send(new CorporateWelcomeMail($corporate, $user, $tempPassword));
                } catch (\Exception $e) {
                    Log::error('Failed to send corporate welcome email: ' . $e->getMessage());
                }
            }
    
            return $corporate;
        });
    
        return response()->json([
            'message' => 'Corporate created successfully. Login credentials sent to primary contact.',
            'data'    => new CorporateResource($corporate->load('branch', 'contacts', 'plans')),
        ], 201);
    }

    public function storeXX(StoreCorporateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Auto-generate corporate code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = Corporate::generateUniqueId('CORP', 'code', 5);
        }

        $corporate = Corporate::create($validated);

        return response()->json([
            'message' => 'Corporate created successfully.',
            'data'    => new CorporateResource($corporate->load('branch', 'contacts', 'plans')),
        ], 201);
    }

    public function show(Corporate $corporate): JsonResponse
    {
        $corporate->load([
            'branch:id,name,code',
            'contacts',
            'activePlans',
            'invoices' => fn ($q) => $q->latest()->limit(5),
        ])->loadCount(['enrollees', 'activeEnrollees']);

        return response()->json(['data' => new CorporateResource($corporate)]);
    }

    public function update(UpdateCorporateRequest $request, Corporate $corporate): JsonResponse
    {
        $corporate->update($request->validated());

        return response()->json([
            'message' => 'Corporate updated successfully.',
            'data'    => new CorporateResource($corporate->fresh(['branch', 'contacts', 'activePlans'])),
        ]);
    }

    public function destroy(Corporate $corporate): JsonResponse
    {
        if ($corporate->enrollees()->exists()) {
            return response()->json([
                'message' => 'Corporate has enrolled members and cannot be deleted. Suspend it instead.',
            ], 422);
        }

        $corporate->delete();

        return response()->json(['message' => 'Corporate deleted successfully.']);
    }

    public function suspend(SuspendCorporateRequest $request, Corporate $corporate): JsonResponse
    {
        $newStatus = $corporate->status->value === 'active' ? 'suspended' : 'active';

        $corporate->update([
            'status' => $newStatus,
            'notes'  => $newStatus === 'suspended'
                ? "Suspended: {$request->reason}"
                : "Reactivated. Previous note: {$corporate->notes}",
        ]);

        $action = $newStatus === 'suspended' ? 'suspended' : 'reactivated';

        return response()->json([
            'message' => "Corporate {$action} successfully.",
            'data'    => new CorporateResource($corporate->fresh()),
        ]);
    }

    /**
     * Bulk upload enrollees for a corporate via CSV/Excel file.
     * File must match the downloadable template.
     */
    public function bulkUpload(Request $request, Corporate $corporate): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,xlsx,xls', 'max:5120'], // 5MB max
        ]);

        $result = $this->importService->import(
            $request->file('file'),
            $corporate
        );

        return response()->json([
            'message'  => "Bulk upload completed.",
            'summary'  => [
                'total_rows'   => $result['total'],
                'imported'     => $result['imported'],
                'skipped'      => $result['skipped'],
                'errors'       => $result['errors'],
            ],
            'error_details' => $result['error_details'],
        ], $result['imported'] > 0 ? 200 : 422);
    }
}