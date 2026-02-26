/**
 * FILE: resources/js/lib/queryClientConfig.js
 *
 * Create your React Query client with these defaults so that auth/permission
 * failures are never retried (prevents the 401-cascade race on page refresh).
 *
 * USAGE in main.jsx / App.jsx:
 *
 *   import { queryClient } from './lib/queryClientConfig';
 *   import { QueryClientProvider } from '@tanstack/react-query';
 *
 *   <QueryClientProvider client={queryClient}>
 *     <AuthProvider>
 *       <AppRouter />
 *     </AuthProvider>
 *   </QueryClientProvider>
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Never retry on 401 (Unauthorized) or 403 (Forbidden).
 * Retry up to 2 times for genuine network/server errors.
 */
function smartRetry(failureCount, error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403 || status === 404) {
        return false;   // never retry auth, permission, or not-found failures
    }
    return failureCount < 2;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry:              smartRetry,
            staleTime:          30_000,    // 30s — prevents hammering the API on every re-mount
            refetchOnWindowFocus: false,   // prevents a refetch cascade when user alt-tabs back
        },
        mutations: {
            retry: false,
        },
    },
});