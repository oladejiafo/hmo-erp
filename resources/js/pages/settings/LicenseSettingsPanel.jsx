/**
 * LicenseSettingsPanel — ERP Frontend
 *
 * Shows license status and emergency token input in the System Settings page.
 * Super-admin only. Mount inside SystemSettingsPage.jsx.
 *
 * USAGE in SystemSettingsPage.jsx:
 *   import LicenseSettingsPanel from './LicenseSettingsPanel';
 *   // Add at the bottom of the groups, before closing </div>:
 *   <LicenseSettingsPanel />
 *
 * FILE: resources/js/pages/settings/LicenseSettingsPanel.jsx
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    ShieldCheck, ShieldOff, AlertTriangle, RefreshCw,
    Key, Loader2, CheckCircle, Clock,
} from 'lucide-react';

const fetchLicenseStatus = () =>
    axios.get('/api/settings/license').then(r => r.data);

const applyEmergencyToken = (token) =>
    axios.post('/api/settings/license/emergency', { token }).then(r => r.data);

const forceCheckin = () =>
    axios.post('/api/settings/license/check-in').then(r => r.data);

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const cfg = {
        valid:       { bg: '#DCFCE7', text: '#166534', label: 'Active',      Icon: ShieldCheck },
        grace:       { bg: '#FEF9C3', text: '#854D0E', label: 'Grace Period', Icon: AlertTriangle },
        restricted:  { bg: '#FEE2E2', text: '#991B1B', label: 'Restricted',   Icon: ShieldOff },
        unlicensed:  { bg: '#F3F4F6', text: '#374151', label: 'Unlicensed',   Icon: ShieldOff },
    }[status] ?? { bg: '#F3F4F6', text: '#374151', label: status, Icon: ShieldOff };

    const { Icon } = cfg;

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: cfg.bg, color: cfg.text,
            fontSize: 13, fontWeight: 700,
        }}>
            <Icon size={14} />
            {cfg.label}
        </span>
    );
}

export default function LicenseSettingsPanel() {
    const qc = useQueryClient();
    const [emergencyToken, setEmergencyToken] = useState('');
    const [msg, setMsg] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['license-status'],
        queryFn:  fetchLicenseStatus,
        staleTime: 60 * 1000,
    });

    const emergencyMutation = useMutation({
        mutationFn: applyEmergencyToken,
        onSuccess: () => {
            setMsg({ type: 'success', text: 'Emergency token applied. Full access restored.' });
            setEmergencyToken('');
            qc.invalidateQueries({ queryKey: ['license-status'] });
        },
        onError: (err) => {
            setMsg({ type: 'error', text: err.response?.data?.message ?? 'Invalid token.' });
        },
    });

    const checkinMutation = useMutation({
        mutationFn: forceCheckin,
        onSuccess: (res) => {
            setMsg({ type: 'success', text: res.message });
            qc.invalidateQueries({ queryKey: ['license-status'] });
        },
        onError: () => {
            setMsg({ type: 'error', text: 'Check-in failed. Licensing server may be unreachable.' });
        },
    });

    if (isLoading) return null;

    const s = data ?? {};

    return (
        <div style={{
            border: '1px solid #E5E7EB', borderRadius: 10,
            overflow: 'hidden', marginBottom: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px', borderBottom: '1px solid #E5E7EB',
                background: '#FFFFFF',
            }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: '#0F4C8118', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Key size={18} color="#0F4C81" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>Software Licence</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                        License validation and access control
                    </div>
                </div>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Feedback message */}
                {msg && (
                    <div style={{
                        padding: '10px 16px', borderRadius: 8,
                        background: msg.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                        border: `1px solid ${msg.type === 'error' ? '#FECACA' : '#86EFAC'}`,
                        color: msg.type === 'error' ? '#991B1B' : '#166534',
                        fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <CheckCircle size={14} />
                        {msg.text}
                    </div>
                )}

                {/* Status grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16,
                }}>
                    {[
                        { label: 'Status',       value: <StatusBadge status={s.status} /> },
                        { label: 'Plan',         value: s.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : '—' },
                        { label: 'Client',       value: s.client_name ?? '—' },
                        { label: 'License Key',  value: <code style={{ fontSize: 12 }}>{s.license_key ?? '—'}</code> },
                        { label: 'Expires',      value: s.license_expires_at ?? 'Never (Lifetime)' },
                        { label: 'Last Check-in',value: s.last_successful_checkin
                            ? new Date(s.last_successful_checkin).toLocaleString()
                            : 'Never' },
                        { label: 'Failures',     value: s.consecutive_failures ?? 0 },
                        { label: 'Next Check-in',value: s.cache_valid_until
                            ? new Date(s.cache_valid_until).toLocaleString()
                            : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{
                            background: '#F8FAFC', borderRadius: 8, padding: '12px 16px',
                        }}>
                            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {label}
                            </div>
                            <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 600 }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grace period warning */}
                {s.is_grace && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 8,
                        background: '#FFFBEB', border: '1px solid #FDE68A',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <AlertTriangle size={16} color="#D97706" />
                        <span style={{ fontSize: 13, color: '#92400E' }}>
                            <strong>Grace Period Active:</strong> {s.grace_days_remaining} day{s.grace_days_remaining !== 1 ? 's' : ''} remaining until restricted mode.
                            Grace ends: <strong>{s.grace_ends_at}</strong>.
                        </span>
                    </div>
                )}

                {/* Emergency token active */}
                {s.emergency_token_active && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 8,
                        background: '#EFF6FF', border: '1px solid #BFDBFE',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <Clock size={16} color="#1D6DB5" />
                        <span style={{ fontSize: 13, color: '#1E293B' }}>
                            <strong>Emergency Token Active</strong> — expires {s.emergency_token_expires}.
                        </span>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => checkinMutation.mutate()}
                        disabled={checkinMutation.isPending}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px', borderRadius: 8,
                            background: '#0F4C81', color: '#FFF',
                            border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        {checkinMutation.isPending
                            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            : <RefreshCw size={14} />}
                        Force Check-in Now
                    </button>
                </div>

                {/* Emergency token input */}
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                        Emergency Offline Token
                    </label>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                        If the licensing server is unreachable and your vendor has issued an emergency token, paste it here.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={emergencyToken}
                            onChange={e => setEmergencyToken(e.target.value)}
                            placeholder="Paste emergency token here…"
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: 6,
                                border: '1px solid #D1D5DB', fontSize: 13,
                                fontFamily: 'monospace',
                            }}
                        />
                        <button
                            onClick={() => emergencyMutation.mutate(emergencyToken)}
                            disabled={!emergencyToken || emergencyMutation.isPending}
                            style={{
                                padding: '8px 16px', borderRadius: 6,
                                background: emergencyToken ? '#059669' : '#E5E7EB',
                                color: emergencyToken ? '#FFF' : '#9CA3AF',
                                border: 'none', fontSize: 13, fontWeight: 600,
                                cursor: emergencyToken ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {emergencyMutation.isPending ? <Loader2 size={14} /> : 'Apply'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}