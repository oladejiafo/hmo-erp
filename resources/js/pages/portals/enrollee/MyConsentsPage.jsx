/**
 * NEW FILE — resources/js/pages/portals/enrollee/MyConsentsPage.jsx
 *
 * PHASE 6 — Compliance. Lets a member see and control what they've
 * consented to, per purpose, with a real history behind each toggle.
 * data_processing can't be revoked from here - see the backend's
 * updateConsent() for why - so its toggle renders as informational only.
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEnrolleeConsents, updateEnrolleeConsent } from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';

export default function MyConsentsPage() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-consents'],
        queryFn: fetchEnrolleeConsents,
    });

    const mutation = useMutation({
        mutationFn: ({ purpose, granted }) => updateEnrolleeConsent(purpose, granted),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrollee-consents'] }),
    });

    const consents = data?.data ?? [];

    return (
        <div style={pageStyle}>
            <div style={headerStyle}>
                <ShieldCheck size={22} color="#0f4c81" />
                <div>
                    <h1 style={titleStyle}>Privacy & Consent</h1>
                    <p style={subtitleStyle}>Control what you've agreed to share, and why</p>
                </div>
            </div>

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : (
                <div style={listStyle}>
                    {consents.map(c => (
                        <div key={c.purpose} style={cardStyle}>
                            <div style={cardTopStyle}>
                                <div style={{ flex: 1 }}>
                                    <div style={purposeNameStyle}>
                                        {c.purpose === 'data_processing' && <Lock size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                                        {formatPurposeName(c.purpose)}
                                    </div>
                                    <div style={descriptionStyle}>{c.description}</div>
                                </div>

                                {c.purpose === 'data_processing' ? (
                                    <span style={requiredBadgeStyle}>Required</span>
                                ) : (
                                    <Toggle
                                        checked={c.granted}
                                        onChange={(val) => mutation.mutate({ purpose: c.purpose, granted: val })}
                                        disabled={mutation.isPending && mutation.variables?.purpose === c.purpose}
                                    />
                                )}
                            </div>

                            <div style={statusRowStyle}>
                                {c.has_ever_decided ? (
                                    <span style={c.granted ? grantedTextStyle : revokedTextStyle}>
                                        {c.granted ? 'Granted' : 'Withdrawn'} · {formatDate(c.decided_at)}
                                    </span>
                                ) : (
                                    <span style={neverDecidedTextStyle}>Not yet decided</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={noteBoxStyle}>
                <AlertCircle size={14} color="#718096" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                    Data processing consent is required to use your HMO membership and can't be withdrawn here.
                    If you'd like to close your account entirely, contact support.
                </span>
            </div>
        </div>
    );
}

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: disabled ? 'default' : 'pointer',
                background: checked ? '#137333' : '#cbd5e0', position: 'relative', flexShrink: 0,
                opacity: disabled ? 0.6 : 1, transition: 'background 0.2s',
            }}
        >
            <span style={{
                position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
        </button>
    );
}

function formatPurposeName(purpose) {
    const names = {
        data_processing: 'Data Processing',
        marketing: 'Marketing Communications',
        employer_data_sharing: 'Employer Data Sharing',
        research_analytics: 'Research & Analytics',
    };
    return names[purpose] ?? purpose;
}

const pageStyle = { maxWidth: 640 };
const headerStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const loadingStyle = { textAlign: 'center', padding: 40, color: '#a0aec0' };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: '16px 20px' };
const cardTopStyle = { display: 'flex', alignItems: 'flex-start', gap: 16 };
const purposeNameStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
const descriptionStyle = { fontSize: 12, color: '#718096', marginTop: 4, lineHeight: 1.5 };
const requiredBadgeStyle = { fontSize: 10, fontWeight: 700, color: '#4a5568', background: '#f0f0f0', padding: '4px 10px', borderRadius: 10, flexShrink: 0 };
const statusRowStyle = { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f3f5' };
const grantedTextStyle = { fontSize: 11, color: '#137333', fontWeight: 600 };
const revokedTextStyle = { fontSize: 11, color: '#c5221f', fontWeight: 600 };
const neverDecidedTextStyle = { fontSize: 11, color: '#a0aec0' };
const noteBoxStyle = { display: 'flex', gap: 8, marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#718096', lineHeight: 1.5 };
