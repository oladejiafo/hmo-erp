/**
 * FILE LOCATION: resources/js/router/AppRouterX.jsx
 * PATCH NOTE: your real file (69 lines, verified from repo) with Provider
 * Portal wired in, marked [PHASE 2]. This file is short enough to give you
 * the full replacement rather than a fragment patch — safer than a partial
 * diff on a file this size.
 */
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Layouts
import AuthLayout from '../layouts/AuthLayout';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';
import SetInitialPasswordPage from '../pages/auth/SetInitialPasswordPage';
import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage';
import SupportPage from '../pages/legal/SupportPage';

// Portals
import HMOPortal from '../portals/hmo';
import CorporatePortal from '../portals/corporate';
import EnrolleePortal from '../portals/enrollee';
import ProviderPortal from '../portals/provider'; // [PHASE 2]

export default function AppRouter() {
    const { user, loading, portalType } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading || !user) return;
        
        const portal = portalType();
        const currentPath = window.location.pathname;
        
        // Redirect to appropriate portal if needed
        if (currentPath === '/login') {
            if (portal === 'enrollee') navigate('/enrollee', { replace: true });
            else if (portal === 'corporate') navigate('/corporate', { replace: true });
            else if (portal === 'provider') navigate('/provider', { replace: true }); // [PHASE 2]
            else navigate('/', { replace: true });
        }
    }, [user, loading, portalType, navigate]);

    if (loading) {
        return (
            <div className="d-flex vh-100 align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Public routes
    if (!user) {
        return (
            <Routes>
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/set-password" element={<SetInitialPasswordPage />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Route>
            </Routes>
        );
    }

    // Authenticated - show the appropriate portal
    const portal = portalType();
    
    if (portal === 'enrollee') {
        return <EnrolleePortal />;
    }
    
    if (portal === 'corporate') {
        return <CorporatePortal />;
    }

    if (portal === 'provider') {   // [PHASE 2]
        return <ProviderPortal />;
    }
    
    // Default: HMO portal
    return <HMOPortal />;
}
