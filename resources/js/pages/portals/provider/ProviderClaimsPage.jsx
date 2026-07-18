/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderClaimsPage.jsx
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchProviderClaims } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { FileText, Search, Plus } from 'lucide-react';

const STATUS_MAP = {
    submitted:          ['Submitted',     '#fff3e0', '#e65100'],
    auto_validating:    ['Validating',    '#e8f0fe', '#1967d2'],
    auto_validated:     ['Validated',     '#e8f0fe', '#1967d2'],
    flagged:            ['Flagged',       '#fce4d6', '#bf5b00'],
    under_review:       ['In Review',     '#fff8e1', '#f57f17'],
    supervisor_review:  ['Supervisor Review', '#fff8e1', '#f57f17'],
    approved:           ['Approved',      '#e6f4ea', '#137333'],
    paid:               ['Paid',          '#e8f0fe', '#0f4c81'],
    rejected:           ['Rejected',      '#fce8e6', '#c5221f'],
    reversed:           ['Reversed',      '#f0f0f0', '#555'],
};

export default function ProviderClaimsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['provider-claims', search, status, page],
        queryFn: () => fetchProviderClaims({ search, status, page }),
        keepPreviousData: true,
    });

    const claims = data?.data ?? [];
    const meta = data?.meta ?? {};

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Claims</h1>
                    <p style={subtitleStyle}>Claims submitted by your facility</p>
                </div>
                <button onClick={() => navigate('/provider/claims/new')} style={newButtonStyle}>
                    <Plus size={14} /> New claim
                </button>
            </div>

            <div style={filtersRowStyle}>
                <div style={searchWrapStyle}>
                    <Search size={14} style={searchIconStyle} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by claim number or member…"
                        style={{ ...inputStyle, paddingLeft: 28 }}
                    />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                    <option value="">All Status</option>
                    {Object.keys(STATUS_MAP).map(s => (
                        <option key={s} value={s}>{STATUS_MAP[s][0]}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !claims.length ? (
                <div style={emptyStyle}>
                    <FileText size={40} color="#a0aec0" style={emptyIconStyle} />
                    <div style={emptyTextStyle}>No claims found</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {claims.map(c => (
                        <div key={c.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <div>
                                    <div style={titleRowStyle}>
                                        <span style={numberStyle}>{c.claim_number}</span>
                                        <StatusBadge status={c.status} />
                                    </div>
                                    <div style={enrolleeStyle}>
                                        {c.enrollee_name}{c.dependent_name && ` (${c.dependent_name})`}
                                    </div>
                                    <div style={metaStyle}>Service date: {formatDate(c.service_date)}</div>
                                </div>
                                <div style={amountBlockStyle}>
                                    <div style={amountLabelStyle}>Claimed</div>
                                    <div style={amountStyle}>{formatCurrency(c.total_amount_claimed)}</div>
                                    {c.total_amount_paid > 0 && (
                                        <>
                                            <div style={amountLabelStyle}>Paid</div>
                                            <div style={paidStyle}>{formatCurrency(c.total_amount_paid)}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {c.rejection_reason && (
                                <div style={rejectionStyle}><strong>Rejected:</strong> {c.rejection_reason}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {meta.last_page > 1 && (
                <div style={paginationStyle}>
                    {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            style={{
                                ...pageButtonStyle,
                                borderColor: p === page ? '#0f4c81' : '#e2e8f0',
                                background: p === page ? '#0f4c81' : '#fff',
                                color: p === page ? '#fff' : '#4a5568',
                            }}
                        >
                            {p}
                        </button>
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

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const newButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const filtersRowStyle = { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 };
const searchWrapStyle = { position: 'relative', flex: '1 1 220px' };
const searchIconStyle = { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' };
const inputStyle = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', minWidth: 120 };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '16px 20px' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 };
const titleRowStyle = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 };
const numberStyle = { fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0f4c81' };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600 };
const enrolleeStyle = { fontSize: 14, fontWeight: 600, color: '#2d3748' };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const amountBlockStyle = { textAlign: 'right' };
const amountLabelStyle = { fontSize: 11, color: '#718096' };
const amountStyle = { fontSize: 18, fontWeight: 700, color: '#2d3748' };
const paidStyle = { fontSize: 14, fontWeight: 600, color: '#137333' };
const rejectionStyle = { marginTop: 12, background: '#fce8e6', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#7b0000' };
const paginationStyle = { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 };
const pageButtonStyle = { width: 32, height: 32, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13 };
