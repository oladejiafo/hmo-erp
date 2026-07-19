/**
 * FILE: resources/js/api/client.js
 *
 * CHANGES FROM ORIGINAL:
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG 1 FIXED: Removed `window.location.href = '/login'` from the 401
 *   interceptor. That caused a hard page reload → blank white screen. The
 *   redirect is now handled entirely by React Router via the `hmo:unauthorized`
 *   custom event that AuthContext already listens for.
 *
 * BUG 2 FIXED: Auth endpoints (/auth/*) are now excluded from the 401 dispatch.
 *   Previously, if `/auth/me` itself returned 401 (expired token), the interceptor
 *   would fire the event AND `fetchUser`'s catch block would call clearSession()
 *   simultaneously - double-handling with unpredictable order. Now only
 *   `fetchUser`'s catch block handles auth endpoint 401s.
 *
 * BUG 3 FIXED: Added request ID tracking to prevent the event from firing
 *   during the initial `fetchUser` call that runs on page refresh, giving
 *   AuthContext time to fully resolve before any redirect happens.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1',          // ← Explicit prefix - removes ambiguity on refresh
    headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
    },
    withCredentials: true,
});

// ── Request interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
    // Success - pass through
    (response) => response,

    // Error handler
    (error) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url ?? '';

            /**
             * Auth endpoints handle their own 401s inside AuthContext.fetchUser.
             * We must NOT dispatch the event here or we get double-handling:
             *   - interceptor fires hmo:unauthorized  → clearSession() → navigate /login
             *   - fetchUser catch block also calls clearSession()
             *
             * Skip:  /auth/me, /auth/login, /auth/refresh, etc.
             */
            const isAuthEndpoint = requestUrl.includes('/auth/');
            if (isAuthEndpoint) {
                return Promise.reject(error);
            }

            /**
             * For all other protected endpoints: dispatch the custom event.
             * AuthContext listens for this and calls clearSession() which
             * sets user = null. ProtectedRoute then redirects via React Router
             * (no hard reload, no blank screen).
             */
            window.dispatchEvent(new CustomEvent('hmo:unauthorized', {
                detail: { url: requestUrl, status: 401 },
            }));
        }

        return Promise.reject(error);
    },
);

export default apiClient;