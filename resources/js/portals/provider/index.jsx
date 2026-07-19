/**
 * NEW FILE - resources/js/portals/provider/index.jsx
 * Mirrors resources/js/portals/corporate/index.jsx exactly.
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProviderLayout from '../../layouts/portals/ProviderLayout';

import ProviderDashboardPage from '../../pages/portals/provider/ProviderDashboardPage';
import ProviderClaimsPage from '../../pages/portals/provider/ProviderClaimsPage';
import ProviderClaimSubmitPage from '../../pages/portals/provider/ProviderClaimSubmitPage';
import ProviderClaimImportPage from '../../pages/portals/provider/ProviderClaimImportPage';
import ProviderPreAuthPage from '../../pages/portals/provider/ProviderPreAuthPage';
import ProviderPaymentsPage from '../../pages/portals/provider/ProviderPaymentsPage';
import ProviderReconciliationPage from '../../pages/portals/provider/ProviderReconciliationPage';
import ProviderTicketsPage from '../../pages/portals/provider/ProviderTicketsPage';

export default function ProviderPortal() {
    return (
        <ProviderLayout>
            <Routes>
                <Route path="/" element={<ProviderDashboardPage />} />
                <Route path="/claims" element={<ProviderClaimsPage />} />
                <Route path="/claims/new" element={<ProviderClaimSubmitPage />} />
                <Route path="/claims/import" element={<ProviderClaimImportPage />} />
                <Route path="/pre-auths" element={<ProviderPreAuthPage />} />
                <Route path="/payments" element={<ProviderPaymentsPage />} />
                <Route path="/reconciliation" element={<ProviderReconciliationPage />} />
                <Route path="/tickets" element={<ProviderTicketsPage />} />
            </Routes>
        </ProviderLayout>
    );
}
