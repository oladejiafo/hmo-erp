import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CorporateLayout from '../../layouts/portals/CorporateLayout';

// Pages
import CorpDashboardPage from '../../pages/portals/corporate/CorpDashboardPage';
import CorpEnrolleesPage from '../../pages/portals/corporate/CorpEnrolleesPage';
import CorpClaimsPage from '../../pages/portals/corporate/CorpClaimsPage';
import CorpInvoicesPage from '../../pages/portals/corporate/CorpInvoicesPage';
import CorpProfilePage from '../../pages/portals/corporate/CorpProfilePage';

export default function CorporatePortal() {
    return (
        <CorporateLayout>
            <Routes>
                <Route path="/" element={<CorpDashboardPage />} />
                <Route path="/enrollees" element={<CorpEnrolleesPage />} />
                <Route path="/claims" element={<CorpClaimsPage />} />
                <Route path="/invoices" element={<CorpInvoicesPage />} />
                <Route path="/profile" element={<CorpProfilePage />} />
            </Routes>
        </CorporateLayout>
    );
}