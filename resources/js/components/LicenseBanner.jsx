/**
 * LicenseBanner - ERP Frontend
 *
 * Shows a persistent banner at the top of the admin shell when:
 *   - Status is 'grace'      → amber warning with days remaining
 *   - Status is 'restricted' → red blocking banner with contact info
 *   - Status is 'unlicensed' → amber (no key configured)
 *
 * Silent when status is 'valid' - no banner shown.
 *
 * USAGE: Mount inside AppLayout.jsx, above the main content area.
 *
 *   import LicenseBanner from '../components/LicenseBanner';
 *   // Inside AppLayout return:
 *   <LicenseBanner />
 *   <main>...</main>
 *
 * FILE: resources/js/components/LicenseBanner.jsx
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, XCircle, ShieldOff, Phone } from 'lucide-react';
import apiClient from '../api/client'; // Make sure this import exists

const fetchLicenseStatus = () =>
    apiClient.get('/settings/license').then(r => r.data);

// const fetchLicenseStatus = () =>
//     axios.get('/api/v1/settings/license').then(r => r.data);

export default function LicenseBanner() {
    const { data, isLoading } = useQuery({
        queryKey:      ['license-status'],
        queryFn:       fetchLicenseStatus,
        refetchInterval: 15 * 60 * 1000, // re-check every 15 minutes
        staleTime:       10 * 60 * 1000,
        retry:           false,
    });
    console.log('LicenseBanner - data:', data);
    console.log('LicenseBanner - status:', data?.status);
    if (isLoading || !data) return null;

    // Valid - no banner
    if (data.status === 'valid') return null;

    const isRestricted = data.status === 'restricted';
    const isGrace      = data.status === 'grace';
    const isUnlicensed = data.status === 'unlicensed';

    const bg     = isRestricted ? '#FEF2F2' : '#FFFBEB';
    const border = isRestricted ? '#FECACA' : '#FDE68A';
    const text   = isRestricted ? '#991B1B' : '#92400E';
    const Icon   = isRestricted ? XCircle : isUnlicensed ? ShieldOff : AlertTriangle;
    const iconColor = isRestricted ? '#DC2626' : '#D97706';

    return (
        <div style={{
            background:    bg,
            borderBottom:  `2px solid ${border}`,
            padding:       '10px 24px',
            display:       'flex',
            alignItems:    'center',
            gap:           12,
            fontFamily:    'Arial, sans-serif',
            zIndex:        1000,
        }}>
            <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />

            <div style={{ flex: 1 }}>
                {isRestricted && (
                    <span style={{ color: text, fontWeight: 700, fontSize: 14 }}>
                        System Restricted - Write operations are disabled.{' '}
                        <span style={{ fontWeight: 400 }}>
                            You can still view data and export reports.
                        </span>
                    </span>
                )}

                {isGrace && (
                    <span style={{ color: text, fontSize: 14 }}>
                        <strong>License Grace Period:</strong>{' '}
                        {data.grace_days_remaining != null
                            ? `${data.grace_days_remaining} day${data.grace_days_remaining !== 1 ? 's' : ''} remaining.`
                            : 'Expires soon.'}{' '}
                        The system will enter restricted mode if this is not resolved.
                        {data.grace_ends_at && (
                            <span> Grace ends: <strong>{data.grace_ends_at}</strong>.</span>
                        )}
                    </span>
                )}

                {isUnlicensed && (
                    <span style={{ color: text, fontSize: 14 }}>
                        <strong>No license key configured.</strong>{' '}
                        This system is running without a valid license. Contact your vendor.
                    </span>
                )}
            </div>

            {data.vendor_contact && (
                <a
                    href={`mailto:${data.vendor_contact}`}
                    style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        6,
                        color:      text,
                        fontSize:   13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        padding:    '4px 12px',
                        border:     `1px solid ${border}`,
                        borderRadius: 6,
                        background: 'transparent',
                    }}
                >
                    <Phone size={13} />
                    Contact Vendor
                </a>
            )}
        </div>
    );
}