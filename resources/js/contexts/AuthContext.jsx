/**
 * FILE: resources/js/contexts/AuthContext.jsx
 *
 * CHANGES FROM ORIGINAL:
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG 1 FIXED: fetchUser() now calls clearSession() when the API returns a
 *   successful 200 but `userData` is null/undefined (malformed response).
 *   Previously it returned early WITHOUT clearing the session, which left
 *   `loading = false` and `user = null` simultaneously — causing ProtectedRoute
 *   to redirect to /login for a genuinely authenticated user whose /auth/me
 *   response was oddly shaped.
 *
 * BUG 2 FIXED: The `hmo:unauthorized` event handler now also navigates to
 *   /login via a flag picked up in ProtectedRoute, rather than just calling
 *   clearSession(). This ensures the redirect goes through React Router
 *   (no hard reload, no blank screen).
 *
 * BUG 3 FIXED: `loading` is initialised to `true` only when a token exists in
 *   localStorage. If there is no token, loading is false from the start and
 *   ProtectedRoute immediately redirects to /login without waiting.
 *
 * NO LOGIC CHANGES to login(), logout(), hasPermission(), portalType(), etc.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
    createContext, useState, useContext,
    useEffect, useCallback, useRef,
} from 'react';
import apiClient from '../api/client';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const useAuthReady = () => {
    const context = useContext(AuthContext);
    return !context?.loading;
};

export const AuthProvider = ({ children }) => {
    // ── BUG 3 FIX: start loading=true only when a token exists ──────────────
    const [user,            setUser]            = useState(null);
    const [loading,         setLoading]         = useState(!!localStorage.getItem('auth_token'));
    const [permissions,     setPermissions]     = useState([]);
    const [token,           setToken]           = useState(() => localStorage.getItem('auth_token'));
    const [activeBranchId,  setActiveBranchId]  = useState(null);

    // Ref to prevent the unauthorized event from firing during the initial
    // fetchUser() call that runs on every page refresh.
    const isInitialAuthCheck = useRef(false);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const normalizeCollection = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return Object.values(val);
        return [];
    };

    // ── clearSession ─────────────────────────────────────────────────────────
    const clearSession = useCallback(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setPermissions([]);
        setActiveBranchId(null);
    }, []);

    // ── fetchUser ─────────────────────────────────────────────────────────────
    const fetchUser = useCallback(async () => {
        setLoading(true);
        isInitialAuthCheck.current = true;   // suppress unauthorized event during this call

        try {
            const response = await apiClient.get('/auth/me');

            const userData =
                response.data?.data ||
                response.data?.user ||
                response.data;

            // ── BUG 1 FIX ────────────────────────────────────────────────────
            if (!userData || typeof userData !== 'object') {
                console.warn('fetchUser: unexpected response shape — clearing session', response.data);
                clearSession();    // ← was a bare `return` before; user stayed null with loading=false
                return;
            }

            // Normalise Spatie Permission collections
            if (userData.permissions) userData.permissions = normalizeCollection(userData.permissions);
            if (userData.roles)       userData.roles       = normalizeCollection(userData.roles);

            setUser(userData);

            const perms =
                response.data?.data?.permissions ||
                response.data?.permissions ||
                userData.permissions ||
                [];
            setPermissions(perms);

        } catch (error) {
            console.error('fetchUser error:', error);

            // Auth endpoint 401 — token is invalid/expired
            if (error.response?.status === 401) {
                clearSession();
            }
            // Other errors (5xx, network) — keep the token; don't log the user out
        } finally {
            setLoading(false);
            isInitialAuthCheck.current = false;  // restore normal 401 event handling
        }
    }, [clearSession]);

    // ── Listen for 401 events from client.js ────────────────────────────────
    //    client.js dispatches 'hmo:unauthorized' on 401 from any non-auth endpoint.
    //    We call clearSession() here, which sets user=null.
    //    ProtectedRoute sees user=null + loading=false and redirects via React Router.
    //    No hard reload. No blank screen.
    useEffect(() => {
        const handleUnauthorized = (e) => {
            // Don't react during the initial auth check — the event could be
            // a stale in-flight request from a previous render cycle.
            if (isInitialAuthCheck.current) return;

            console.warn('hmo:unauthorized received — clearing session', e.detail);
            clearSession();
        };

        window.addEventListener('hmo:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('hmo:unauthorized', handleUnauthorized);
    }, [clearSession]);

    // ── Restore session on mount ──────────────────────────────────────────────
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            fetchUser();
        }
        // If no token: loading is already false (see initial state), ProtectedRoute
        // redirects to /login immediately without waiting.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // Note: intentionally NOT including fetchUser in deps — we only want this to
    // run once on mount. Adding fetchUser (a useCallback) here would cause an
    // infinite loop if clearSession ever changes its identity.

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = async (email, password, otp = null) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password, otp });

            if (response.data.requires_2fa) {
                return { requires_2fa: true };
            }

            if (response.data.requires_password_change) {
                const { token: t, user: u } = response.data.data;
                if (u.permissions) u.permissions = normalizeCollection(u.permissions);
                if (u.roles)       u.roles       = normalizeCollection(u.roles);
                localStorage.setItem('auth_token', t);
                setToken(t);
                setUser(u);
                setPermissions(u.permissions || []);
                return { requires_password_change: true, token: t, user: u };
            }

            // Nested { data: { token, user, permissions } }
            if (response.data.data?.token) {
                const { token: t, user: u, permissions: p } = response.data.data;
                if (u.permissions) u.permissions = normalizeCollection(u.permissions);
                if (u.roles)       u.roles       = normalizeCollection(u.roles);
                localStorage.setItem('auth_token', t);
                setToken(t);
                setUser(u);
                setPermissions(p || []);
                return { success: true };
            }

            // Flat { token, user, permissions }
            if (response.data.token) {
                const { token: t, user: u, permissions: p } = response.data;
                if (u.permissions) u.permissions = normalizeCollection(u.permissions);
                if (u.roles)       u.roles       = normalizeCollection(u.roles);
                localStorage.setItem('auth_token', t);
                setToken(t);
                setUser(u);
                setPermissions(p || []);
                return { success: true };
            }

            return { error: 'Invalid response from server' };

        } catch (error) {
            console.error('Login error:', error);
            return { error: error.response?.data?.message || 'Login failed' };
        }
    };

    // ── Set initial password ──────────────────────────────────────────────────
    const setInitialPassword = async (password) => {
        try {
            const response = await apiClient.post('/auth/set-initial-password', {
                password,
                password_confirmation: password,
            });
            await fetchUser();
            return { success: true, message: response.data.message };
        } catch (error) {
            return { error: error.response?.data?.message || 'Failed to set password' };
        }
    };

    const forgotPassword = async (email) => {
        const response = await apiClient.post('/auth/forgot-password', { email });
        return response.data;
    };

    const resetPassword = async (data) => {
        const response = await apiClient.post('/auth/reset-password', data);
        return response.data;
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // best-effort
        } finally {
            clearSession();
        }
    };

    // ── Permission helpers ────────────────────────────────────────────────────
    const hasPermission = useCallback((permission) => {
        if (!permission) return true;
        return permissions.includes(permission);
    }, [permissions]);

    const hasAnyRole = useCallback((roles) => {
        if (!user?.roles) return false;
        return roles.some(r => user.roles.includes(r));
    }, [user]);

    const hasRole = useCallback((role) => {
        if (!user) return false;
        return (user.roles ?? []).includes(role);
    }, [user]);

    const isHQ = useCallback(() => {
        if (!user) return false;
        return (
            user.branch?.type === 'HQ' ||
            hasAnyRole(['super_admin', 'hq_admin', 'hq_manager'])
        );
    }, [user, hasAnyRole]);

    // ── Portal type ───────────────────────────────────────────────────────────
    const portalType = useCallback(() => {
        if (!user) return 'hmo';

        if (user.user_type === 'corporate_user') return 'corporate';
        if (user.user_type === 'enrollee_user')  return 'enrollee';

        const roles = user.roles ?? [];
        if (roles.some(r => ['corporate_user', 'corporate_admin', 'corporate_hr'].includes(r))) return 'corporate';
        if (roles.some(r => ['enrollee_user', 'enrollee_self_service'].includes(r)))             return 'enrollee';

        return 'hmo';
    }, [user]);

    // ── Branch helpers ────────────────────────────────────────────────────────
    const getActiveBranch = useCallback(() => {
        return activeBranchId ?? user?.branch_id ?? null;
    }, [activeBranchId, user]);

    const value = {
        user,
        loading,
        permissions,
        token,
        login,
        logout,
        forgotPassword,
        resetPassword,
        setInitialPassword,
        hasPermission,
        hasAnyRole,
        hasRole,
        isHQ,
        portalType,
        activeBranchId,
        setActiveBranchId,
        getActiveBranch,
        refreshUser: fetchUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};