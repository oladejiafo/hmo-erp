/**
 * NEW FILE - resources/js/pages/portals/provider/ProviderPaymentsPage.jsx
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProviderPayments } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Wallet } from 'lucide-react';

const STATUS_MAP = {
    pending: ['Pending', '#fff3e0', '#e65100'],
    processed: ['Processed', '#e8f0fe', '#1967d2'],
    paid: ['Paid', '#e6f4ea', '#137333'],
    failed: ['Failed', '#fce8e6', '#c5221f'],
};

export default function ProviderPaymentsPage() {
    const [status, setStatus] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['provider-payments', status],
        queryFn: () => fetchProviderPayments({ status }),
    });

    const payments = data?.data ?? [];

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Payments</h1>
                    <p style={subtitleStyle}>Every disbursement made to your facility</p>
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                    <option value="">All Status</option>
                    {Object.keys(STATUS_MAP).map(s => <option key={s} value={s}>{STATUS_MAP[s][0]}</option>)}
                </select>
            </div>

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !payments.length ? (
                <div style={emptyStyle}>
                    <Wallet size={40} color="#a0aec0" style={emptyIconStyle} />
                    <div style={emptyTextStyle}>No payments yet</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {payments.map(p => (
                        <div key={p.id} style={rowStyle}>
                            <div>
                                <StatusBadge status={p.status} />
                                <span style={claimRefStyle}>{p.claim_number}</span>
                                <div style={metaStyle}>Batch {p.batch_number} · {p.payment_reference || 'No reference yet'}</div>
                            </div>
                            <div style={amountBlockStyle}>
                                <div style={amountStyle}>{formatCurrency(p.amount)}</div>
                                {p.paid_at && <div style={dateStyle}>{formatDate(p.paid_at)}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const inputStyle = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f7fafc' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '14px 18px' };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600, marginRight: 8 };
const claimRefStyle = { fontFamily: 'monospace', fontSize: 12, color: '#0f4c81' };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 4 };
const amountBlockStyle = { textAlign: 'right' };
const amountStyle = { fontSize: 16, fontWeight: 700, color: '#2d3748' };
const dateStyle = { fontSize: 11, color: '#a0aec0', marginTop: 2 };
