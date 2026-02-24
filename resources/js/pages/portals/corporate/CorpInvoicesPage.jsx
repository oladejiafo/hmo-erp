/**
 * FILE LOCATION: resources/js/pages/portal/corporate/CorpInvoicesPage.jsx
 * Corporate self-service: view invoices, see payment status, download PDF.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCorpPortalInvoices } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { CreditCard, Download, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';

export default function CorpInvoicesPage() {
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['corp-portal-invoices', statusFilter, page],
        queryFn:  () => fetchCorpPortalInvoices({ status: statusFilter, page }),
        keepPreviousData: true,
    });

    const invoices  = data?.data  ?? [];
    const meta      = data?.meta  ?? {};
    const summary   = data?.summary ?? {};

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 }}>Invoices</h1>
                <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>View and track your health plan invoices</p>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                <SummaryCard icon={CreditCard} color="#0f4c81" bg="#e8f0fe"
                    label="Total Billed (YTD)" value={formatCurrency(summary.total_billed ?? 0, false)} />
                <SummaryCard icon={CheckCircle} color="#137333" bg="#e6f4ea"
                    label="Total Paid" value={formatCurrency(summary.total_paid ?? 0, false)} />
                <SummaryCard icon={Clock} color="#b45309" bg="#fff3e0"
                    label="Outstanding" value={formatCurrency(summary.outstanding ?? 0, false)} />
                {(summary.overdue_count ?? 0) > 0 && (
                    <SummaryCard icon={AlertTriangle} color="#c5221f" bg="#fce8e6"
                        label="Overdue Invoices" value={`${summary.overdue_count} invoice(s)`} alert />
                )}
            </div>

            {/* Overdue warning */}
            {summary.overdue_count > 0 && (
                <div style={{
                    background: '#fff5f5', border: '1px solid #fca5a5',
                    borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <AlertTriangle size={18} color="#ef4444" />
                    <div>
                        <strong style={{ fontSize: 13, color: '#7b0000' }}>
                            You have {summary.overdue_count} overdue invoice(s).
                        </strong>
                        <div style={{ fontSize: 12, color: '#9b1c1c', marginTop: 2 }}>
                            Outstanding premium may suspend your staff's health coverage. Please pay immediately.
                        </div>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <Filter size={14} color="#718096" />
                {['', 'unpaid', 'paid', 'overdue'].map(s => (
                    <button key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        style={{
                            padding: '5px 14px', borderRadius: 20, border: '1px solid',
                            fontSize: 12, cursor: 'pointer', fontWeight: 500,
                            borderColor: statusFilter === s ? '#0f4c81' : '#e2e8f0',
                            background: statusFilter === s ? '#0f4c81' : '#fff',
                            color: statusFilter === s ? '#fff' : '#4a5568',
                        }}
                    >
                        {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {/* Invoices table */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8ecf0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                        <tr style={{ background:'#f7fafc', borderBottom:'1px solid #e8ecf0' }}>
                            {['Invoice #', 'Period', 'Issue Date', 'Due Date', 'Amount', 'Status', 'Action'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#a0aec0' }}>Loading…</td></tr>
                        ) : !invoices.length ? (
                            <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#a0aec0' }}>No invoices found</td></tr>
                        ) : invoices.map(inv => (
                            <tr key={inv.id} style={{ borderBottom:'1px solid #f0f4f8' }}
                                onMouseEnter={e=>e.currentTarget.style.background='#f7fafc'}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <td style={{ ...tdStyle, fontFamily:'monospace', fontWeight:600 }}>#{inv.invoice_number}</td>
                                <td style={tdStyle}>{inv.period_label ?? `${formatDate(inv.period_from)} – ${formatDate(inv.period_to)}`}</td>
                                <td style={{ ...tdStyle, color:'#718096' }}>{formatDate(inv.issue_date)}</td>
                                <td style={{ ...tdStyle, color: inv.is_overdue ? '#ef4444' : '#718096' }}>
                                    {formatDate(inv.due_date)}
                                    {inv.is_overdue && <span style={{ fontSize:10, marginLeft:4, color:'#ef4444', fontWeight:700 }}>OVERDUE</span>}
                                </td>
                                <td style={{ ...tdStyle, fontWeight:600 }}>{formatCurrency(inv.total_amount)}</td>
                                <td style={tdStyle}><InvoiceStatusBadge status={inv.status} overdue={inv.is_overdue} /></td>
                                <td style={tdStyle}>
                                    <a
                                        href={`/api/v1/corporates/invoices/${inv.id}/download`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'#0f4c81', textDecoration:'none', padding:'5px 10px', background:'#e8f0fe', borderRadius:6 }}
                                    >
                                        <Download size={12} /> PDF
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {meta.last_page > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:6, padding:16, borderTop:'1px solid #f0f4f8' }}>
                        {Array.from({ length: meta.last_page }, (_,i)=>i+1).map(p => (
                            <button key={p} onClick={()=>setPage(p)} style={{
                                width:32, height:32, borderRadius:8, border:'1px solid',
                                borderColor: p===page?'#0f4c81':'#e2e8f0',
                                background: p===page?'#0f4c81':'#fff',
                                color: p===page?'#fff':'#4a5568', cursor:'pointer', fontSize:13,
                            }}>{p}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, color, bg, label, value, alert }) {
    return (
        <div style={{ background:'#fff', borderRadius:12, padding:'16px 18px', border:`1px solid ${alert?'#fca5a5':'#e8ecf0'}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={18} color={color} />
                </div>
                <span style={{ fontSize:11, color:'#718096', fontWeight:500 }}>{label}</span>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color: alert ? '#c5221f' : '#1a202c' }}>{value}</div>
        </div>
    );
}

function InvoiceStatusBadge({ status, overdue }) {
    if (overdue) return <Pill label="OVERDUE" bg="#fce8e6" color="#c5221f" />;
    if (status === 'paid')   return <Pill label="PAID"    bg="#e6f4ea" color="#137333" />;
    return <Pill label="UNPAID" bg="#fff3e0" color="#b45309" />;
}

function Pill({ label, bg, color }) {
    return <span style={{ background:bg, color, fontSize:11, padding:'3px 8px', borderRadius:10, fontWeight:600 }}>{label}</span>;
}

// Style constants
const thStyle = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' };
const tdStyle = { padding:'12px 14px', fontSize:13, color:'#2d3748', verticalAlign:'middle' };