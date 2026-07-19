/**
 * useLicense - ERP Frontend hook
 *
 * Provides license status to any component that needs to:
 *   - Know whether to disable a button/form
 *   - Show a "why is this disabled?" tooltip
 *
 * FILE: resources/js/hooks/useLicense.js
 *
 * USAGE:
 *   import { useLicense } from '../hooks/useLicense';
 *
 *   const { isRestricted, status, graceDaysRemaining } = useLicense();
 *
 *   <button disabled={isRestricted} title={isRestricted ? RESTRICTED_MSG : undefined}>
 *     Submit Claim
 *   </button>
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const fetchLicenseStatus = () =>
    axios.get('/api/settings/license').then(r => r.data);

export const RESTRICTED_MSG =
    'This action is unavailable - the system is in restricted mode due to a licensing issue. Contact your software vendor.';

export function useLicense() {
    const { data, isLoading } = useQuery({
        queryKey:        ['license-status'],
        queryFn:         fetchLicenseStatus,
        refetchInterval: 15 * 60 * 1000,
        staleTime:       10 * 60 * 1000,
        retry:           false,
        // Don't throw if this fails - don't want license check to break the app
        throwOnError:    false,
    });

    const status = data?.status ?? 'valid'; // fail open - if we can't check, don't block

    return {
        status,
        isRestricted:      status === 'restricted',
        isGrace:           status === 'grace',
        isValid:           status === 'valid',
        isUnlicensed:      status === 'unlicensed',
        graceDaysRemaining: data?.grace_days_remaining ?? null,
        graceEndsAt:        data?.grace_ends_at ?? null,
        plan:               data?.plan ?? null,
        clientName:         data?.client_name ?? null,
        vendorContact:      data?.vendor_contact ?? null,
        isLoading,
        restrictedMsg:     RESTRICTED_MSG,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Axios response interceptor - catches 403 LICENSE_RESTRICTED responses
// and shows a consistent toast, rather than each component handling it.
//
// Mount this ONCE in resources/js/app.jsx:
//
//   import { setupLicenseInterceptor } from './hooks/useLicense';
//   setupLicenseInterceptor(toast); // pass your toast function
// ─────────────────────────────────────────────────────────────────────────────

export function setupLicenseInterceptor(showToast) {
    axios.interceptors.response.use(
        response => response,
        error => {
            if (
                error.response?.status === 403 &&
                error.response?.data?.error_code === 'LICENSE_RESTRICTED'
            ) {
                showToast?.(
                    'This action is blocked - the system licence is restricted. Contact your vendor.',
                    { type: 'error', toastId: 'license-restricted' } // toastId prevents duplicates
                );
            }
            return Promise.reject(error);
        }
    );
}