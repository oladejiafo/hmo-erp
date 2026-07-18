<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Branch\BranchController;
use App\Http\Controllers\Claims\ClaimController;
use App\Http\Controllers\Claims\ClaimDocumentController;
use App\Http\Controllers\Corporate\CorporateController;
use App\Http\Controllers\Corporate\CorporateInvoiceController;
use App\Http\Controllers\Corporate\CorporatePlanController;
use App\Http\Controllers\Enrollee\DependentController;
use App\Http\Controllers\Enrollee\EnrolleeController;
use App\Http\Controllers\Finance\LedgerController;
use App\Http\Controllers\Finance\PaymentBatchController;
use App\Http\Controllers\Finance\RemittanceController;
use App\Http\Controllers\HCP\ContractController;
use App\Http\Controllers\HCP\HcpBankDetailController;
use App\Http\Controllers\HCP\HCPController;
use App\Http\Controllers\HCP\TariffController;
use App\Http\Controllers\Reports\AuditLogController;
use App\Http\Controllers\Reports\DashboardController;
use App\Http\Controllers\Reports\ReportController;
use App\Http\Controllers\Settings\RoleController;
use App\Http\Controllers\Settings\UserController;
use App\Http\Controllers\PreAuthController;
use App\Http\Controllers\Finance\CapitationController;
use App\Http\Controllers\Finance\FFSProvidersController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Compliance\ComplianceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Reports\SLAController;
use App\Http\Controllers\Portal\EnrolleePortalController;
use App\Http\Controllers\Portal\ProviderPortalController; //added
use App\Http\Controllers\AI\AIController;
use App\Http\Controllers\AI\NexumAiController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\Finance\HCPPaymentSummaryController;
use App\Http\Controllers\Claims\ClaimImportController;
use App\Http\Controllers\HelpArticleController;
use App\Http\Controllers\Settings\SystemSettingController;
use App\Http\Controllers\Settings\LicenseController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Finance\ReimbursementController;
/*
|--------------------------------------------------------------------------
| HMO ERP API Routes
|--------------------------------------------------------------------------
| Prefix: /api/v1
| Auth: Laravel Sanctum (token-based)
| Branch isolation is enforced via BranchIsolation middleware (global)
| Permissions enforced via permission:slug middleware on each route
| License middleware applied to all write operations
|--------------------------------------------------------------------------
*/

// ── Public Routes (no auth required) ─────────────────────────────────────
Route::get('settings/system/public', [SystemSettingController::class, 'public']);

Route::prefix('auth')->middleware('throttle:5,1')->group(function () {
// Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
});
Route::middleware('auth:sanctum')->post('auth/set-initial-password', [AuthController::class, 'setInitialPassword']);

// Super-admin only management (GET is read, PUT/POST are writes)
Route::prefix('settings/system')
    ->middleware(['auth:sanctum'])
    ->group(function () {
        Route::get('/', [SystemSettingController::class, 'index']); // READ - no license
        Route::put('/', [SystemSettingController::class, 'updateMany']); // WRITE
        Route::put('/{key}', [SystemSettingController::class, 'update']) // WRITE
            ->where('key', '.+');
        Route::post('/reset/{key}', [SystemSettingController::class, 'reset']) // WRITE
            ->where('key', '.+');
    });

// ── Authenticated (NO branch isolation) ──────────────────────────────────
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::get('me', [AuthController::class, 'me']); // READ
    Route::post('logout', [AuthController::class, 'logout']); // READ (special case - always allowed)
    Route::post('logout-all', [AuthController::class, 'logoutAll']); // READ (special case)
    Route::post('change-password', [AuthController::class, 'changePassword']); // WRITE
    Route::post('2fa/setup', [AuthController::class, 'setup2FA']); // WRITE
    Route::post('2fa/confirm', [AuthController::class, 'confirm2FA']); // WRITE
    Route::post('2fa/disable', [AuthController::class, 'disable2FA']); // WRITE
    
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get   ('profile',          [ProfileController::class, 'show']);
    Route::patch ('profile',          [ProfileController::class, 'update']);
    Route::post  ('profile/password', [ProfileController::class, 'changePassword']);
});
// ── License Status (special case - always accessible) ────────────────────
Route::prefix('settings/license')
    ->middleware('auth:sanctum', 'license')
    ->group(function () {
        Route::get('/', [LicenseController::class, 'status']); // READ
        Route::post('/emergency', [LicenseController::class, 'applyEmergency']); // WRITE (super_admin only)
        Route::post('/check-in', [LicenseController::class, 'forceCheckin']); // WRITE (super_admin only)
    });


