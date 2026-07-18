import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EnrolleeLayout from '../../layouts/portals/EnrolleeLayout';

// Pages
import EnrolleeDashboardPage from '../../pages/portals/enrollee/EnrolleeDashboardPage';
import MyIDCardPage from '../../pages/portals/enrollee/MyIDCardPage';
import MyBenefitsPage from '../../pages/portals/enrollee/MyBenefitsPage';
import MyClaimsPage from '../../pages/portals/enrollee/MyClaimsPage';
import MyReimbursementsPage from '../../pages/portals/enrollee/MyReimbursementsPage'; // [PHASE 1] NEW
import FindHCPPage from '../../pages/portals/enrollee/FindHCPPage';
import MyComplaintsPage from '../../pages/portals/enrollee/MyComplaintsPage';

// After all imports
console.log('🔍 EnrolleePortal rendering with routes:', {
    hasReimbursements: !!MyReimbursementsPage,
    component: MyReimbursementsPage
});
export default function EnrolleePortal() {
    return (
        <EnrolleeLayout>
            <Routes>
                <Route path="/" element={<EnrolleeDashboardPage />} />
                <Route path="/id-card" element={<MyIDCardPage />} />
                <Route path="/benefits" element={<MyBenefitsPage />} />
                <Route path="/claims" element={<MyClaimsPage />} />
                <Route path="/reimbursements" element={<MyReimbursementsPage />} /> {/* [PHASE 1] NEW */}
                <Route path="/find-hcp" element={<FindHCPPage />} />
                <Route path="/complaints" element={<MyComplaintsPage />} />
            </Routes>
        </EnrolleeLayout>
    );
}