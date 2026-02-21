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
use Illuminate\Support\Facades\Route;

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

// Route::prefix('v1')->group(function () {

    // ── Public Routes (no auth required) ─────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });

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

        // // ── Auth / Profile ────────────────────────────────────────────────────
        // Route::prefix('auth')->group(function () {
        //     Route::get('me', [AuthController::class, 'me']);
        //     Route::post('logout', [AuthController::class, 'logout']);
        //     Route::post('logout-all', [AuthController::class, 'logoutAll']);
        //     Route::post('change-password', [AuthController::class, 'changePassword']);
        //     Route::post('2fa/setup', [AuthController::class, 'setup2FA']);
        //     Route::post('2fa/confirm', [AuthController::class, 'confirm2FA']);
        //     Route::post('2fa/disable', [AuthController::class, 'disable2FA']);
        // });

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

                 // Corporate Plans
                 Route::get('{corporate}/plans', [CorporatePlanController::class, 'index']);
                 Route::post('{corporate}/plans', [CorporatePlanController::class, 'store'])
                      ->middleware('permission:corporates.edit');
                 Route::put('{corporate}/plans/{plan}', [CorporatePlanController::class, 'update'])
                      ->middleware('permission:corporates.edit');

                 // Corporate Invoices
                 Route::get('{corporate}/invoices', [CorporateInvoiceController::class, 'index'])
                      ->middleware('permission:corporates.invoices');
                 Route::post('{corporate}/invoices', [CorporateInvoiceController::class, 'store'])
                      ->middleware('permission:corporates.invoices');
                 Route::patch('{corporate}/invoices/{invoice}/mark-paid', [CorporateInvoiceController::class, 'markPaid'])
                      ->middleware('permission:corporates.invoices');
             });

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
             });

        // ── Reports & Analytics ───────────────────────────────────────────────
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

                 // HQ Only
                 Route::get('branch-comparison', [ReportController::class, 'branchComparison'])
                      ->middleware('permission:reports.all_branches');
                 Route::get('fraud-heatmap', [ReportController::class, 'fraudHeatmap'])
                      ->middleware('permission:reports.fraud_heatmap');

                 // Audit Logs
                 Route::get('audit-logs', [AuditLogController::class, 'index'])
                      ->middleware('permission:reports.audit_logs');

                 // Exports
                 Route::post('export', [ReportController::class, 'export'])
                      ->middleware('permission:reports.export');
             });
    });
// });