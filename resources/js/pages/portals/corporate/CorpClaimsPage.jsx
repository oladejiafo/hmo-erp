/**
 * FILE LOCATION: resources/js/pages/portal/corporate/CorpClaimsPage.jsx
 * Corporate self-service: view claims for all enrolled staff, filter, export.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCorpPortalClaims } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Search, Download, Filter, FileText } from 'lucide-react';
import client from '../../../api/client';
import { toast } from 'react-toastify';

const STATUS_MAP = {
    submitted:     ['Submitted',    '#fff3e0', '#e65100'],
    auto_validated:['Validated',    '#e8f0fe', '#1967d2'],
    under_review:  ['In Review',    '#fff8e1', '#f57f17'],
    approved:      ['Approved',     '#e6f4ea', '#137333'],
    paid:          ['Paid',         '#e8f0fe', '#0f4c81'],
    rejected:      ['Rejected',     '#fce8e6', '#c5221f'],
    flagged:       ['Flagged',      '#fce4d6', '#bf5b00'],
};

export default function CorpClaimsPage() {
    const [search,   setSearch]   = useState('');
    const [status,   setStatus]   = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');
    const [page,     setPage]     = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['corp-portal-claims', search, status, dateFrom, dateTo, page],
        queryFn:  () => fetchCorpPortalClaims({ search, status, date_from: dateFrom||undefined, date_to: dateTo||undefined, page }),
        keepPreviousData: true,
    });

    const claims  = data?.data    ?? [];
    const meta    = data?.meta    ?? {};
    const summary = data?.summary ?? {};

    const exportClaims = () => {
        client.post('/portal/corporate/claims/export', { search, status, date_from: dateFrom||undefined, date_to: dateTo||undefined }, { responseType: 'blob' })
            .then(res => {
                const url  = URL.createObjectURL(res.data);
                const link = document.createElement('a');
                link.href     = url;
                link.download = `claims-export-${new Date().toISOString().slice(0,10)}.csv`;
                link.click();
            })
            .catch(() => toast.error('Export failed.'));
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 }}>Claims</h1>
                <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
                    Health claims submitted by your enrolled staff
                </p>
            </div>

            {/* Summary */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
                <MiniStat label="Total Claims" value={(summary.total_count ?? 0).toLocaleString()} color="#0f4c81" />
                <MiniStat label="Total Claimed" value={formatCurrency(summary.total_claimed ?? 0, false)} color="#1a202c" />
                <MiniStat label="Total Paid" value={formatCurrency(summary.total_paid ?? 0, false)} color="#137333" />
                <MiniStat label="Pending Review" value={(summary.pending_count ?? 0).toLocaleString()} color="#b45309" />
            </div>

            {/* Filters */}
            <div style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'1px solid #e8ecf0', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ position:'relative', flex:'1 1 200px' }}>
                    <Search size={14} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#a0aec0' }} />
                    <input 
                        value={search} 
                        onChange={e=>setSearch(e.target.value)} 
                        placeholder="Search by name or claim number…" 
                        style={{ ...inputStyle, paddingLeft:28 }} 
                    />
                </div>
                <select value={status} onChange={e=>setStatus(e.target.value)} style={inputStyle}>
                    <option value="">All Status</option>
                    {Object.keys(STATUS_MAP).map(s => (
                        <option key={s} value={s}>{STATUS_MAP[s][0]}</option>
                    ))}
                </select>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inputStyle} title="From" />
                <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={inputStyle} title="To" />
                <button onClick={exportClaims} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#4a5568' }}>
                    <Download size={14} /> Export
                </button>
            </div>

            {/* Table */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8ecf0', overflow:'auto', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                    <thead>
                        <tr style={{ background:'#f7fafc', borderBottom:'1px solid #e8ecf0' }}>
                            {['Claim #', 'Employee', 'Service Date', 'HCP', 'Amount Claimed', 'Amount Paid', 'Status'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#a0aec0' }}>Loading…</td></tr>
                        ) : !claims.length ? (
                            <tr><td colSpan={7} style={{ textAlign:'center', padding:40 }}>
                                <FileText size={32} color="#a0aec0" style={{ display:'block', margin:'0 auto 8px' }} />
                                <div style={{ color:'#a0aec0', fontSize:13 }}>No claims found</div>
                            </td></tr>
                        ) : claims.map(c => (
                            <tr key={c.id} style={{ borderBottom:'1px solid #f0f4f8' }}
                                onMouseEnter={e=>e.currentTarget.style.background='#f7fafc'}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <td style={{ ...tdStyle, fontFamily:'monospace', fontSize:12, fontWeight:600 }}>{c.claim_number}</td>
                                <td style={tdStyle}>
                                    <div style={{ fontWeight:500 }}>{c.enrollee_name}</div>
                                    {c.dependent_name && <div style={{ fontSize:11, color:'#718096' }}>for: {c.dependent_name}</div>}
                                </td>
                                <td style={{ ...tdStyle, color:'#718096' }}>{formatDate(c.service_date)}</td>
                                <td style={{ ...tdStyle, fontSize:12 }}>{c.hcp_name ?? '—'}</td>
                                <td style={{ ...tdStyle, fontWeight:500 }}>{formatCurrency(c.total_amount_claimed)}</td>
                                <td style={{ ...tdStyle, color: c.total_amount_paid ? '#137333' : '#a0aec0', fontWeight: c.total_amount_paid ? 600 : 400 }}>
                                    {c.total_amount_paid ? formatCurrency(c.total_amount_paid) : '—'}
                                </td>
                                <td style={tdStyle}><StatusBadge status={c.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {meta.last_page > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:6, padding:16, borderTop:'1px solid #f0f4f8' }}>
                        {Array.from({ length: meta.last_page }, (_,i)=>i+1).map(p => (
                            <button 
                                key={p} 
                                onClick={()=>setPage(p)} 
                                style={{
                                    width:32, height:32, borderRadius:8, border:'1px solid',
                                    borderColor: p===page ? '#0f4c81' : '#e2e8f0',
                                    background: p===page ? '#0f4c81' : '#fff',
                                    color: p===page ? '#fff' : '#4a5568',
                                    cursor:'pointer', fontSize:13
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniStat({ label, value, color }) {
    return (
        <div style={{ background:'#fff', borderRadius:10, padding:'14px 16px', border:'1px solid #e8ecf0', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:11, color:'#718096', marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:700, color }}>{value}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ background:bg, color, fontSize:11, padding:'3px 8px', borderRadius:10, fontWeight:600 }}>{label}</span>;
}

// Style constants
const inputStyle = { padding:'8px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', background:'#f7fafc', minWidth:120 };
const thStyle    = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' };
const tdStyle    = { padding:'11px 14px', fontSize:13, color:'#2d3748', verticalAlign:'middle' };