// ─────────────────────────────────────────────────────────────────────────
// READ-ONLY ROUTES (GET only, no license check, with branch isolation)
// ─────────────────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'branch.isolation'])->group(function () {

    // ── Branches - READ only ─────────────────────────────────────────────
    Route::middleware('permission:branches.view')
        ->prefix('branches')
        ->group(function () {
            Route::get('/', [BranchController::class, 'index']);
            Route::get('{branch}', [BranchController::class, 'show']);
        });

    // ── Users - READ only ────────────────────────────────────────────────
    Route::middleware('permission:users.view')
        ->prefix('users')
        ->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::get('{user}', [UserController::class, 'show']);
        });

    // ── Roles & Permissions - READ only ──────────────────────────────────
    Route::middleware('permission:roles.view')
        ->prefix('roles')
        ->group(function () {
            Route::get('/', [RoleController::class, 'index']);
            Route::get('{role}', [RoleController::class, 'show']);
        });
    Route::middleware('permission:roles.view')
        ->get('permissions', [RoleController::class, 'allPermissions']);

    // ── Corporates - READ only ───────────────────────────────────────────
    Route::middleware('permission:corporates.view')
        ->prefix('corporates')
        ->group(function () {
            Route::get('/', [CorporateController::class, 'index']);
            Route::get('{corporate}', [CorporateController::class, 'show']);

            // Corporate Plans - READ only
            Route::get('{corporate}/plans', [CorporatePlanController::class, 'index'])
                ->middleware('permission:corporates.view');
            Route::get('{corporate}/plans/{plan}', [CorporatePlanController::class, 'show'])
                ->middleware('permission:corporates.view');

            // Corporate Invoices - READ only
            Route::get('{corporate}/invoices', [CorporateInvoiceController::class, 'index'])
                ->middleware('permission:corporates.invoices');
        });

    // ── Cross-Corporate Plans - READ only ────────────────────────────────
    Route::get('plans', [CorporatePlanController::class, 'allPlans'])
        ->middleware('permission:plans.view');

    // ── Enrollees - READ only ────────────────────────────────────────────
    Route::middleware('permission:enrollees.view')
        ->prefix('enrollees')
        ->group(function () {
            Route::get('/', [EnrolleeController::class, 'index']);
            Route::get('{enrollee}', [EnrolleeController::class, 'show']);
            Route::get('{enrollee}/claims', [EnrolleeController::class, 'claimsHistory']);
            Route::get('{enrollee}/card', [EnrolleeController::class, 'card']);
            Route::get('{enrollee}/benefit-summary', [EnrolleeController::class, 'benefitSummary']);

            // Dependents - READ only
            Route::get('{enrollee}/dependents', [DependentController::class, 'index']);
            Route::get('{enrollee}/dependents/{dependent}', [DependentController::class, 'show']);
        });

    // ── HCPs - READ only ─────────────────────────────────────────────────
    Route::middleware('permission:hcps.view')
        ->prefix('hcps')
        ->group(function () {
            Route::get('/', [HCPController::class, 'index']);
            Route::get('{hcp}', [HCPController::class, 'show']);
            Route::get('{hcp}/performance', [HCPController::class, 'performance']);
            Route::get('{hcp}/payment-history', [HCPController::class, 'paymentHistory']);

            // Tariffs - READ only
            Route::get('{hcp}/tariffs', [TariffController::class, 'index']);

            // Contracts - READ only
            Route::get('{hcp}/contracts', [ContractController::class, 'index'])
                ->middleware('permission:hcps.contracts');
            Route::get('{hcp}/contracts/{contract}', [ContractController::class, 'show'])
                ->middleware('permission:hcps.contracts');

            // Bank Details - READ only
            Route::get('{hcp}/bank-details', [HcpBankDetailController::class, 'index'])
                ->middleware('permission:hcps.bank_details');
        });

    // ── Claims - READ only ───────────────────────────────────────────────
    Route::middleware('permission:claims.view')
        ->prefix('claims')
        ->group(function () {
            Route::get('/', [ClaimController::class, 'index']);
            Route::get('{claim}', [ClaimController::class, 'show']);
            Route::get('{claim}/timeline', [ClaimController::class, 'timeline']);

            // Claim Documents - READ only
            Route::get('{claim}/documents', [ClaimDocumentController::class, 'index']);
            Route::get('{claim}/documents/{document}/download', [ClaimDocumentController::class, 'download']);

            // Fraud Flags - READ only
            Route::get('{claim}/fraud-flags', [ClaimController::class, 'fraudFlags'])
                ->middleware('permission:claims.fraud_view');
        });

    // ── Claims Import - READ only ────────────────────────────────────────
    Route::prefix('claims/import')
        ->middleware('permission:claims.import')
        ->group(function () {
            Route::get('/', [ClaimImportController::class, 'index']);
            Route::get('/{batch}', [ClaimImportController::class, 'show']);
            Route::get('/{batch}/rows', [ClaimImportController::class, 'rows']);
        });
    Route::get('claims/imports', [ClaimImportController::class, 'index'])
        ->middleware('permission:claims.import');

    // ── Finance - READ only ──────────────────────────────────────────────
    Route::middleware('permission:finance.view')
        ->prefix('finance')
        ->group(function () {
            // Payment Batches - READ only
            Route::get('batches', [PaymentBatchController::class, 'index']);
            Route::get('batches/{batch}', [PaymentBatchController::class, 'show']);
            Route::get('batches/{batch}/export', [PaymentBatchController::class, 'exportBankFile'])
                ->middleware('permission:finance.batch_approve');

            // Ledger - READ only
            Route::get('ledger', [LedgerController::class, 'index'])
                ->middleware('permission:finance.ledger_view');
            Route::get('ledger/summary', [LedgerController::class, 'summary'])
                ->middleware('permission:finance.ledger_view');

            // Remittance - READ only
            Route::get('remittance/{payment}/download', [RemittanceController::class, 'download'])
                ->middleware('permission:finance.remittance');

            // Capitation - READ only
            Route::middleware('permission:finance.capitation')
                ->prefix('capitation')
                ->group(function () {
                    Route::get('/rates', [CapitationController::class, 'rateIndex']);
                    Route::get('/', [CapitationController::class, 'index']);
                    Route::get('/summary', [CapitationController::class, 'summary']);
                    Route::get('/{run}', [CapitationController::class, 'show']);
                });

            // In the finance READ group, add:
            Route::middleware('permission:finance.ffs')
                ->prefix('ffs')
                ->group(function () {
                    Route::get('/providers',    [FFSProvidersController::class, 'index']);
                    Route::get('/spend-trend',  [FFSProvidersController::class, 'spendTrend']);
                });

            Route::middleware('permission:reimbursements.view')
                ->prefix('reimbursements')
                ->group(function () {
                    Route::get('/', [ReimbursementController::class, 'index']);
                    Route::get('/{reimbursement}', [ReimbursementController::class, 'show']);
            });

            // HCP Payment Summary - READ only
            Route::get('/hcp-payment-summary', [HCPPaymentSummaryController::class, 'index'])
                ->middleware('permission:finance.view');
            Route::get('/hcp-payment-summary/ffs-vs-capitation', [HCPPaymentSummaryController::class, 'fvsCapitationTrend'])
                ->middleware('permission:finance.view');
        });

    // ── Reports - READ only (all GET) ────────────────────────────────────
    Route::middleware('permission:reports.branch')
        ->prefix('reports')
        ->group(function () {
            Route::get('dashboard', [DashboardController::class, 'index']);
            Route::get('claims-aging', [ReportController::class, 'claimsAging']);
            Route::get('claims-by-hcp', [ReportController::class, 'claimsByHcp']);
            Route::get('claims-by-type', [ReportController::class, 'claimsByType']);
            Route::get('cost-by-corporate', [ReportController::class, 'costByCorporate']);
            Route::get('high-cost-enrollees', [ReportController::class, 'highCostEnrollees']);
            Route::get('hcp-performance', [ReportController::class, 'hcpPerformance']);
            Route::get('branch-comparison', [ReportController::class, 'branchComparison'])
                ->middleware('permission:reports.all_branches');
            Route::get('fraud-heatmap', [ReportController::class, 'fraudHeatmap'])
                ->middleware('permission:reports.fraud_heatmap');
            Route::get('sla-dashboard', [SLAController::class, 'dashboard']);
            Route::get('overdue-claims', [SLAController::class, 'overdueClaims']);
            Route::get('audit-logs', [AuditLogController::class, 'index'])
                ->middleware('permission:reports.audit_logs');
            Route::get('schedules', [ReportController::class, 'schedules']);

            // Generated Reports - READ only
            Route::prefix('generated')->group(function () {
                Route::get('/', [ReportController::class, 'index']);
                Route::get('summary', [ReportController::class, 'summary']);
                Route::get('{report}/download/{format?}', [ReportController::class, 'download']);
            });
        });

    // ── Compliance - READ only ───────────────────────────────────────────
    Route::middleware('permission:compliance.view')
        ->prefix('compliance')
        ->group(function () {
            Route::get('filings', [ComplianceController::class, 'index']);
            Route::get('filings/summary', [ComplianceController::class, 'summary']);
            Route::get('filings/{filing}', [ComplianceController::class, 'show']);
        });

    // ── AI Tools - READ only (GET) ───────────────────────────────────────
    Route::middleware('permission:ai.tools')
        ->prefix('ai')
        ->group(function () {
            // ── Existing (keep as-is) ────────────────────────────────────────
            Route::get('fraud-clusters', [AIController::class, 'fraudClusters']);
    
            // ── New G8.AI features ───────────────────────────────────────────
            Route::get('claims-anomaly/{hcp}',  [NexumAiController::class, 'claimsAnomaly']);
            Route::get('provider-summary/{hcp}',[NexumAiController::class, 'providerSummary']);
            Route::get('dashboard-digest',      [NexumAiController::class, 'dashboardDigest']);
            Route::get('claim-risk/{claim}',    [NexumAiController::class, 'claimRisk']);
            
        });

    // ── Export - READ only ───────────────────────────────────────────────
    Route::middleware('permission:reports.export')
        ->prefix('export')
        ->group(function () {
            Route::get('claims-aging', [ExportController::class, 'claimsAging']);
            Route::get('claims-by-hcp', [ExportController::class, 'claimsByHcp']);
            Route::get('cost-by-corporate', [ExportController::class, 'costByCorporate']);
            Route::get('high-cost-enrollees', [ExportController::class, 'highCostEnrollees']);
            Route::get('branch-comparison', [ExportController::class, 'branchComparison']);
            Route::get('enrollees', [ExportController::class, 'enrollees']);
            Route::get('hcps', [ExportController::class, 'hcps']);
            Route::get('tariffs', [ExportController::class, 'tariffs']);
        });

    // ── Import - READ only (template downloads) ──────────────────────────
    Route::middleware('permission:import.enrollees')
        ->prefix('import')
        ->group(function () {
            Route::get('template/{type}', [ImportController::class, 'downloadTemplate']);
        });

    // ── Portal - READ only ───────────────────────────────────────────────
    Route::prefix('portal')->group(function () {
        // Enrollee Portal - READ only
        Route::prefix('enrollee')->group(function () {
            Route::get('/dashboard', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'dashboard']);
            Route::get('/id-card', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'idCard']);
            Route::get('/id-card/download', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'downloadIdCard']);
            Route::get('/benefits', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'benefits']);
            Route::get('/claims', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'claims']);
            Route::get('/find-hcp', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'findHcp']);
            Route::get('/complaints', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'complaints']);
            Route::get('/reimbursements', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'reimbursements']);
        });

        // Corporate Portal - READ only
        Route::prefix('corporate')->group(function () {
            Route::get('/dashboard', [App\Http\Controllers\Portal\CorporatePortalController::class, 'dashboard']);
            Route::get('/enrollees', [App\Http\Controllers\Portal\CorporatePortalController::class, 'enrollees']);
            Route::get('/claims', [App\Http\Controllers\Portal\CorporatePortalController::class, 'claims']);
            Route::get('/invoices', [App\Http\Controllers\Portal\CorporatePortalController::class, 'invoices']);
            Route::get('/profile', [App\Http\Controllers\Portal\CorporatePortalController::class, 'profile']);
        });

        // Provider Portal - READ only
        Route::prefix('provider')->group(function () {
            Route::get('/dashboard', [App\Http\Controllers\Portal\ProviderPortalController::class, 'dashboard']);
            Route::get('/claims', [App\Http\Controllers\Portal\ProviderPortalController::class, 'claims']);
            Route::get('/claims/{claim}', [App\Http\Controllers\Portal\ProviderPortalController::class, 'claimShow']);
            Route::get('/pre-auths', [App\Http\Controllers\Portal\ProviderPortalController::class, 'preAuths']);
            Route::get('/check-ins', [App\Http\Controllers\Portal\ProviderPortalController::class, 'checkins']);
        });

    });

    // ── Pre-Auth - READ only ─────────────────────────────────────────────
    Route::prefix('pre-auth')->middleware(['branch.scope'])->group(function () {
        Route::get('/', [PreAuthController::class, 'index']);
        Route::get('/stats', [PreAuthController::class, 'stats']);
        Route::get('/{pa}', [PreAuthController::class, 'show']);
        // Route::get('/{pa}/download', [PreAuthController::class, 'downloadLetter']);
    });

    // ── Help Centre - READ only ──────────────────────────────────────────
    Route::prefix('help')->group(function () {
        Route::get('/', [HelpArticleController::class, 'index']);
        Route::get('/for-page', [HelpArticleController::class, 'forPage']);
        Route::get('/admin/list', [HelpArticleController::class, 'adminIndex'])
            ->middleware('permission:help.admin');
        Route::get('/admin/articles/{article}', [HelpArticleController::class, 'adminShow'])
            ->middleware('permission:help.admin');
        Route::get('/{slug}', [HelpArticleController::class, 'show']);
    });

    // ── Notifications - READ only ────────────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
    });
});

