/**
 * NEW FILE — resources/js/pages/portals/corporate/CorpRenewalsPage.jsx
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchCorpRenewalStatus, corpPortalRequestRenewal } from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const STATUS_COPY = {
    ok: ['On track', '#137333', '#e6f4ea'],
    upcoming: ['Renewal approaching', '#e65100', '#fff3e0'],
    urgent: ['Renewal urgent', '#c5221f', '#fce8e6'],
    expired: ['Contract expired', '#c5221f', '#fce8e6'],
    unknown: ['No contract date on file', '#718096', '#f0f0f0'],
};

export default function CorpRenewalsPage() {
    const [notes, setNotes] = useState('');
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['corp-renewal-status'],
        queryFn: fetchCorpRenewalStatus,
    });

    const requestMutation = useMutation({
        mutationFn: () => corpPortalRequestRenewal(notes),
        onSuccess: (res) => {
            toast.success(res.message);
            setNotes('');
            qc.invalidateQueries({ queryKey: ['corp-renewal-status'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to submit renewal request.'),
    });

    const d = data?.data;
    if (isLoading) return <div style={loadingStyle}>Loading…</div>;
    if (!d) return <div style={loadingStyle}>No data available.</div>;

    const [statusLabel, statusColor, statusBg] = STATUS_COPY[d.status] ?? STATUS_COPY.unknown;

    return (
        <div>
            <h1 style={titleStyle}>Renewals</h1>
            <p style={subtitleStyle}>Contract and plan renewal status</p>

            <div style={{ ...statusCardStyle, background: statusBg }}>
                <RefreshCw size={20} color={statusColor} />
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: statusColor }}>{statusLabel}</div>
                    {d.contract_end_date && (
                        <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>
                            Contract ends {formatDate(d.contract_end_date)}
                            {d.days_to_renewal !== null && ` · ${d.days_to_renewal} day${d.days_to_renewal === 1 ? '' : 's'} remaining`}
                        </div>
                    )}
                </div>
            </div>

            <h2 style={sectionTitleStyle}>Your plans</h2>
            <div style={plansListStyle}>
                {d.plans.map(p => (
                    <div key={p.id} style={planRowStyle}>
                        <span style={{ fontWeight: 600 }}>{p.plan_name}</span>
                        <span style={{ color: '#718096', fontSize: 12 }}>
                            {p.effective_date ? formatDate(p.effective_date) : '—'} – {p.expiry_date ? formatDate(p.expiry_date) : 'ongoing'}
                        </span>
                    </div>
                ))}
            </div>

            <h2 style={sectionTitleStyle}>Request renewal</h2>
            {d.renewal_request_pending ? (
                <div style={pendingStyle}>
                    <CheckCircle size={16} color="#137333" />
                    Renewal request already submitted — ticket {d.renewal_ticket_number}. The HMO team will follow up.
                </div>
            ) : (
                <div style={requestCardStyle}>
                    {d.status === 'urgent' && (
                        <div style={urgentNoteStyle}>
                            <AlertTriangle size={14} /> Your contract renews soon — submitting a request now helps avoid a coverage gap.
                        </div>
                    )}
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Anything specific to discuss for renewal? (optional)"
                        rows={3}
                        style={textareaStyle}
                    />
                    <button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending} style={submitButtonStyle}>
                        {requestMutation.isPending ? 'Submitting…' : 'Request renewal'}
                    </button>
                </div>
            )}
        </div>
    );
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 20px' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const statusCardStyle = { display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12, padding: 16, marginBottom: 24 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 10, marginTop: 20 };
const plansListStyle = { display: 'flex', flexDirection: 'column', gap: 6 };
const planRowStyle = { display: 'flex', justifyContent: 'space-between', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 8, padding: '10px 14px', fontSize: 13 };
const pendingStyle = { display: 'flex', alignItems: 'center', gap: 8, background: '#e6f4ea', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#137333' };
const requestCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20 };
const urgentNoteStyle = { display: 'flex', alignItems: 'center', gap: 8, background: '#fff3e0', color: '#c55a11', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 12 };
const textareaStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' };
const submitButtonStyle = { marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
