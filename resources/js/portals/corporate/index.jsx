/**
 * FILE LOCATION: resources/js/portals/corporate/index.jsx
 * PATCH NOTE: real file plus renewals, budget, plan builder, plan
 * requests, and broadcast routes. The last four were built in Phase 5 but
 * never actually added to this router file, another gap closed this pass.
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CorporateLayout from '../../layouts/portals/CorporateLayout';

import CorpDashboardPage from '../../pages/portals/corporate/CorpDashboardPage';
import CorpEnrolleesPage from '../../pages/portals/corporate/CorpEnrolleesPage';
import CorpClaimsPage from '../../pages/portals/corporate/CorpClaimsPage';
import CorpInvoicesPage from '../../pages/portals/corporate/CorpInvoicesPage';
import CorpProfilePage from '../../pages/portals/corporate/CorpProfilePage';
import CorpBudgetDashboardPage from '../../pages/portals/corporate/CorpBudgetDashboardPage';
import CorpPlanBuilderPage from '../../pages/portals/corporate/CorpPlanBuilderPage';
import CorpBroadcastPage from '../../pages/portals/corporate/CorpBroadcastPage';
import CorpRenewalsPage from '../../pages/portals/corporate/CorpRenewalsPage';

export default function CorporatePortal() {
    return (
        <CorporateLayout>
            <Routes>
                <Route path="/" element={<CorpDashboardPage />} />
                <Route path="/enrollees" element={<CorpEnrolleesPage />} />
                <Route path="/claims" element={<CorpClaimsPage />} />
                <Route path="/invoices" element={<CorpInvoicesPage />} />
                <Route path="/budget" element={<CorpBudgetDashboardPage />} />
                <Route path="/renewals" element={<CorpRenewalsPage />} />
                <Route path="/available-plans" element={<CorpPlanBuilderPage />} />
                <Route path="/plan-requests" element={<CorpPlanBuilderPage />} />
                <Route path="/broadcast" element={<CorpBroadcastPage />} />
                <Route path="/profile" element={<CorpProfilePage />} />
            </Routes>
        </CorporateLayout>
    );
}
