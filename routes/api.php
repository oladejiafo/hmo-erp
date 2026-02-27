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
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Compliance\ComplianceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Reports\SLAController;
use App\Http\Controllers\Portal\EnrolleePortalController;

use App\Http\Controllers\AI\AIController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\Finance\HCPPaymentSummaryController;

use App\Http\Controllers\Claims\ClaimImportController;
use App\Http\Controllers\HelpArticleController;

/*
|--------------------------------------------------------------------------
| HMO ERP API Routes
|--------------------------------------------------------------------------
| Prefix: /api/v1
| Auth: Laravel Sanctum (token-based)
| Branch isolation is enforced via BranchIsolation middleware (global)
| Permissions enforced via permission:slug middleware on each route
|--------------------------------------------------------------------------
*/


    // ── Public Routes (no auth required) ─────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });
    Route::middleware('auth:sanctum')->post('auth/set-initial-password', [AuthController::class, 'setInitialPassword']);

    // ── Authenticated (NO branch isolation) ───────────────────
    Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
        Route::post('2fa/setup', [AuthController::class, 'setup2FA']);
        Route::post('2fa/confirm', [AuthController::class, 'confirm2FA']);
        Route::post('2fa/disable', [AuthController::class, 'disable2FA']);
    });

    // ── Authenticated + Branch-Isolated Routes ────────────────────────────────
    Route::middleware(['auth:sanctum', 'branch.isolation'])->group(function () {

        // ── Branches ──────────────────────────────────────────────────────────
        Route::middleware('permission:branches.view')
             ->prefix('branches')
             ->group(function () {
                 Route::get('/', [BranchController::class, 'index']);
                 Route::get('{branch}', [BranchController::class, 'show']);
                 Route::post('/', [BranchController::class, 'store'])
                      ->middleware('permission:branches.create');
                 Route::put('{branch}', [BranchController::class, 'update'])
                      ->middleware('permission:branches.edit');
                 Route::delete('{branch}', [BranchController::class, 'destroy'])
                      ->middleware('permission:branches.delete');
                 Route::patch('{branch}/status', [BranchController::class, 'toggleStatus'])
                      ->middleware('permission:branches.edit');
        });

        // ── Users ─────────────────────────────────────────────────────────────
        Route::middleware('permission:users.view')
             ->prefix('users')
             ->group(function () {
                 Route::get('/', [UserController::class, 'index']);
                 Route::get('{user}', [UserController::class, 'show']);
                 Route::post('/', [UserController::class, 'store'])
                      ->middleware('permission:users.create');
                 Route::put('{user}', [UserController::class, 'update'])
                      ->middleware('permission:users.edit');
                 Route::delete('{user}', [UserController::class, 'destroy'])
                      ->middleware('permission:users.delete');
                 Route::patch('{user}/status', [UserController::class, 'toggleStatus'])
                      ->middleware('permission:users.suspend');
                 Route::post('{user}/roles', [UserController::class, 'syncRoles'])
                      ->middleware('permission:users.assign_roles');
        });

        // ── Roles & Permissions ───────────────────────────────────────────────
        Route::middleware('permission:roles.view')
             ->prefix('roles')
             ->group(function () {
                 Route::get('/', [RoleController::class, 'index']);
                 Route::get('{role}', [RoleController::class, 'show']);
                 Route::put('{role}/permissions', [RoleController::class, 'syncPermissions'])
                      ->middleware('permission:roles.manage');
        });

        Route::middleware('permission:roles.view')
             ->get('permissions', [RoleController::class, 'allPermissions']);

        // ── Corporates ────────────────────────────────────────────────────────
        Route::middleware('permission:corporates.view')
            ->prefix('corporates')
            ->group(function () {
                Route::get('/', [CorporateController::class, 'index']);
                Route::get('{corporate}', [CorporateController::class, 'show']);
                Route::post('/', [CorporateController::class, 'store'])
                    ->middleware('permission:corporates.create');
                Route::put('{corporate}', [CorporateController::class, 'update'])
                    ->middleware('permission:corporates.edit');
                Route::delete('{corporate}', [CorporateController::class, 'destroy'])
                    ->middleware('permission:corporates.delete');
                Route::patch('{corporate}/suspend', [CorporateController::class, 'suspend'])
                    ->middleware('permission:corporates.suspend');
                Route::post('{corporate}/bulk-upload-enrollees', [CorporateController::class, 'bulkUpload'])
                    ->middleware('permission:enrollees.create');

                // ── Corporate Plans (Enhanced) ─────────────────────────────────
                Route::prefix('{corporate}/plans')->group(function () {
                    // List plans for this corporate
                    Route::get('/', [CorporatePlanController::class, 'index'])
                        ->middleware('permission:corporates.view');

                    // Create a new plan
                    Route::post('/', [CorporatePlanController::class, 'store'])
                        ->middleware('permission:plans.create');

                    // Show a single plan (with benefit items)
                    Route::get('{plan}', [CorporatePlanController::class, 'show'])
                        ->middleware('permission:corporates.view');

                    // Update plan header fields
                    Route::put('{plan}', [CorporatePlanController::class, 'update'])
                        ->middleware('permission:plans.edit');

                    // Discontinue a plan (logical delete)
                    Route::patch('{plan}/discontinue', [CorporatePlanController::class, 'discontinue'])
                        ->middleware('permission:plans.edit');

                    // Duplicate a plan (copy with new name)
                    Route::post('{plan}/duplicate', [CorporatePlanController::class, 'duplicate'])
                        ->middleware('permission:plans.create');

                    // Replace all benefit items for this plan
                    Route::put('{plan}/benefit-items', [CorporatePlanController::class, 'syncBenefitItems'])
                        ->middleware('permission:plans.edit');
                });

                // Corporate Invoices
                Route::get('{corporate}/invoices', [CorporateInvoiceController::class, 'index'])
                    ->middleware('permission:corporates.invoices');
                Route::post('{corporate}/invoices', [CorporateInvoiceController::class, 'store'])
                    ->middleware('permission:corporates.invoices');
                Route::patch('{corporate}/invoices/{invoice}/mark-paid', [CorporateInvoiceController::class, 'markPaid'])
                    ->middleware('permission:corporates.invoices');
        });

            // ── Cross-Corporate Plans (HQ only) ────────────────────────────────────
        Route::get('plans', [CorporatePlanController::class, 'allPlans'])
        ->middleware('permission:plans.view');

        // ── Enrollees ─────────────────────────────────────────────────────────
        Route::middleware('permission:enrollees.view')
             ->prefix('enrollees')
             ->group(function () {
                 Route::get('/', [EnrolleeController::class, 'index']);
                 Route::get('{enrollee}', [EnrolleeController::class, 'show']);
                 Route::post('/', [EnrolleeController::class, 'store'])
                      ->middleware('permission:enrollees.create');
                 Route::put('{enrollee}', [EnrolleeController::class, 'update'])
                      ->middleware('permission:enrollees.edit');
                 Route::patch('{enrollee}/suspend', [EnrolleeController::class, 'suspend'])
                      ->middleware('permission:enrollees.suspend');
                 Route::post('{enrollee}/transfer', [EnrolleeController::class, 'transfer'])
                      ->middleware('permission:enrollees.transfer');
                 Route::get('{enrollee}/claims', [EnrolleeController::class, 'claimsHistory']);
                 Route::get('{enrollee}/card', [EnrolleeController::class, 'card']);
                 Route::post('{enrollee}/regenerate-card', [EnrolleeController::class, 'regenerateCard'])
                      ->middleware('permission:enrollees.edit');
                 Route::get('{enrollee}/benefit-summary', [EnrolleeController::class, 'benefitSummary']);

                 // Dependents
                 Route::get('{enrollee}/dependents', [DependentController::class, 'index']);
                 Route::post('{enrollee}/dependents', [DependentController::class, 'store'])
                      ->middleware('permission:enrollees.edit');
                 Route::get('{enrollee}/dependents/{dependent}', [DependentController::class, 'show']);
                 Route::put('{enrollee}/dependents/{dependent}', [DependentController::class, 'update'])
                      ->middleware('permission:enrollees.edit');
                 Route::delete('{enrollee}/dependents/{dependent}', [DependentController::class, 'destroy'])
                      ->middleware('permission:enrollees.edit');
        });

        // ── HCPs ──────────────────────────────────────────────────────────────
        Route::middleware('permission:hcps.view')
             ->prefix('hcps')
             ->group(function () {
                 Route::get('/', [HCPController::class, 'index']);
                 Route::get('{hcp}', [HCPController::class, 'show']);
                 Route::post('/', [HCPController::class, 'store'])
                      ->middleware('permission:hcps.create');
                 Route::put('{hcp}', [HCPController::class, 'update'])
                      ->middleware('permission:hcps.edit');
                 Route::patch('{hcp}/accredit', [HCPController::class, 'accredit'])
                      ->middleware('permission:hcps.accredit');
                 Route::patch('{hcp}/blacklist', [HCPController::class, 'blacklist'])
                      ->middleware('permission:hcps.blacklist');
                 Route::get('{hcp}/performance', [HCPController::class, 'performance']);
                 Route::get('{hcp}/payment-history', [HCPController::class, 'paymentHistory']);

                 // Tariffs
                 Route::get('{hcp}/tariffs', [TariffController::class, 'index']);
                 Route::post('{hcp}/tariffs', [TariffController::class, 'store'])
                      ->middleware('permission:hcps.tariffs');
                 Route::post('{hcp}/tariffs/bulk', [TariffController::class, 'bulkUpload'])
                      ->middleware('permission:hcps.tariffs');
                 Route::put('{hcp}/tariffs/{tariff}', [TariffController::class, 'update'])
                      ->middleware('permission:hcps.tariffs');
                 Route::delete('{hcp}/tariffs/{tariff}', [TariffController::class, 'destroy'])
                      ->middleware('permission:hcps.tariffs');

                 // Contracts
                 Route::get('{hcp}/contracts', [ContractController::class, 'index'])
                      ->middleware('permission:hcps.contracts');
                 Route::post('{hcp}/contracts', [ContractController::class, 'store'])
                      ->middleware('permission:hcps.contracts');
                 Route::get('{hcp}/contracts/{contract}', [ContractController::class, 'show'])
                      ->middleware('permission:hcps.contracts');

                 // Bank Details (used for payment processing)
                 Route::get('{hcp}/bank-details', [HcpBankDetailController::class, 'index'])
                      ->middleware('permission:hcps.bank_details');
                 Route::post('{hcp}/bank-details', [HcpBankDetailController::class, 'store'])
                      ->middleware('permission:hcps.bank_details');
                 Route::patch('{hcp}/bank-details/{bankDetail}/verify', [HcpBankDetailController::class, 'verify'])
                      ->middleware('permission:hcps.bank_details');
                 Route::delete('{hcp}/bank-details/{bankDetail}', [HcpBankDetailController::class, 'destroy'])
                      ->middleware('permission:hcps.bank_details');
        });

        // ── Claims ────────────────────────────────────────────────────────────
        Route::middleware('permission:claims.view')
             ->prefix('claims')
             ->group(function () {
                 Route::get('/', [ClaimController::class, 'index']);
                 Route::get('{claim}', [ClaimController::class, 'show']);
                 Route::post('/', [ClaimController::class, 'store'])
                      ->middleware('permission:claims.submit');
                 Route::post('{claim}/process', [ClaimController::class, 'process'])
                      ->middleware('permission:claims.process');
                 Route::post('{claim}/approve', [ClaimController::class, 'approve'])
                      ->middleware('permission:claims.approve');
                 Route::post('{claim}/reject', [ClaimController::class, 'reject'])
                      ->middleware('permission:claims.reject');
                 Route::post('{claim}/assign', [ClaimController::class, 'assign'])
                      ->middleware('permission:claims.assign');
                 Route::post('{claim}/reverse', [ClaimController::class, 'reverse'])
                      ->middleware('permission:claims.reverse');
                 Route::get('{claim}/timeline', [ClaimController::class, 'timeline']);

                 // Claim Documents
                 Route::get('{claim}/documents', [ClaimDocumentController::class, 'index']);
                 Route::post('{claim}/documents', [ClaimDocumentController::class, 'store'])
                      ->middleware('permission:claims.submit');
                 Route::get('{claim}/documents/{document}/download', [ClaimDocumentController::class, 'download']);

                 // Fraud Flags
                 Route::get('{claim}/fraud-flags', [ClaimController::class, 'fraudFlags'])
                      ->middleware('permission:claims.fraud_view');
                 Route::patch('{claim}/fraud-flags/{flag}/review', [ClaimController::class, 'reviewFraudFlag'])
                      ->middleware('permission:claims.fraud_review');
        });

        // Claims Import
        Route::prefix('claims/import')->middleware('permission:claims.import')->group(function () {
          Route::get('/',                                     [ClaimImportController::class, 'index']);
          Route::post('/upload',                              [ClaimImportController::class, 'upload']);
          Route::post('/{batch}/map',                         [ClaimImportController::class, 'confirmMapping']);
          Route::get('/{batch}/rows',                         [ClaimImportController::class, 'rows']);
          Route::patch('/{batch}/rows/{row}',                 [ClaimImportController::class, 'updateRow']);
          Route::post('/{batch}/bulk-approve-valid',          [ClaimImportController::class, 'bulkApproveValid']);
          Route::post('/{batch}/push',                        [ClaimImportController::class, 'push']);
          Route::get('/{batch}',                              [ClaimImportController::class, 'show']);
       });
       Route::prefix('claims/imports')->middleware('permission:claims.import')->group(function () {
               Route::get('/', [ClaimImportController::class, 'index']);
          });

        // ── Finance ───────────────────────────────────────────────────────────
        Route::middleware('permission:finance.view')
             ->prefix('finance')
             ->group(function () {
                 // Payment Batches
                 Route::get('batches', [PaymentBatchController::class, 'index']);
                 Route::get('batches/{batch}', [PaymentBatchController::class, 'show']);
                 Route::post('batches', [PaymentBatchController::class, 'store'])
                      ->middleware('permission:finance.batch_create');
                 Route::post('batches/{batch}/submit', [PaymentBatchController::class, 'submit'])
                      ->middleware('permission:finance.batch_create');
                 Route::post('batches/{batch}/approve', [PaymentBatchController::class, 'approve'])
                      ->middleware('permission:finance.batch_approve');
                 Route::get('batches/{batch}/export', [PaymentBatchController::class, 'exportBankFile'])
                      ->middleware('permission:finance.batch_approve');

                 // Ledger
                 Route::get('ledger', [LedgerController::class, 'index'])
                      ->middleware('permission:finance.ledger_view');
                 Route::get('ledger/summary', [LedgerController::class, 'summary'])
                      ->middleware('permission:finance.ledger_view');

                 // Remittance
                 Route::post('remittance/{payment}', [RemittanceController::class, 'generate'])
                      ->middleware('permission:finance.remittance');
                 Route::get('remittance/{payment}/download', [RemittanceController::class, 'download'])
                      ->middleware('permission:finance.remittance');


                // Capitation routes require a specific sub-permission
                Route::middleware('permission:finance.capitation')
                ->prefix('capitation')
                ->group(function () {
                    // Rates management
                    Route::get('/rates', [CapitationController::class, 'rateIndex']);
                    Route::post('/rates',[CapitationController::class, 'rateStore']);
                    
                    // Capitation runs
                    Route::get('/', [CapitationController::class, 'index']);           // List runs
                    Route::get('/summary', [CapitationController::class, 'summary']);        // Dashboard summary
                    Route::post('/generate', [CapitationController::class, 'generate']);       // Create new run
                    Route::get('/{run}', [CapitationController::class, 'show']);           // View run details
                    Route::post('/{run}/approve',[CapitationController::class, 'approve']);        // Approve & create batch
                    Route::patch('/{run}/records/{record}',[CapitationController::class, 'adjustRecord']);   // Adjust individual HCP
                });

                // HCP Payment Summary (FFS + Capitation combined view)
                Route::get('/hcp-payment-summary',
                    [HCPPaymentSummaryController::class, 'index'])
                    ->middleware('permission:finance.view');

                Route::get('/hcp-payment-summary/ffs-vs-capitation',
                    [HCPPaymentSummaryController::class, 'fvsCapitationTrend'])
                    ->middleware('permission:finance.view');

        });

        // ── Reports & Analytics ───────────────────────────────────────────────
        Route::middleware('permission:reports.branch')
          ->prefix('reports')
          ->group(function () {
               
               // ── Operational Reports (real-time) ─────────────────────────
               Route::get('dashboard', [DashboardController::class, 'index']);
               Route::get('claims-aging', [ReportController::class, 'claimsAging']);
               Route::get('claims-by-hcp', [ReportController::class, 'claimsByHcp']);
               Route::get('claims-by-type', [ReportController::class, 'claimsByType']);
               Route::get('cost-by-corporate', [ReportController::class, 'costByCorporate']);
               Route::get('high-cost-enrollees', [ReportController::class, 'highCostEnrollees']);
               Route::get('hcp-performance', [ReportController::class, 'hcpPerformance']);
     
               // HQ Only Reports
               Route::get('branch-comparison', [ReportController::class, 'branchComparison'])
                    ->middleware('permission:reports.all_branches');
               Route::get('fraud-heatmap', [ReportController::class, 'fraudHeatmap'])
                    ->middleware('permission:reports.fraud_heatmap');
     
               // ── SLA Monitoring ─────────────────────────────────────────
               Route::get('sla-dashboard',  [SLAController::class, 'dashboard']);
               Route::get('overdue-claims', [SLAController::class, 'overdueClaims']);
               Route::post('sla/breach-scan', [SLAController::class, 'scanBreaches']);
     
               // ── Audit Logs ─────────────────────────────────────────────
               Route::get('audit-logs', [AuditLogController::class, 'index'])
                    ->middleware('permission:reports.audit_logs');
     
               // ── Generated Reports Management ───────────────────────────
               Route::prefix('generated')->group(function () {
                    Route::get('/', [ReportController::class, 'index']);
                    Route::get('summary', [ReportController::class, 'summary']);
                    Route::post('generate', [ReportController::class, 'generate']);
                    Route::get('schedules', [ReportController::class, 'schedules']);
                    Route::put('schedules/{type}', [ReportController::class, 'updateSchedule']);
                    Route::get('{report}/download/{format?}', [ReportController::class, 'download']);
               });
     
               // ── Exports (kept separate) ────────────────────────────────
               Route::post('export', [ReportController::class, 'export'])
                    ->middleware('permission:reports.export');
        });

        // ── Compliance Calendar ───────────────────────────────────────────────
        Route::middleware('permission:compliance.view')
            ->prefix('compliance')
            ->group(function () {
                Route::get('filings',                            [ComplianceController::class, 'index']);
                Route::get('filings/summary',                    [ComplianceController::class, 'summary']);
                Route::get('filings/{filing}',                   [ComplianceController::class, 'show']);
                Route::post('filings',                           [ComplianceController::class, 'store'])
                    ->middleware('permission:compliance.manage');
                Route::put('filings/{filing}',                   [ComplianceController::class, 'update'])
                    ->middleware('permission:compliance.manage');
                Route::post('filings/{filing}/complete',         [ComplianceController::class, 'complete'])
                    ->middleware('permission:compliance.manage');
                Route::post('filings/{filing}/documents',        [ComplianceController::class, 'uploadDocument'])
                    ->middleware('permission:compliance.manage');
                Route::delete('filings/{filing}/documents/{doc}',[ComplianceController::class, 'deleteDocument'])
                    ->middleware('permission:compliance.manage');
        });

        // ── AI Tools (requires new permission: ai.tools) ─────────────────────────
        Route::middleware('permission:ai.tools')
            ->prefix('ai')
            ->group(function () {
                Route::post('classify-document', [AIController::class, 'classifyDocument']);
                Route::post('smart-route', [AIController::class, 'smartRoute']);
                Route::post('ocr-document', [AIController::class, 'ocrDocument']);
                Route::post('summarize-report', [AIController::class, 'summarizeReport']);
                Route::get('fraud-clusters', [AIController::class, 'fraudClusters']);
                Route::post('chat', [AIController::class, 'chat']);
        });

        // ── Import / Export ─────────────────────────────────────────────────────
        Route::middleware('permission:import.enrollees')
            ->prefix('import')
            ->group(function () {
                Route::get('template/{type}', [ImportController::class, 'downloadTemplate']);
                
                Route::post('enrollees', [ImportController::class, 'enrollees']);
                Route::post('tariffs', [ImportController::class, 'tariffs']);
                Route::post('hcps', [ImportController::class, 'hcps']);

        });

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

    });

    Route::prefix('notifications')->middleware('auth:sanctum')->group(function () {
        Route::get('/',              [NotificationController::class, 'index']);
        Route::get('/unread-count',  [NotificationController::class, 'unreadCount']);
        Route::patch('/{notification}/read', [NotificationController::class, 'markRead']);
        Route::post('/mark-all-read',[NotificationController::class, 'markAllRead']);
    });

    
    // Pre-Authorisation
    Route::prefix('pre-auth')->middleware(['auth:sanctum', 'branch.scope'])->group(function () {
        Route::get('/',                  [PreAuthController::class, 'index']);
        Route::post('/',                 [PreAuthController::class, 'store']);
        Route::get('/stats',             [PreAuthController::class, 'stats']);
        Route::post('/validate-code',    [PreAuthController::class, 'validateCode']);
        Route::get('/{pa}',              [PreAuthController::class, 'show']);
        Route::post('/{pa}/approve',     [PreAuthController::class, 'approve']);
        Route::post('/{pa}/decline',     [PreAuthController::class, 'decline']);
        Route::post('/{pa}/revoke',      [PreAuthController::class, 'revoke']);
        Route::get('/{pa}/download',     [PreAuthController::class, 'downloadLetter']);
    });

    // PA TAT Report (under /reports)
    // Route::prefix('reports')->middleware(['auth:sanctum'])->group(function () {
    //     // ...existing report routes...
    //     Route::get('/pa-tat',        [PAReportController::class, 'tatSummary']);
    //     Route::get('/pa-tat/export', [PAReportController::class, 'exportTAT']);
    // });

    // Help Centre routes
     Route::prefix('help')->middleware('auth:sanctum')->group(function () {
          Route::get('/', [HelpArticleController::class, 'index']);
          Route::get('/for-page', [HelpArticleController::class, 'forPage']);
          Route::get('/{slug}', [HelpArticleController::class, 'show']);
          Route::post('/{article}/feedback', [HelpArticleController::class, 'feedback']);
          
          // Admin routes
          Route::middleware('permission:help.admin')->group(function () {
          Route::get('/admin/list', [HelpArticleController::class, 'adminIndex']);
          Route::post('/', [HelpArticleController::class, 'store']);
          Route::put('/{article}', [HelpArticleController::class, 'update']);
          Route::delete('/{article}', [HelpArticleController::class, 'destroy']);
          });
     });

    // ============= PORTAL ROUTES =============
    Route::middleware(['auth:sanctum'])->prefix('portal')->group(function () {
        
        // Enrollee Portal Routes
        Route::prefix('enrollee')->group(function () {
            Route::get('/dashboard', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'dashboard']);
            Route::get('/id-card', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'idCard']);
            Route::get('/id-card/download', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'downloadIdCard']);
            Route::get('/benefits', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'benefits']);
            Route::get('/claims', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'claims']);
            Route::get('/find-hcp', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'findHcp']);
            Route::get('/complaints', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'complaints']);
            Route::post('/complaints', [App\Http\Controllers\Portal\EnrolleePortalController::class, 'submitComplaint']);
        });
        
        // Corporate Portal Routes (add later)
        Route::prefix('corporate')->group(function () {
            Route::get('/dashboard', [App\Http\Controllers\Portal\CorporatePortalController::class, 'dashboard']);
            Route::get('/enrollees', [App\Http\Controllers\Portal\CorporatePortalController::class, 'enrollees']);
            Route::post('/enrollees', [App\Http\Controllers\Portal\CorporatePortalController::class, 'addEnrollee']);
            Route::delete('/enrollees/{id}', [App\Http\Controllers\Portal\CorporatePortalController::class, 'removeEnrollee']);
            Route::post('/enrollees/bulk', [App\Http\Controllers\Portal\CorporatePortalController::class, 'bulkUploadEnrollees']);
            Route::get('/claims', [App\Http\Controllers\Portal\CorporatePortalController::class, 'claims']);
            Route::post('/claims/export', [App\Http\Controllers\Portal\CorporatePortalController::class, 'exportClaims']);
            Route::get('/invoices', [App\Http\Controllers\Portal\CorporatePortalController::class, 'invoices']);
            Route::get('/profile', [App\Http\Controllers\Portal\CorporatePortalController::class, 'profile']);
            Route::put('/profile', [App\Http\Controllers\Portal\CorporatePortalController::class, 'updateProfile']);
        });
        
    });

    