// ─────────────────────────────────────────────────────────────────────────
// WRITE OPERATIONS (with license check + branch isolation)
// ─────────────────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'branch.isolation', 'license'])->group(function () {

    // ── Branches - WRITE operations ──────────────────────────────────────
    Route::middleware('permission:branches.create')->post('branches', [BranchController::class, 'store']);
    Route::middleware('permission:branches.edit')->put('branches/{branch}', [BranchController::class, 'update']);
    Route::middleware('permission:branches.delete')->delete('branches/{branch}', [BranchController::class, 'destroy']);
    Route::middleware('permission:branches.edit')->patch('branches/{branch}/status', [BranchController::class, 'toggleStatus']);

    // ── Users - WRITE operations ─────────────────────────────────────────
    Route::middleware('permission:users.create')->post('users', [UserController::class, 'store']);
    Route::middleware('permission:users.edit')->put('users/{user}', [UserController::class, 'update']);
    Route::middleware('permission:users.delete')->delete('users/{user}', [UserController::class, 'destroy']);
    Route::middleware('permission:users.suspend')->patch('users/{user}/status', [UserController::class, 'toggleStatus']);
    Route::middleware('permission:users.assign_roles')->post('users/{user}/roles', [UserController::class, 'syncRoles']);

    // ── Roles - WRITE operations ─────────────────────────────────────────
    Route::middleware('permission:roles.manage')->put('roles/{role}/permissions', [RoleController::class, 'syncPermissions']);

    // ── Corporates - WRITE operations ────────────────────────────────────
    Route::middleware('permission:corporates.create')->post('corporates', [CorporateController::class, 'store']);
    Route::middleware('permission:corporates.edit')->put('corporates/{corporate}', [CorporateController::class, 'update']);
    Route::middleware('permission:corporates.delete')->delete('corporates/{corporate}', [CorporateController::class, 'destroy']);
    Route::middleware('permission:corporates.suspend')->patch('corporates/{corporate}/suspend', [CorporateController::class, 'suspend']);
    Route::middleware('permission:enrollees.create')->post('corporates/{corporate}/bulk-upload-enrollees', [CorporateController::class, 'bulkUpload']);

    // ── Corporate Plans - WRITE operations ───────────────────────────────
    Route::prefix('corporates/{corporate}/plans')->group(function () {
        Route::middleware('permission:plans.create')->post('/', [CorporatePlanController::class, 'store']);
        Route::middleware('permission:plans.edit')->put('{plan}', [CorporatePlanController::class, 'update']);
        Route::middleware('permission:plans.edit')->patch('{plan}/discontinue', [CorporatePlanController::class, 'discontinue']);
        Route::middleware('permission:plans.create')->post('{plan}/duplicate', [CorporatePlanController::class, 'duplicate']);
        Route::middleware('permission:plans.edit')->put('{plan}/benefit-items', [CorporatePlanController::class, 'syncBenefitItems']);
    });

    // ── Corporate Invoices - WRITE operations ────────────────────────────
    Route::middleware('permission:corporates.invoices')->post('corporates/{corporate}/invoices', [CorporateInvoiceController::class, 'store']);
    Route::middleware('permission:corporates.invoices')->patch('corporates/{corporate}/invoices/{invoice}/mark-paid', [CorporateInvoiceController::class, 'markPaid']);

    // ── Enrollees - WRITE operations ─────────────────────────────────────
    Route::middleware('permission:enrollees.create')->post('enrollees', [EnrolleeController::class, 'store']);
    Route::middleware('permission:enrollees.edit')->put('enrollees/{enrollee}', [EnrolleeController::class, 'update']);
    Route::middleware('permission:enrollees.suspend')->patch('enrollees/{enrollee}/suspend', [EnrolleeController::class, 'suspend']);
    Route::middleware('permission:enrollees.transfer')->post('enrollees/{enrollee}/transfer', [EnrolleeController::class, 'transfer']);
    Route::middleware('permission:enrollees.edit')->post('enrollees/{enrollee}/regenerate-card', [EnrolleeController::class, 'regenerateCard']);

    // Dependents - WRITE operations
    Route::middleware('permission:enrollees.edit')->post('enrollees/{enrollee}/dependents', [DependentController::class, 'store']);
    Route::middleware('permission:enrollees.edit')->put('enrollees/{enrollee}/dependents/{dependent}', [DependentController::class, 'update']);
    Route::middleware('permission:enrollees.edit')->delete('enrollees/{enrollee}/dependents/{dependent}', [DependentController::class, 'destroy']);

    // ── HCPs - WRITE operations ──────────────────────────────────────────
    Route::middleware('permission:hcps.create')->post('hcps', [HCPController::class, 'store']);
    Route::middleware('permission:hcps.edit')->put('hcps/{hcp}', [HCPController::class, 'update']);
    Route::middleware('permission:hcps.accredit')->patch('hcps/{hcp}/accredit', [HCPController::class, 'accredit']);
    Route::middleware('permission:hcps.blacklist')->patch('hcps/{hcp}/blacklist', [HCPController::class, 'blacklist']);


    Route::middleware('permission:hcps.blacklist')->patch('hcps/{hcp}/unblacklist', [HCPController::class, 'unblacklist']);
    Route::middleware('permission:hcps.accredit') ->patch('hcps/{hcp}/approve',     [HCPController::class, 'approve']);
    Route::middleware('permission:hcps.suspend')  ->patch('hcps/{hcp}/suspend',     [HCPController::class, 'suspend']);
    Route::middleware('permission:hcps.suspend')  ->patch('hcps/{hcp}/reactivate',  [HCPController::class, 'reactivate']);
    
    // Tariffs - WRITE operations
    Route::middleware('permission:hcps.tariffs')->post('hcps/{hcp}/tariffs', [TariffController::class, 'store']);
    Route::middleware('permission:hcps.tariffs')->post('hcps/{hcp}/tariffs/bulk', [TariffController::class, 'bulkUpload']);
    Route::middleware('permission:hcps.tariffs')->put('hcps/{hcp}/tariffs/{tariff}', [TariffController::class, 'update']);
    Route::middleware('permission:hcps.tariffs')->delete('hcps/{hcp}/tariffs/{tariff}', [TariffController::class, 'destroy']);

    // Contracts - WRITE operations
    Route::middleware('permission:hcps.contracts')->post('hcps/{hcp}/contracts', [ContractController::class, 'store']);

    // Bank Details - WRITE operations
    Route::middleware('permission:hcps.bank_details')->post('hcps/{hcp}/bank-details', [HcpBankDetailController::class, 'store']);
    Route::patch('{hcp}/bank-details/{bankDetail}', [HcpBankDetailController::class, 'update'])
    ->middleware('permission:hcps.bank_details.edit');
    // Route::middleware('permission:hcps.bank_details')->patch('hcps/{hcp}/bank-details/{bankDetail}/verify', [HcpBankDetailController::class, 'verify']);
    Route::middleware('permission:hcps.bank_details_verify')->patch('{hcp}/bank-details/{bankDetail}/verify', [HcpBankDetailController::class, 'verify']);  

    Route::middleware('permission:hcps.bank_details')->delete('hcps/{hcp}/bank-details/{bankDetail}', [HcpBankDetailController::class, 'destroy']);

    // ── Claims - WRITE operations ────────────────────────────────────────
    Route::middleware('permission:claims.submit')->post('claims', [ClaimController::class, 'store']);
    Route::middleware('permission:claims.process')->post('claims/{claim}/process', [ClaimController::class, 'process']);
    Route::middleware('permission:claims.approve')->post('claims/{claim}/approve', [ClaimController::class, 'approve']);
    Route::middleware('permission:claims.reject')->post('claims/{claim}/reject', [ClaimController::class, 'reject']);
    Route::middleware('permission:claims.assign')->post('claims/{claim}/assign', [ClaimController::class, 'assign']);
    Route::middleware('permission:claims.reverse')->post('claims/{claim}/reverse', [ClaimController::class, 'reverse']);

    // Claim Documents - WRITE operations
    Route::middleware('permission:claims.submit')->post('claims/{claim}/documents', [ClaimDocumentController::class, 'store']);

    // Fraud Flags - WRITE operations
    Route::middleware('permission:claims.fraud_review')->patch('claims/{claim}/fraud-flags/{flag}/review', [ClaimController::class, 'reviewFraudFlag']);

    // ── Claims Import - WRITE operations ─────────────────────────────────
    Route::prefix('claims/import')
        ->middleware('permission:claims.import')
        ->group(function () {
            Route::post('/upload', [ClaimImportController::class, 'upload']);
            Route::post('/{batch}/map', [ClaimImportController::class, 'confirmMapping']);
            Route::patch('/{batch}/rows/{row}', [ClaimImportController::class, 'updateRow']);
            Route::post('/{batch}/bulk-approve-valid', [ClaimImportController::class, 'bulkApproveValid']);
            Route::post('/{batch}/push', [ClaimImportController::class, 'push']);
        });

    // ── Finance - WRITE operations ───────────────────────────────────────
    Route::middleware('permission:finance.view')->prefix('finance')->group(function () {
        // Payment Batches - WRITE
        Route::middleware('permission:finance.batch_create')->post('batches', [PaymentBatchController::class, 'store']);
        Route::middleware('permission:finance.batch_create')->post('batches/{batch}/submit', [PaymentBatchController::class, 'submit']);
        Route::middleware('permission:finance.batch_approve')->post('batches/{batch}/approve', [PaymentBatchController::class, 'approve']);

        // Remittance - WRITE
        Route::middleware('permission:finance.remittance')->post('remittance/{payment}', [RemittanceController::class, 'generate']);

        // Reimbursements - WRITE
        Route::middleware('permission:reimbursements.review')
            ->prefix('reimbursements')
            ->group(function () {
                Route::post('/{reimbursement}/approve', [ReimbursementController::class, 'approve']);
                Route::post('/{reimbursement}/reject', [ReimbursementController::class, 'reject']);
                Route::post('/{reimbursement}/mark-paid', [ReimbursementController::class, 'markPaid']);
            });

        // Capitation - WRITE
        Route::middleware('permission:finance.capitation')
            ->prefix('capitation')
            ->group(function () {
                Route::post('/rates', [CapitationController::class, 'rateStore']);
                Route::post('/generate', [CapitationController::class, 'generate']);
                Route::post('/{run}/approve', [CapitationController::class, 'approve']);
                Route::patch('/{run}/records/{record}', [CapitationController::class, 'adjustRecord']);
            });

        // FFS - WRITE                                        ← ADD THIS BLOCK
        Route::middleware('permission:finance.ffs')
            ->prefix('ffs')
            ->group(function () {
                Route::post('/batch', [FFSProvidersController::class, 'createBatch']);
            });
    });

    // ── Reports - WRITE operations ───────────────────────────────────────
    Route::middleware('permission:reports.branch')
        ->prefix('reports')
        ->group(function () {
            Route::post('sla/breach-scan', [SLAController::class, 'scanBreaches']);

            // Generated Reports - WRITE
            Route::prefix('generated')->group(function () {
                Route::post('generate', [ReportController::class, 'generate']);
                Route::put('schedules/{type}', [ReportController::class, 'updateSchedule']);
            });

            // Export - WRITE
            Route::middleware('permission:reports.export')->post('export', [ReportController::class, 'export']);
        });

    // ── Compliance - WRITE operations ────────────────────────────────────
    Route::middleware('permission:compliance.view')
        ->prefix('compliance')
        ->group(function () {
            Route::middleware('permission:compliance.manage')->post('filings', [ComplianceController::class, 'store']);
            Route::middleware('permission:compliance.manage')->put('filings/{filing}', [ComplianceController::class, 'update']);
            Route::middleware('permission:compliance.manage')->post('filings/{filing}/complete', [ComplianceController::class, 'complete']);
            Route::middleware('permission:compliance.manage')->post('filings/{filing}/documents', [ComplianceController::class, 'uploadDocument']);
            Route::middleware('permission:compliance.manage')->delete('filings/{filing}/documents/{doc}', [ComplianceController::class, 'deleteDocument']);
        });

    
    // ── AI Tools - WRITE operations ──────────────────────────────────────
    Route::middleware('permission:ai.tools')
        ->prefix('ai')
        ->group(function () {

            // ── Existing (keep as-is) ────────────────────────────────────────
            Route::post('classify-document', [AIController::class, 'classifyDocument']);
            Route::post('smart-route',       [AIController::class, 'smartRoute']);
            Route::post('ocr-document',      [AIController::class, 'ocrDocument']);
            Route::post('summarize-report',  [AIController::class, 'summarizeReport']);
            Route::post('chat',              [AIController::class, 'chat'])->middleware('throttle:30,1');
    
            // ── New G8.AI features ───────────────────────────────────────────
            Route::post('enrollee-response', [NexumAiController::class, 'enrolleeResponse']);
            
        });

    // ── Import - WRITE operations ────────────────────────────────────────
    Route::middleware('permission:import.enrollees')
        ->prefix('import')
        ->group(function () {
            Route::post('enrollees', [ImportController::class, 'enrollees']);
            Route::post('tariffs', [ImportController::class, 'tariffs']);
            Route::post('hcps', [ImportController::class, 'hcps']);
        });

    // ── Portal - WRITE operations ────────────────────────────────────────
    Route::prefix('portal')->group(function () {
        // Enrollee Portal - WRITE
        Route::prefix('enrollee')->group(function () {
            Route::post('/complaints', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'submitComplaint']);

            Route::post('/claims/{claim}/confirm-utilization', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'confirmUtilization']);
            Route::post('/claims/{claim}/dispute-utilization', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'disputeUtilization']);
            Route::post('/reimbursements', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'submitReimbursement']);
            Route::post('/check-in', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'checkIn']);
        });

        // Corporate Portal - WRITE
        Route::prefix('corporate')->group(function () {
            Route::post('/enrollees', [App\Http\Controllers\Portal\CorporatePortalController::class, 'addEnrollee']);
            Route::delete('/enrollees/{id}', [App\Http\Controllers\Portal\CorporatePortalController::class, 'removeEnrollee']);
            Route::post('/enrollees/bulk', [App\Http\Controllers\Portal\CorporatePortalController::class, 'bulkUploadEnrollees']);
            Route::post('/claims/export', [App\Http\Controllers\Portal\CorporatePortalController::class, 'exportClaims']);
            Route::put('/profile', [App\Http\Controllers\Portal\CorporatePortalController::class, 'updateProfile']);
        });

        // Provider Portal - WRITE
        Route::prefix('provider')->group(function () {
            Route::post('/verify-enrollee', [App\Http\Controllers\Portal\ProviderPortalController::class, 'verifyEnrollee']);
            Route::post('/claims', [App\Http\Controllers\Portal\ProviderPortalController::class, 'storeClaim']);
            Route::post('/pre-auths', [App\Http\Controllers\Portal\ProviderPortalController::class, 'storePreAuth']);
            Route::post('/check-ins/{checkin}/acknowledge', [App\Http\Controllers\Portal\ProviderPortalController::class, 'acknowledgeCheckin']);

        });

    });

    // ── Pre-Auth - WRITE operations ──────────────────────────────────────
    Route::prefix('pre-auth')->middleware(['auth:sanctum','branch.scope'])->group(function () {

        Route::get('/{pa}/download', [PreAuthController::class, 'downloadLetter']);
    
        Route::post('/', [PreAuthController::class, 'store']);
        Route::post('/validate-code', [PreAuthController::class, 'validateCode']);
        Route::post('/{pa}/approve', [PreAuthController::class, 'approve']);
        Route::post('/{pa}/decline', [PreAuthController::class, 'decline']);
        Route::post('/{pa}/revoke', [PreAuthController::class, 'revoke']);
    
    });

    // ── Help Centre - WRITE operations ───────────────────────────────────
    Route::prefix('help')->group(function () {
        Route::middleware('permission:help.admin')->group(function () {
            Route::post('/admin/articles', [HelpArticleController::class, 'store']);
            Route::put('/admin/articles/{article}', [HelpArticleController::class, 'update']);
            Route::delete('/admin/articles/{article}', [HelpArticleController::class, 'destroy']);
        });
        Route::post('/{article}/feedback', [HelpArticleController::class, 'feedback'])
            ->where('article', '[0-9]+');
    });

    // ── Notifications - WRITE operations ─────────────────────────────────
    Route::prefix('notifications')->group(function () {
        Route::patch('/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllRead']);
    });

    // ── Auth - WRITE operations (already covered in no-branch group) ─────
    // These are kept separate since they don't need branch isolation
});

// ── Auth write operations (no branch isolation, but need license) ────────
Route::middleware(['auth:sanctum', 'license'])->prefix('auth')->group(function () {
    Route::post('change-password', [AuthController::class, 'changePassword']);
    Route::post('2fa/setup', [AuthController::class, 'setup2FA']);
    Route::post('2fa/confirm', [AuthController::class, 'confirm2FA']);
    Route::post('2fa/disable', [AuthController::class, 'disable2FA']);
});

// ── System Settings - WRITE operations (super_admin only) ────────────────
Route::prefix('settings/system')
    ->middleware(['auth:sanctum', 'license'])
    ->group(function () {
        Route::put('/', [SystemSettingController::class, 'updateMany']);
        Route::put('/{key}', [SystemSettingController::class, 'update'])->where('key', '.+');
        Route::post('/reset/{key}', [SystemSettingController::class, 'reset'])->where('key', '.+');
    });

// ── License emergency endpoints (super_admin only, need license) ─────────
Route::prefix('settings/license')
    ->middleware(['auth:sanctum', 'license'])
    ->group(function () {
        Route::post('/emergency', [LicenseController::class, 'applyEmergency']);
        Route::post('/check-in', [LicenseController::class, 'forceCheckin']);
    });