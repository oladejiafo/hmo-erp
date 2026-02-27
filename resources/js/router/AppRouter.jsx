/**
 * FILE LOCATION: resources/js/router/AppRouter.jsx
 *
 * ARCHITECTURE — THREE SEPARATE ROUTE TREES:
 *
 *   1. Public         /login, /set-password         → AuthLayout
 *   2. HMO Staff      /  /enrollees /corporates ...  → ProtectedRoute > AppLayout (sidebar)
 *   3. Corporate Portal /corporate/*                 → ProtectedRoute > CorporateLayout
 *   4. Enrollee Portal  /enrollee/*                  → ProtectedRoute > EnrolleeLayout
 *
 * CRITICAL BUG FIXED (previous version):
 *   Portal routes were nested INSIDE the AppLayout route block, which caused
 *   AppLayout (the HMO sidebar shell) to wrap corporate/enrollee portal pages.
 *   They are now in separate top-level Route trees.
 *
 * REDIRECT BUG FIXED (previous version):
 *   useEffect used path.startsWith('/enrollee') which also matched /enrollees.
 *   path.startsWith('/corporate') also matched /corporates.
 *   Now uses isPortalPath() which checks for exact prefix or prefix + '/'.
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Layouts ────────────────────────────────────────────────────────────────
import AppLayout       from '../layouts/AppLayout';
import AuthLayout      from '../layouts/AuthLayout';
import CorporateLayout from '../layouts/portals/CorporateLayout';
import EnrolleeLayout  from '../layouts/portals/EnrolleeLayout';

// ── Auth pages ─────────────────────────────────────────────────────────────
import LoginPage               from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPassword';
import SetInitialPasswordPage  from '../pages/auth/SetInitialPasswordPage';

// ── HMO Staff pages ────────────────────────────────────────────────────────
import DashboardPage       from '../pages/dashboard/DashboardPage';

import CorporateListPage   from '../pages/corporates/CorporateListPage';
import CorporateDetailPage from '../pages/corporates/CorporateDetailPage';
import CorporateFormPage   from '../pages/corporates/CorporateFormPage';

import AllPlansPage   from '../pages/plans/AllPlansPage';
import PlanListPage   from '../pages/plans/PlanListPage';
import PlanDetailPage from '../pages/plans/PlanDetailPage';
import PlanFormPage   from '../pages/plans/PlanFormPage';

import EnrolleeListPage    from '../pages/enrollees/EnrolleeListPage';
import EnrolleeDetailPage  from '../pages/enrollees/EnrolleeDetailPage';
import EnrolleeFormPage    from '../pages/enrollees/EnrolleeFormPage';
import DependentFormPage   from '../pages/enrollees/DependentFormPage';
import DependentDetailPage from '../pages/enrollees/DependentDetailPage';

import HCPListPage         from '../pages/hcps/HCPListPage';
import HCPDetailPage       from '../pages/hcps/HCPDetailPage';
import HCPFormPage         from '../pages/hcps/HCPFormPage';

import ClaimListPage       from '../pages/claims/ClaimListPage';
import ClaimDetailPage     from '../pages/claims/ClaimDetailPage';
import ClaimFormPage       from '../pages/claims/ClaimFormPage';

import PAListPage          from '../pages/preauth/PAListPage';
import PAFormPage          from '../pages/preauth/PAFormPage';
import PADetailPage        from '../pages/preauth/PADetailPage';
import PATATReportPage     from '../pages/preauth/PATATReportPage';

// Add these two lines with your other Finance imports
import CapitationListPage  from '../pages/finance/CapitationListPage';
import CapitationDetailPage from '../pages/finance/CapitationDetailPage';

import FinancePage         from '../pages/finance/FinancePage';
import PaymentBatchDetail  from '../pages/finance/PaymentBatchDetail';
import FFSProvidersPage from '../pages/finance/FFSProvidersPage';

import ReportsPage         from '../pages/reports/ReportsPage';
import AuditLogPage        from '../pages/reports/AuditLogPage';

import UsersPage           from '../pages/settings/UsersPage';
import RolesPage           from '../pages/settings/RolesPage';
import BranchesPage        from '../pages/settings/BranchesPage';
import BranchFormPage from '../pages/settings/BranchFormPage';
import ProfilePage         from '../pages/settings/ProfilePage';

import UserFormPage from '../pages/settings/UserFormPage';
import UserDetailPage from '../pages/settings/UserDetailPage';

import TermsPage from '../pages/legal/TermsPage';
import PrivacyPolicyPage   from '../pages/legal/PrivacyPolicyPage';
import SupportPage         from '../pages/legal/SupportPage';
import NotFoundPage        from '../pages/NotFoundPage';

// ── Corporate Portal pages ─────────────────────────────────────────────────
import CorpDashboardPage from '../pages/portals/corporate/CorpDashboardPage';
import CorpEnrolleesPage from '../pages/portals/corporate/CorpEnrolleesPage';
import CorpClaimsPage    from '../pages/portals/corporate/CorpClaimsPage';
import CorpInvoicesPage  from '../pages/portals/corporate/CorpInvoicesPage';
import CorpProfilePage   from '../pages/portals/corporate/CorpProfilePage';

// ── Enrollee Portal pages ──────────────────────────────────────────────────
import EnrolleeDashboardPage from '../pages/portals/enrollee/EnrolleeDashboardPage';
import MyIDCardPage          from '../pages/portals/enrollee/MyIDCardPage';
import MyBenefitsPage        from '../pages/portals/enrollee/MyBenefitsPage';
import MyClaimsPage          from '../pages/portals/enrollee/MyClaimsPage';
import FindHCPPage           from '../pages/portals/enrollee/FindHCPPage';
import MyComplaintsPage      from '../pages/portals/enrollee/MyComplaintsPage';

// Add these new page imports
import SLADashboardPage    from '../pages/reports/SLADashboardPage';
import FraudHeatmapPage    from '../pages/reports/FraudHeatmapPage';
import AlertsPage          from '../pages/alerts/AlertsPage';
import CompliancePage      from '../pages/compliance/CompliancePage';
import ImportExportPage    from '../pages/import/ImportExportPage';
import AIToolsPage         from '../pages/ai/AIToolsPage';
import HelpCentrePage from '../pages/help/HelpCentrePage';

import ClaimImportPage from '../pages/claims/ClaimImportPage';
import ClaimImportHistoryPage from '../pages/claims/ClaimImportHistoryPage';

// ── Route guards ───────────────────────────────────────────────────────────
import ProtectedRoute  from './ProtectedRoute';
import PermissionRoute from './PermissionRoute';

// ─────────────────────────────────────────────────────────────────────────────
// Helper — matches /enrollee and /enrollee/* but NOT /enrollees
// ─────────────────────────────────────────────────────────────────────────────
function isPortalPath(path, prefix) {
    return path === prefix || path.startsWith(prefix + '/');
}

// ─────────────────────────────────────────────────────────────────────────────
// App Router
// ─────────────────────────────────────────────────────────────────────────────
export default function AppRouter() {
    const { user, loading, portalType } = useAuth();
    const navigate  = useNavigate();
    const location  = useLocation();

    /**
     * Post-login redirect guard.
     * Runs whenever user or path changes.
     * Sends each user type to their correct portal root if they land somewhere wrong.
     */
    useEffect(() => {
        if (loading || !user) return;

        const portal      = portalType();   // 'hmo' | 'corporate' | 'enrollee'
        const currentPath = location.pathname;

        // ── Redirect from /login if already authenticated ─────────────────
        if (currentPath === '/login') {
            if      (portal === 'enrollee')  navigate('/enrollee',  { replace: true });
            else if (portal === 'corporate') navigate('/corporate', { replace: true });
            else                             navigate('/',           { replace: true });
            return;
        }

        // ── Enrollee user on wrong path ───────────────────────────────────
        if (portal === 'enrollee' && !isPortalPath(currentPath, '/enrollee') && currentPath !== '/set-password') {
            navigate('/enrollee', { replace: true });
            return;
        }

        // ── Corporate user on wrong path ──────────────────────────────────
        if (portal === 'corporate' && !isPortalPath(currentPath, '/corporate') && currentPath !== '/set-password') {
            navigate('/corporate', { replace: true });
            return;
        }

        // ── HMO staff accidentally on a portal path ───────────────────────
        // Note: isPortalPath('/enrollees', '/enrollee') → false ✓
        //       isPortalPath('/corporates', '/corporate') → false ✓
        if (portal === 'hmo' && (isPortalPath(currentPath, '/enrollee') || isPortalPath(currentPath, '/corporate'))) {
            navigate('/', { replace: true });
            return;
        }
    }, [user, loading, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Loading spinner ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="d-flex vh-100 align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                </div>
            </div>
        );
    }

    return (
        <Routes>

            {/* ══════════════════════════════════════════════════════════════
                PUBLIC — no auth required
            ══════════════════════════════════════════════════════════════ */}
            <Route element={<AuthLayout />}>
                <Route
                    path="/login"
                    element={user ? <Navigate to="/" replace /> : <LoginPage />}
                />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
            <Route path="/set-password" element={<SetInitialPasswordPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/support"        element={<SupportPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* ══════════════════════════════════════════════════════════════
                HMO STAFF — AppLayout (full sidebar + topbar shell)
                /  /enrollees  /corporates  /hcps  /claims  /pre-auth  etc.
                ProtectedRoute will redirect portal users away from here.
            ══════════════════════════════════════════════════════════════ */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

                {/* Dashboard */}
                <Route index element={<DashboardPage />} />

                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/support"        element={<SupportPage />} />
                <Route path="/terms" element={<TermsPage />} />
                
                <Route path="help" element={<HelpCentrePage />} />
                <Route path="help/:slug" element={<HelpCentrePage />} />

                {/* <Route path="plans" element={
                    <PermissionRoute permission="plans.view">
                        <AllPlansPage standalone={true} />
                    </PermissionRoute>
                } /> */}

                {/* ── Corporates (HMO staff view — /corporates NOT /corporate) ── */}
                <Route path="corporates">
                    <Route index element={
                        <PermissionRoute permission="corporates.view">
                            <CorporateListPage />
                        </PermissionRoute>
                    } />
                    <Route path="new" element={
                        <PermissionRoute permission="corporates.create">
                            <CorporateFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id" element={
                        <PermissionRoute permission="corporates.view">
                            <CorporateDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id/edit" element={
                        <PermissionRoute permission="corporates.edit">
                            <CorporateFormPage />
                        </PermissionRoute>
                    } />

                    <Route path=":corporateId/plans/new" element={
                        <PermissionRoute permission="plans.create">
                            <PlanFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":corporateId/plans/:planId" element={
                        <PermissionRoute permission="corporates.view">
                            <PlanDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path=":corporateId/plans/:planId/edit" element={
                        <PermissionRoute permission="plans.edit">
                            <PlanFormPage />
                        </PermissionRoute>
                    } />
                </Route>


                {/* ── Enrollees (HMO staff view — /enrollees NOT /enrollee) ── */}
                <Route path="enrollees">
                    <Route index element={
                        <PermissionRoute permission="enrollees.view">
                            <EnrolleeListPage />
                        </PermissionRoute>
                    } />
                    <Route path="new" element={
                        <PermissionRoute permission="enrollees.create">
                            <EnrolleeFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id" element={
                        <PermissionRoute permission="enrollees.view">
                            <EnrolleeDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id/edit" element={
                        <PermissionRoute permission="enrollees.edit">
                            <EnrolleeFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":enrolleeId/dependents/new" element={
                        <PermissionRoute permission="enrollees.edit">
                            <DependentFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":enrolleeId/dependents/:dependentId" element={
                        <PermissionRoute permission="enrollees.view">
                            <DependentDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path=":enrolleeId/dependents/:dependentId/edit" element={
                        <PermissionRoute permission="enrollees.edit">
                            <DependentFormPage />
                        </PermissionRoute>
                    } />
                </Route>

                {/* ── Health Care Providers ── */}
                <Route path="hcps">
                    <Route index element={
                        <PermissionRoute permission="hcps.view">
                            <HCPListPage />
                        </PermissionRoute>
                    } />
                    <Route path="new" element={
                        <PermissionRoute permission="hcps.create">
                            <HCPFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id" element={
                        <PermissionRoute permission="hcps.view">
                            <HCPDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id/edit" element={
                        <PermissionRoute permission="hcps.edit">
                            <HCPFormPage />
                        </PermissionRoute>
                    } />
                </Route>

                {/* ── Claims ── */}
                <Route path="claims">
                    <Route index element={
                        <PermissionRoute permission="claims.view">
                            <ClaimListPage />
                        </PermissionRoute>
                    } />
                    <Route path="new" element={
                        <PermissionRoute permission="claims.submit">
                            <ClaimFormPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id" element={
                        <PermissionRoute permission="claims.view">
                            <ClaimDetailPage />
                        </PermissionRoute>
                    } />
                    
                </Route>
                <Route path="claims/import"     element={<PermissionRoute permission="claims.import"><ClaimImportPage /></PermissionRoute>} />
                <Route path="claims/imports" element={
                    <PermissionRoute permission="claims.import">
                        <ClaimImportHistoryPage />
                    </PermissionRoute>
                } />

                {/* ── Pre-Authorisation ── */}
                <Route path="pre-auth">
                    <Route index element={
                        <PermissionRoute permission="pa.view">
                            <PAListPage />
                        </PermissionRoute>
                    } />
                    <Route path="new" element={
                        <PermissionRoute permission="pa.request">
                            <PAFormPage />
                        </PermissionRoute>
                    } />
                    {/* tat-report must come BEFORE :id — otherwise 'tat-report' is treated as an id param */}
                    <Route path="tat-report" element={
                        <PermissionRoute permission="reports.branch">
                            <PATATReportPage />
                        </PermissionRoute>
                    } />
                    <Route path=":id" element={
                        <PermissionRoute permission="pa.view">
                            <PADetailPage />
                        </PermissionRoute>
                    } />
                </Route>

                {/* ── Finance ── */}
                <Route path="finance">
                    <Route index element={
                        <PermissionRoute permission="finance.view">
                            <FinancePage />
                        </PermissionRoute>
                    } />
                    <Route path="batches/:id" element={
                        <PermissionRoute permission="finance.view">
                            <PaymentBatchDetail />
                        </PermissionRoute>
                    } />

                        {/* ➕ NEW: Capitation routes */}
                    <Route path="capitation" element={
                        <PermissionRoute permission="finance.capitation">
                            <CapitationListPage />
                        </PermissionRoute>
                    } />
                    <Route path="capitation/:id" element={
                        <PermissionRoute permission="finance.capitation">
                            <CapitationDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path="ffs" element={
                        <PermissionRoute permission="finance.ffs">
                            <FFSProvidersPage />
                        </PermissionRoute>
                    } />
                </Route>

                {/* ── Alerts / Notification Centre (all staff) ── */}
                <Route path="alerts" element={<AlertsPage />} />

                {/* ── Compliance Calendar ── */}
                <Route path="compliance" element={
                    <PermissionRoute permission="compliance.view">
                        <CompliancePage />
                    </PermissionRoute>
                } />

                {/* ── AI Tools ── */}
                <Route path="ai-tools" element={
                    <PermissionRoute permission="ai.tools">
                        <AIToolsPage />
                    </PermissionRoute>
                } />

                {/* ── Imports ── */}
                <Route path="import" element={
                        <PermissionRoute permission="import.enrollees">
                            <ImportExportPage />
                        </PermissionRoute>
                } />

                {/* ── Reports ── */}
                <Route path="reports">
                    <Route index element={
                        <PermissionRoute permission="reports.branch">
                            <ReportsPage />
                        </PermissionRoute>
                    } />
                    <Route path="audit-logs" element={
                        <PermissionRoute permission="reports.audit_logs">
                            <AuditLogPage />
                        </PermissionRoute>
                    } />

                    {/* ➕ NEW: SLA Dashboard */}
                    <Route path="sla" element={
                        <PermissionRoute permission="reports.branch">
                            <SLADashboardPage />
                        </PermissionRoute>
                    } />
                    
                    {/* ➕ NEW: Fraud Heatmap */}
                    <Route path="fraud-heatmap" element={
                        <PermissionRoute permission="reports.fraud_heatmap">
                            <FraudHeatmapPage />
                        </PermissionRoute>
                    } />

                </Route>

                {/* ── Settings ── */}
                <Route path="settings">
                    <Route path="users" element={
                        <PermissionRoute permission="users.view">
                            <UsersPage />
                        </PermissionRoute>
                    } />

                    <Route path="users/new" element={
                        <PermissionRoute permission="users.create">
                            <UserFormPage />
                        </PermissionRoute>
                    } />
                    <Route path="users/:id" element={
                        <PermissionRoute permission="users.view">
                            <UserDetailPage />
                        </PermissionRoute>
                    } />
                    <Route path="users/:id/edit" element={
                        <PermissionRoute permission="users.edit">
                            <UserFormPage />
                        </PermissionRoute>
                    } />
                    <Route path="roles" element={
                        <PermissionRoute permission="roles.view">
                            <RolesPage />
                        </PermissionRoute>
                    } />
                    <Route path="branches" element={
                        <PermissionRoute permission="branches.view">
                            <BranchesPage />
                        </PermissionRoute>
                    } />
                    <Route path="branches/new" element={
                        <PermissionRoute permission="branches.create">
                            <BranchFormPage />
                        </PermissionRoute>
                    } />
                    <Route path="branches/:id" element={
                        <PermissionRoute permission="branches.view">
                            <BranchFormPage />
                        </PermissionRoute>
                    } />
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* 404 within HMO shell */}
                <Route path="*" element={<NotFoundPage />} />

            </Route>
            {/* ── END HMO STAFF ROUTES ─────────────────────────────────── */}


            {/* ══════════════════════════════════════════════════════════════
                CORPORATE PORTAL — /corporate/*
                Completely separate route tree from AppLayout.
                CorporateLayout renders its own topnav, NO sidebar.
                ProtectedRoute redirects non-corporate users away.
            ══════════════════════════════════════════════════════════════ */}
            <Route element={<ProtectedRoute><CorporateLayout /></ProtectedRoute>}>
                <Route path="/corporate"           element={<CorpDashboardPage />} />
                <Route path="/corporate/enrollees" element={<CorpEnrolleesPage />} />
                <Route path="/corporate/claims"    element={<CorpClaimsPage />} />
                <Route path="/corporate/invoices"  element={<CorpInvoicesPage />} />
                <Route path="/corporate/profile"   element={<CorpProfilePage />} />
            </Route>


            {/* ══════════════════════════════════════════════════════════════
                ENROLLEE PORTAL — /enrollee/*
                Completely separate route tree from AppLayout.
                EnrolleeLayout renders its own topnav, NO sidebar.
                ProtectedRoute redirects non-enrollee users away.
            ══════════════════════════════════════════════════════════════ */}
            <Route element={<ProtectedRoute><EnrolleeLayout /></ProtectedRoute>}>
                <Route path="/enrollee"             element={<EnrolleeDashboardPage />} />
                <Route path="/enrollee/id-card"     element={<MyIDCardPage />} />
                <Route path="/enrollee/benefits"    element={<MyBenefitsPage />} />
                <Route path="/enrollee/claims"      element={<MyClaimsPage />} />
                <Route path="/enrollee/find-hcp"    element={<FindHCPPage />} />
                <Route path="/enrollee/complaints"  element={<MyComplaintsPage />} />
            </Route>
            <Route path="*" element={
    <div>
        <h1>404 - Page Not Found</h1>
        <p>Current path: {window.location.pathname}</p>
    </div>
} />
        </Routes>
        
    );
}