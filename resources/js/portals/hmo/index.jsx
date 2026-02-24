import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import PermissionRoute from '../../router/PermissionRoute';

// Pages
import DashboardPage from '../../pages/dashboard/DashboardPage';

import CorporateListPage from '../../pages/corporates/CorporateListPage';
import CorporateDetailPage from '../../pages/corporates/CorporateDetailPage';
import CorporateFormPage from '../../pages/corporates/CorporateFormPage';

import EnrolleeListPage from '../../pages/enrollees/EnrolleeListPage';
import EnrolleeDetailPage from '../../pages/enrollees/EnrolleeDetailPage';
import EnrolleeFormPage from '../../pages/enrollees/EnrolleeFormPage';
import DependentFormPage from '../../pages/enrollees/DependentFormPage';
import DependentDetailPage from '../../pages/enrollees/DependentDetailPage';

import HCPListPage from '../../pages/hcps/HCPListPage';
import HCPDetailPage from '../../pages/hcps/HCPDetailPage';
import HCPFormPage from '../../pages/hcps/HCPFormPage';

import ClaimListPage from '../../pages/claims/ClaimListPage';
import ClaimDetailPage from '../../pages/claims/ClaimDetailPage';
import ClaimFormPage from '../../pages/claims/ClaimFormPage';

import FinancePage from '../../pages/finance/FinancePage';
import PaymentBatchDetail from '../../pages/finance/PaymentBatchDetail';

import ReportsPage from '../../pages/reports/ReportsPage';
import AuditLogPage from '../../pages/reports/AuditLogPage';

import UsersPage from '../../pages/settings/UsersPage';
import RolesPage from '../../pages/settings/RolesPage';
import BranchesPage from '../../pages/settings/BranchesPage';
import ProfilePage from '../../pages/settings/ProfilePage';

import NotFoundPage from '../../pages/NotFoundPage';

export default function HMOPortal() {
    return (
        <AppLayout>
            <Routes>
                {/* Dashboard */}
                <Route path="/" element={<DashboardPage />} />

                {/* Corporates - note the paths are relative */}
                <Route path="/corporates" element={
                    <PermissionRoute permission="corporates.view">
                        <CorporateListPage />
                    </PermissionRoute>
                } />
                <Route path="/corporates/new" element={
                    <PermissionRoute permission="corporates.create">
                        <CorporateFormPage />
                    </PermissionRoute>
                } />
                <Route path="/corporates/:id" element={
                    <PermissionRoute permission="corporates.view">
                        <CorporateDetailPage />
                    </PermissionRoute>
                } />
                <Route path="/corporates/:id/edit" element={
                    <PermissionRoute permission="corporates.edit">
                        <CorporateFormPage />
                    </PermissionRoute>
                } />

                {/* Enrollees */}
                <Route path="/enrollees" element={
                    <PermissionRoute permission="enrollees.view">
                        <EnrolleeListPage />
                    </PermissionRoute>
                } />
                <Route path="/enrollees/new" element={
                    <PermissionRoute permission="enrollees.create">
                        <EnrolleeFormPage />
                    </PermissionRoute>
                } />
                <Route path="/enrollees/:id" element={
                    <PermissionRoute permission="enrollees.view">
                        <EnrolleeDetailPage />
                    </PermissionRoute>
                } />
                <Route path="/enrollees/:id/edit" element={
                    <PermissionRoute permission="enrollees.edit">
                        <EnrolleeFormPage />
                    </PermissionRoute>
                } />

                {/* Dependents */}
                <Route path="/enrollees/:enrolleeId/dependents/new" element={
                    <PermissionRoute permission="enrollees.edit">
                        <DependentFormPage />
                    </PermissionRoute>
                } />
                <Route path="/enrollees/:enrolleeId/dependents/:dependentId" element={
                    <PermissionRoute permission="enrollees.view">
                        <DependentDetailPage />
                    </PermissionRoute>
                } />
                <Route path="/enrollees/:enrolleeId/dependents/:dependentId/edit" element={
                    <PermissionRoute permission="enrollees.edit">
                        <DependentFormPage />
                    </PermissionRoute>
                } />

                {/* HCPs */}
                <Route path="/hcps" element={
                    <PermissionRoute permission="hcps.view">
                        <HCPListPage />
                    </PermissionRoute>
                } />
                <Route path="/hcps/new" element={
                    <PermissionRoute permission="hcps.create">
                        <HCPFormPage />
                    </PermissionRoute>
                } />
                <Route path="/hcps/:id" element={
                    <PermissionRoute permission="hcps.view">
                        <HCPDetailPage />
                    </PermissionRoute>
                } />
                <Route path="/hcps/:id/edit" element={
                    <PermissionRoute permission="hcps.edit">
                        <HCPFormPage />
                    </PermissionRoute>
                } />

                {/* Claims */}
                <Route path="/claims" element={
                    <PermissionRoute permission="claims.view">
                        <ClaimListPage />
                    </PermissionRoute>
                } />
                <Route path="/claims/new" element={
                    <PermissionRoute permission="claims.submit">
                        <ClaimFormPage />
                    </PermissionRoute>
                } />
                <Route path="/claims/:id" element={
                    <PermissionRoute permission="claims.view">
                        <ClaimDetailPage />
                    </PermissionRoute>
                } />

                {/* Finance */}
                <Route path="/finance" element={
                    <PermissionRoute permission="finance.view">
                        <FinancePage />
                    </PermissionRoute>
                } />
                <Route path="/finance/batches/:id" element={
                    <PermissionRoute permission="finance.view">
                        <PaymentBatchDetail />
                    </PermissionRoute>
                } />

                {/* Reports */}
                <Route path="/reports" element={
                    <PermissionRoute permission="reports.branch">
                        <ReportsPage />
                    </PermissionRoute>
                } />
                <Route path="/reports/audit-logs" element={
                    <PermissionRoute permission="reports.audit_logs">
                        <AuditLogPage />
                    </PermissionRoute>
                } />

                {/* Settings */}
                <Route path="/settings/users" element={
                    <PermissionRoute permission="users.view">
                        <UsersPage />
                    </PermissionRoute>
                } />
                <Route path="/settings/roles" element={
                    <PermissionRoute permission="roles.view">
                        <RolesPage />
                    </PermissionRoute>
                } />
                <Route path="/settings/branches" element={
                    <PermissionRoute permission="branches.view">
                        <BranchesPage />
                    </PermissionRoute>
                } />
                <Route path="/settings/profile" element={<ProfilePage />} />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </AppLayout>
    );
}
