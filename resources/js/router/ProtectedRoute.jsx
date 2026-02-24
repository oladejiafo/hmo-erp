import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * FILE LOCATION: resources/js/router/ProtectedRoute.jsx
 *
 * Redirects unauthenticated users to /login.
 * Preserves the attempted URL so they can be returned after login.
 *
 * Also enforces portal segregation:
 *   /enrollee  and /enrollee/* → enrollee_user only
 *   /corporate and /corporate/* → corporate_user only
 *   everything else              → HMO staff only
 *
 * BUG FIX: previous version used startsWith('/enrollee') which also
 * matched /enrollees (the HMO staff page). Now uses exact prefix matching.
 */

/**
 * Returns true only if the path IS the prefix or starts with prefix + '/'.
 * '/enrollees'.startsWith('/enrollee')     → true  ← old bug
 * isPortalPath('/enrollees', '/enrollee')  → false ← fixed
 * isPortalPath('/enrollee',  '/enrollee')  → true  ← correct
 * isPortalPath('/enrollee/benefits', '/enrollee') → true ← correct
 */
function isPortalPath(path, prefix) {
    return path === prefix || path.startsWith(prefix + '/');
}

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;

    // Not authenticated → send to login, preserve intended URL
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const path = location.pathname;

    // Detect which portal this path belongs to
    const isEnrolleePath  = isPortalPath(path, '/enrollee');
    const isCorporatePath = isPortalPath(path, '/corporate');

    // HMO staff trying to reach an enrollee portal URL
    if (isEnrolleePath && user.user_type !== 'enrollee_user') {
        return (
            <Navigate
                to="/login?error=unauthorized_portal&message=You+do+not+have+access+to+the+enrollee+portal"
                replace
            />
        );
    }

    // HMO staff trying to reach a corporate portal URL
    if (isCorporatePath && user.user_type !== 'corporate_user') {
        return (
            <Navigate
                to="/login?error=unauthorized_portal&message=You+do+not+have+access+to+the+corporate+portal"
                replace
            />
        );
    }

    // Enrollee user trying to reach an HMO staff URL
    if (!isEnrolleePath && !isCorporatePath && user.user_type === 'enrollee_user') {
        return <Navigate to="/enrollee" replace />;
    }

    // Corporate user trying to reach an HMO staff URL
    if (!isEnrolleePath && !isCorporatePath && user.user_type === 'corporate_user') {
        return <Navigate to="/corporate" replace />;
    }

    return children;
}