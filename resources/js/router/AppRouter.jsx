/**
 * FILE LOCATION: resources/js/router/AppRouter.jsx
 *
 * Main application router. All routes are defined here.
 *
 * ROUTE STRUCTURE:
 *   Public (no auth):
 *     /login              AuthLayout + LoginPage
 *
 *   Protected (auth required):
 *     /                   DashboardPage
 *     /corporates         CorporateListPage
 *     /corporates/new     CorporateFormPage
 *     /corporates/:id     CorporateDetailPage
 *     /enrollees          EnrolleeListPage
 *     /enrollees/new      EnrolleeFormPage
 *     /enrollees/:id      EnrolleeDetailPage
 *     /hcps               HCPListPage
 *     /hcps/:id           HCPDetailPage
 *     /claims             ClaimListPage
 *     /claims/:id         ClaimDetailPage
 *     /finance            FinancePage
 *     /finance/batches/:id PaymentBatchDetail
 *     /reports            ReportsPage
 *     /reports/audit-logs AuditLogPage
 *     /settings/users     UsersPage
 *     /settings/roles     RolesPage
 *     /settings/branches  BranchesPage
 *     /settings/profile   ProfilePage
 *     *                   NotFoundPage
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Layouts ────────────────────────────────────────────────────────────────
import AppLayout  from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

// ── Auth pages ─────────────────────────────────────────────────────────────
// NOTE: folder is lowercase 'auth' on Linux (case-sensitive filesystem)
import LoginPage from '../pages/auth/LoginPage';

// ── Main pages ─────────────────────────────────────────────────────────────
import DashboardPage       from '../pages/dashboard/DashboardPage';

import CorporateListPage   from '../pages/corporates/CorporateListPage';
import CorporateDetailPage from '../pages/corporates/CorporateDetailPage';
import CorporateFormPage   from '../pages/corporates/CorporateFormPage';

import EnrolleeListPage    from '../pages/enrollees/EnrolleeListPage';
import EnrolleeDetailPage  from '../pages/enrollees/EnrolleeDetailPage';
import EnrolleeFormPage    from '../pages/enrollees/EnrolleeFormPage';
import DependentFormPage from '../pages/enrollees/DependentFormPage';
import DependentDetailPage from '../pages/enrollees/DependentDetailPage';


import HCPListPage         from '../pages/hcps/HCPListPage';
import HCPDetailPage       from '../pages/hcps/HCPDetailPage';
import HCPFormPage         from '../pages/hcps/HCPFormPage';

import ClaimListPage       from '../pages/claims/ClaimListPage';
import ClaimDetailPage     from '../pages/claims/ClaimDetailPage';
import ClaimFormPage       from '../pages/claims/ClaimFormPage';

import FinancePage         from '../pages/finance/FinancePage';
import PaymentBatchDetail  from '../pages/finance/PaymentBatchDetail';

import ReportsPage         from '../pages/reports/ReportsPage';
import AuditLogPage        from '../pages/reports/AuditLogPage';

import UsersPage           from '../pages/settings/UsersPage';
import RolesPage           from '../pages/settings/RolesPage';
import BranchesPage        from '../pages/settings/BranchesPage';
import ProfilePage         from '../pages/settings/ProfilePage';

import NotFoundPage        from '../pages/NotFoundPage';

import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage';
import SupportPage from '../pages/legal/SupportPage';

// ── Route guards ───────────────────────────────────────────────────────────
import ProtectedRoute  from './ProtectedRoute';
import PermissionRoute from './PermissionRoute';

export default function AppRouter() {
    const { user, loading } = useAuth();

    // Show a full-screen spinner while the session is being restored from localStorage
    if (loading) {
        return (
            <div className="d-flex vh-100 align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <Routes>

            {/* ── Public routes (no auth required) ─────────────────────── */}
            <Route element={<AuthLayout />}>
                <Route
                    path="/login"
                    element={user ? <Navigate to="/" replace /> : <LoginPage />}
                />
            </Route>

            {/* ── Protected routes (auth required) ─────────────────────── */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

                {/* Dashboard — visible to all authenticated users */}
                <Route index element={<DashboardPage />} />

                {/* ── Corporates ── */}
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
                </Route>

                {/* ── Enrollees ── */}
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

                    // Add these routes inside the enrollees section
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
                </Route>

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
                </Route>

                {/* ── Settings ── */}
                <Route path="settings">
                    <Route path="users" element={
                        <PermissionRoute permission="users.view">
                            <UsersPage />
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
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* 404 catch-all inside the authenticated shell */}
                <Route path="*" element={<NotFoundPage />} />

                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/support" element={<SupportPage />} />
            </Route>

        </Routes>
    );
}