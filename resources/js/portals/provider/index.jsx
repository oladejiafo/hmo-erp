/**
 * NEW FILE — resources/js/portals/provider/index.jsx
 * Mirrors resources/js/portals/corporate/index.jsx exactly.
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProviderLayout from '../../layouts/portals/ProviderLayout';

import ProviderDashboardPage from '../../pages/portals/provider/ProviderDashboardPage';
import ProviderClaimsPage from '../../pages/portals/provider/ProviderClaimsPage';
import ProviderClaimSubmitPage from '../../pages/portals/provider/ProviderClaimSubmitPage';
import ProviderPreAuthPage from '../../pages/portals/provider/ProviderPreAuthPage';

export default function ProviderPortal() {
    return (
        <ProviderLayout>
            <Routes>
                <Route path="/" element={<ProviderDashboardPage />} />
                <Route path="/claims" element={<ProviderClaimsPage />} />
                <Route path="/claims/new" element={<ProviderClaimSubmitPage />} />
                <Route path="/pre-auths" element={<ProviderPreAuthPage />} />
            </Routes>
        </ProviderLayout>
    );
}
