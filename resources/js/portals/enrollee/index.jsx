import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EnrolleeLayout from '../../layouts/portals/EnrolleeLayout';

// Pages
import EnrolleeDashboardPage from '../../pages/portals/enrollee/EnrolleeDashboardPage';
import MyIDCardPage from '../../pages/portals/enrollee/MyIDCardPage';
import MyBenefitsPage from '../../pages/portals/enrollee/MyBenefitsPage';
import MyClaimsPage from '../../pages/portals/enrollee/MyClaimsPage';
import FindHCPPage from '../../pages/portals/enrollee/FindHCPPage';
import MyComplaintsPage from '../../pages/portals/enrollee/MyComplaintsPage';

export default function EnrolleePortal() {
    return (
        <EnrolleeLayout>
            <Routes>
                <Route path="/" element={<EnrolleeDashboardPage />} />
                <Route path="/id-card" element={<MyIDCardPage />} />
                <Route path="/benefits" element={<MyBenefitsPage />} />
                <Route path="/claims" element={<MyClaimsPage />} />
                <Route path="/find-hcp" element={<FindHCPPage />} />
                <Route path="/complaints" element={<MyComplaintsPage />} />
            </Routes>
        </EnrolleeLayout>
    );
}