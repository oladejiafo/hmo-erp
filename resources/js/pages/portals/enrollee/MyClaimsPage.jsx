/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/MyClaimsPage.jsx
 * Member self-service: view personal claims history.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEnrolleePortalClaims } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { FileText, Search } from 'lucide-react';

const STATUS_MAP = {
    submitted:     ['Submitted',    '#fff3e0', '#e65100'],
    auto_validated:['Validated',    '#e8f0fe', '#1967d2'],
    under_review:  ['In Review',    '#fff8e1', '#f57f17'],
    approved:      ['Approved',     '#e6f4ea', '#137333'],
    paid:          ['Paid',         '#e8f0fe', '#0f4c81'],
    rejected:      ['Rejected',     '#fce8e6', '#c5221f'],
    flagged:       ['Flagged',      '#fce4d6', '#bf5b00'],
};

export default function MyClaimsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage]     = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-claims', search, status, page],
        queryFn:  () => fetchEnrolleePortalClaims({ search, status, page }),
        keepPreviousData: true,
    });

    const claims = data?.data ?? [];
    const meta   = data?.meta ?? {};

    return (
        <div>
            <div style={headerStyle}>
                <h1 style={titleStyle}>My Claims</h1>
                <p style={subtitleStyle}>All health claims made under your membership</p>
            </div>

            {/* Filters */}
            <div style={filtersContainerStyle}>
                <div style={searchContainerStyle}>
                    <Search size={14} style={searchIconStyle} />
                    <input 
                        value={search} 
                        onChange={e=>setSearch(e.target.value)} 
                        placeholder="Search by claim number or hospital…" 
                        style={{ ...inputStyle, paddingLeft: 28 }} 
                    />
                </div>
                <select value={status} onChange={e=>setStatus(e.target.value)} style={inputStyle}>
                    <option value="">All Status</option>
                    {Object.keys(STATUS_MAP).map(s => (
                        <option key={s} value={s}>{STATUS_MAP[s][0]}</option>
                    ))}
                </select>
            </div>

            {/* Claims list */}
            {isLoading ? (
                <div style={loadingStyle}>Loading claims…</div>
            ) : !claims.length ? (
                <div style={emptyStateStyle}>
                    <FileText size={40} color="#a0aec0" style={emptyStateIconStyle} />
                    <div style={emptyStateTextStyle}>No claims found</div>
                </div>
            ) : (
                <div style={claimsListStyle}>
                    {claims.map(c => (
                        <div key={c.id} style={claimCardStyle}>
                            <div style={claimHeaderStyle}>
                                <div>
                                    <div style={claimTitleStyle}>
                                        <span style={claimNumberStyle}>{c.claim_number}</span>
                                        <StatusBadge status={c.status} />
                                    </div>
                                    <div style={claimHcpStyle}>{c.hcp_name}</div>
                                    <div style={claimMetaStyle}>
                                        Service date: {formatDate(c.service_date)}
                                        {c.dependent_name && <span> · For: {c.dependent_name}</span>}
                                    </div>
                                    {c.diagnosis_description && (
                                        <div style={diagnosisStyle}>
                                            {c.diagnosis_description}
                                        </div>
                                    )}
                                </div>
                                <div style={claimAmountContainerStyle}>
                                    <div style={claimAmountLabelStyle}>Claimed</div>
                                    <div style={claimAmountStyle}>{formatCurrency(c.total_amount_claimed)}</div>
                                    {c.total_amount_paid && (
                                        <>
                                            <div style={paidLabelStyle}>Paid</div>
                                            <div style={paidAmountStyle}>{formatCurrency(c.total_amount_paid)}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Rejection reason */}
                            {c.rejection_reason && (
                                <div style={rejectionStyle}>
                                    <strong>Rejected:</strong> {c.rejection_reason}
                                </div>
                            )}

                            {/* Pre-auth indicator */}
                            {c.is_pre_authorized && (
                                <div style={preAuthStyle}>
                                    ✓ Pre-authorised (Code: <span style={preAuthCodeStyle}>{c.pre_auth_code}</span>)
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta.last_page > 1 && (
                <div style={paginationStyle}>
                    {Array.from({ length: meta.last_page }, (_,i)=>i+1).map(p => (
                        <button 
                            key={p} 
                            onClick={()=>setPage(p)} 
                            style={{
                                ...paginationButtonStyle,
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

// Style constants
const headerStyle = {
    marginBottom: 24,
};

const titleStyle = {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
};

const subtitleStyle = {
    color: '#718096',
    fontSize: 14,
    margin: '4px 0 0',
};

const filtersContainerStyle = {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 16,
    alignItems: 'center',
};

const searchContainerStyle = {
    position: 'relative',
    flex: '1 1 220px',
};

const searchIconStyle = {
    position: 'absolute',
    left: 9,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#a0aec0',
};

const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: '#f7fafc',
    minWidth: 120,
};

const loadingStyle = {
    textAlign: 'center',
    padding: 60,
    color: '#a0aec0',
};

const emptyStateStyle = {
    textAlign: 'center',
    padding: 60,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
};

const emptyStateIconStyle = {
    display: 'block',
    margin: '0 auto 12px',
};

const emptyStateTextStyle = {
    color: '#a0aec0',
    fontSize: 14,
};

const claimsListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
};

const claimCardStyle = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const claimHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
};

const claimTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
};

const claimNumberStyle = {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    color: '#0f4c81',
};

const badgeStyle = {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 600,
};

const claimHcpStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d3748',
};

const claimMetaStyle = {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
};

const diagnosisStyle = {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
    fontStyle: 'italic',
};

const claimAmountContainerStyle = {
    textAlign: 'right',
};

const claimAmountLabelStyle = {
    fontSize: 11,
    color: '#718096',
};

const claimAmountStyle = {
    fontSize: 18,
    fontWeight: 700,
    color: '#2d3748',
};

const paidLabelStyle = {
    fontSize: 11,
    color: '#718096',
    marginTop: 4,
};

const paidAmountStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#137333',
};

const rejectionStyle = {
    marginTop: 12,
    background: '#fce8e6',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: '#7b0000',
};

const preAuthStyle = {
    marginTop: 8,
    fontSize: 11,
    color: '#137333',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
};

const preAuthCodeStyle = {
    fontFamily: 'monospace',
};

const paginationStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
};

const paginationButtonStyle = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 13,
};