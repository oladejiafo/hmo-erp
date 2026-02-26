/**
 * FILE: resources/js/router/ProtectedRoute.jsx
 *
 * CHANGES FROM ORIGINAL:
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG FIX: While `loading = true` the old code returned `null` (completely
 *   blank). On a slow connection this could produce a flash of white.
 *   Now it renders a centered spinner instead. This is purely cosmetic but
 *   also prevents any transient state from being visible.
 *
 * Portal segregation logic is unchanged.
 * isPortalPath() fix (startsWith + '/') is unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Exact-prefix match: avoids /enrollees matching /enrollee, etc.
 */
function isPortalPath(path, prefix) {
    return path === prefix || path.startsWith(prefix + '/');
}

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // ── Still resolving session from localStorage ─────────────────────────
    // Show a full-screen spinner instead of null so users see feedback and
    // there is no risk of child components mounting before auth is ready.
    if (loading) {
        return (
            <div
                className="d-flex vh-100 align-items-center justify-content-center"
                style={{ background: '#f4f6fa' }}
                aria-label="Loading…"
            >
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading…</span>
                </div>
            </div>
        );
    }

    // ── Not authenticated → send to login, preserve intended URL ──────────
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const path = location.pathname;
    const isEnrolleePath  = isPortalPath(path, '/enrollee');
    const isCorporatePath = isPortalPath(path, '/corporate');

    // HMO staff → enrollee portal
    if (isEnrolleePath && user.user_type !== 'enrollee_user') {
        return (
            <Navigate
                to="/login?error=unauthorized_portal&message=You+do+not+have+access+to+the+enrollee+portal"
                replace
            />
        );
    }

    // HMO staff → corporate portal
    if (isCorporatePath && user.user_type !== 'corporate_user') {
        return (
            <Navigate
                to="/login?error=unauthorized_portal&message=You+do+not+have+access+to+the+corporate+portal"
                replace
            />
        );
    }

    // Enrollee user → HMO staff area
    if (!isEnrolleePath && !isCorporatePath && user.user_type === 'enrollee_user') {
        return <Navigate to="/enrollee" replace />;
    }

    // Corporate user → HMO staff area
    if (!isEnrolleePath && !isCorporatePath && user.user_type === 'corporate_user') {
        return <Navigate to="/corporate" replace />;
    }

    return children;
}