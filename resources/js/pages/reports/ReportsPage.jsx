import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    Download, Sparkles, TrendingDown, TrendingUp, AlertTriangle, Users, BarChart2,
    Calendar, Filter, DollarSign, Building2, FileText
} from 'lucide-react';

import {
    fetchClaimsAging, fetchClaimsByHCP, fetchCostByCorporate,
    fetchHighCostEnrollees, fetchBranchComparison, fetchDashboard,
    fetchClaimsByType, fetchHCPPerformance
} from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert, StatCard } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, compactCurrency } from '../../utils/format';
import client from '../../api/client';

const PALETTE = ['#1967d2','#137333','#b05e00','#c5221f','#5e35b1','#0277bd','#558b2f','#6d4c41'];

export default function ReportsPage() {
    const { isHQ, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('aging');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');
    const [showAISummary, setShowAISummary] = useState(false);

    const exportMutation = useMutation({
        mutationFn: (type) => client.post('/reports/export', {
            report_type: type,
            date_from:   dateFrom || undefined,
            date_to:     dateTo   || undefined,
        }),
        onSuccess: () => toast.success('Export queued. Download will start shortly.'),
        onError:   () => toast.error('Export failed.'),
    });

    // Fetch dashboard summary
    const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuery({
        queryKey: ['dashboard'],
        queryFn: fetchDashboard,
    });

    // Lazy-loaded report data
    const { data: agingD,  isLoading: agingL,  error: agingE }  = useQuery({ 
        queryKey:['r-aging', dateFrom, dateTo],  
        queryFn:()=>fetchClaimsAging({ date_from:dateFrom||undefined, date_to:dateTo||undefined }),    
        enabled:tab==='aging' 
    });
    
    const { data: hcpD,    isLoading: hcpL,    error: hcpE }    = useQuery({ 
        queryKey:['r-hcp', dateFrom, dateTo],    
        queryFn:()=>fetchClaimsByHCP({ date_from:dateFrom||undefined, date_to:dateTo||undefined }),    
        enabled:tab==='by_hcp' 
    });
    
    const { data: corpD,   isLoading: corpL,   error: corpE }   = useQuery({ 
        queryKey:['r-corp', dateFrom, dateTo],   
        queryFn:()=>fetchCostByCorporate({ date_from:dateFrom||undefined, date_to:dateTo||undefined }), 
        enabled:tab==='by_corp' 
    });
    
    const { data: highD,   isLoading: highL,   error: highE }   = useQuery({ 
        queryKey:['r-high'],   
        queryFn:fetchHighCostEnrollees,                                                               
        enabled:tab==='high' 
    });
    
    const { data: branchD, isLoading: branchL, error: branchE } = useQuery({ 
        queryKey:['r-branch'], 
        queryFn:fetchBranchComparison,                                                                
        enabled:tab==='branch'&&isHQ() 
    });

    if (dashboardLoading) return <LoadingSpinner />;
    if (dashboardError) return <ErrorAlert message={dashboardError.message} onRetry={() => window.location.reload()} />;

    const dashboardData = dashboard?.data || dashboard || {};

    // Tab configuration
    const tabs = [
        { key: 'aging',   label: 'Claims Aging',      icon: <TrendingDown size={13}/> },
        { key: 'by_hcp',  label: 'By HCP',            icon: <BarChart2 size={13}/> },
        { key: 'by_corp', label: 'By Corporate',       icon: <Users size={13}/> },
        { key: 'high',    label: 'High-Cost Members',  icon: <AlertTriangle size={13}/> },
        ...(isHQ() ? [{ key: 'branch', label: 'Branch Comparison', icon: <TrendingUp size={13}/> }] : []),
        { key: 'sla',     label: 'SLA Dashboard',      icon: null, link: '/reports/sla' },
        ...(hasPermission('reports.fraud_heatmap') ? [{ key: 'heatmap', label: 'Fraud Heatmap', icon: null, link: '/reports/fraud-heatmap' }] : []),
    ];

    const getCurrentReportData = () => {
        switch(tab) {
            case 'aging':
                return agingD?.data || [];
            case 'by_hcp':
                return hcpD?.data || [];
            case 'by_corp':
                return corpD?.data || [];
            case 'high':
                return highD?.data || [];
            case 'branch':
                return branchD?.data || [];
            default:
                return [];
        }
    };
    
    return (
        <div>
            <PageHeader
                title="Reports & Analytics"
                subtitle="Operational intelligence across claims, providers, corporates and branches"
                actions={
                    <div className="d-flex gap-2 align-items-center">
                        <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            placeholder="From" title="Date from" />
                        <span className="text-muted">—</span>
                        <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                            value={dateTo} onChange={e => setDateTo(e.target.value)}
                            placeholder="To" title="Date to" />
                        
                        {/* Export Button */}
                        <button
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                            onClick={() => exportMutation.mutate(tab)}
                            disabled={exportMutation.isPending}
                        >
                            <Download size={14} />
                            {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
                        </button>

                        {/* AI Summary Button */}
                        {hasPermission('ai.tools') && (
                            <button
                                className="btn btn-outline-info btn-sm d-flex align-items-center gap-1"
                                onClick={() => setShowAISummary(true)}
                                disabled={exportMutation.isPending}
                            >
                                <Sparkles size={14} />
                                AI Summary
                            </button>
                        )}
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <StatCard
                        title="Total Claims"
                        value={dashboardData.total_claims?.toLocaleString() || '0'}
                        subtitle="All time claims"
                        icon={FileText}
                        color="primary"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Total Paid"
                        value={formatCurrency(dashboardData.total_paid || 0)}
                        subtitle="Amount disbursed"
                        icon={DollarSign}
                        color="success"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Pending Claims"
                        value={dashboardData.pending_claims?.toLocaleString() || '0'}
                        subtitle="Awaiting processing"
                        icon={FileText}
                        color="warning"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Active HCPs"
                        value={dashboardData.active_hcps?.toLocaleString() || '0'}
                        subtitle="Healthcare providers"
                        icon={Building2}
                        color="info"
                        loading={dashboardLoading}
                    />
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                {/* Tab headers */}
                <div className="card-header bg-white border-0 pt-3">
                    <ul className="nav nav-tabs card-header-tabs" style={{ fontSize: 13 }}>
                        {tabs.map(t => (
                            <li key={t.key} className="nav-item">
                                <button
                                    className={`nav-link d-flex align-items-center gap-1 ${tab === t.key ? 'active' : ''}`}
                                    onClick={() => t.link ? navigate(t.link) : setTab(t.key)}
                                >
                                    {t.icon} {t.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card-body">
                    {/* Tab content - Claims Aging */}
                    {tab === 'aging' && (
                        agingL ? <ChartLoading /> :
                        agingE ? <ErrorAlert error={agingE} /> :
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold mb-0">Pending Claims by Age</h6>
                                <span className="text-muted" style={{ fontSize: 12 }}>
                                    Days since submission date
                                </span>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={(() => {
                                    const agingData = Array.isArray(agingD?.data) ? agingD.data : 
                                                      Array.isArray(agingD) ? agingD : 
                                                      [];
                                    return agingData;
                                })()} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(v, n) => n === 'count' ? [v, 'Claims'] : [formatCurrency(v), 'Total Value']}
                                        labelFormatter={l => `Age: ${l}`}
                                    />
                                    <Bar dataKey="count" fill="#1967d2" radius={[4,4,0,0]} name="count" />
                                </BarChart>
                            </ResponsiveContainer>
                            <ReportTable
                                cols={['Age Bucket','Count','Total Value','Avg Value','Oldest (days)']}
                                rows={(() => {
                                    const agingData = Array.isArray(agingD?.data) ? agingD.data : 
                                                      Array.isArray(agingD) ? agingD : 
                                                      [];
                                    return agingData.map(r => [
                                        r.bucket,
                                        <strong>{r.count}</strong>,
                                        formatCurrency(r.total_value),
                                        formatCurrency(r.avg_value),
                                        <span className={r.oldest_days > 30 ? 'text-danger fw-semibold' : ''}>{r.oldest_days ?? '—'}</span>,
                                    ]);
                                })()}
                            />
                        </div>
                    )}

                    {/* Tab content - By HCP */}
                    {tab === 'by_hcp' && (
                        hcpL ? <ChartLoading /> :
                        hcpE ? <ErrorAlert error={hcpE} /> :
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold mb-0">Claims by Health Care Provider</h6>
                                <span className="text-muted" style={{ fontSize: 12 }}>
                                    Top {(() => {
                                        const hcpData = Array.isArray(hcpD?.data) ? hcpD.data : 
                                                       Array.isArray(hcpD) ? hcpD : 
                                                       [];
                                        return Math.min(hcpData.length, 10);
                                    })()} providers by volume
                                </span>
                            </div>
                            {(() => {
                                const hcpData = Array.isArray(hcpD?.data) ? hcpD.data : 
                                                Array.isArray(hcpD) ? hcpD : 
                                                [];
                                
                                return hcpData.slice(0, 10).length > 0 && (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart
                                            data={hcpData.slice(0, 10).map(r => ({
                                                name: r.hcp_name?.split(' ').slice(0, 2).join(' ') || 'Unknown',
                                                claimed: r.total_claimed || 0,
                                                approved: r.total_approved || 0,
                                            }))}
                                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                            layout="vertical"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis type="number" tickFormatter={compactCurrency} tick={{ fontSize: 10 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                                            <Tooltip formatter={v => [formatCurrency(v)]} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Bar dataKey="claimed"  fill="#1967d2" name="Claimed"  radius={[0,4,4,0]} barSize={10} />
                                            <Bar dataKey="approved" fill="#137333" name="Approved" radius={[0,4,4,0]} barSize={10} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                );
                            })()}
                            <ReportTable
                                cols={['HCP','Type','Claims','Claimed','Approved','Rejected','Avg Risk']}
                                rows={(() => {
                                    const hcpData = Array.isArray(hcpD?.data) ? hcpD.data : 
                                                    Array.isArray(hcpD) ? hcpD : 
                                                    [];
                                    return hcpData.map(r => [
                                        r.hcp_name,
                                        <span className="text-capitalize">{r.type}</span>,
                                        <strong>{r.claim_count}</strong>,
                                        formatCurrency(r.total_claimed),
                                        formatCurrency(r.total_approved),
                                        <span className={r.rejected_count > 0 ? 'text-danger' : ''}>{r.rejected_count}</span>,
                                        <RiskBadge score={r.avg_risk_score} />,
                                    ]);
                                })()}
                            />
                        </div>
                    )}

                    {/* Tab content - By Corporate */}
                    {tab === 'by_corp' && (
                        corpL ? <ChartLoading /> :
                        corpE ? <ErrorAlert error={corpE} /> :
                        <div>
                            <div className="d-flex gap-4 mb-4 flex-wrap">
                                <div className="card border-0 shadow-sm flex-grow-1" style={{ minWidth: 260 }}>
                                    <div className="card-body p-3">
                                        <h6 className="fw-semibold mb-3" style={{ fontSize: 13 }}>Spend Distribution</h6>
                                        <PieChart width={280} height={200}>
                                            <Pie
                                                data={(() => {
                                                    const corpData = Array.isArray(corpD?.data) ? corpD.data : 
                                                                    Array.isArray(corpD) ? corpD : 
                                                                    [];
                                                    return corpData.slice(0, 6);
                                                })()}
                                                dataKey="total_claimed"
                                                nameKey="corporate_name"
                                                cx="50%" cy="50%"
                                                outerRadius={80}
                                                label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {(() => {
                                                    const corpData = Array.isArray(corpD?.data) ? corpD.data : 
                                                                    Array.isArray(corpD) ? corpD : 
                                                                    [];
                                                    return corpData.slice(0, 6).map((_, i) => (
                                                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                                    ));
                                                })()}
                                            </Pie>
                                            <Tooltip formatter={v => [formatCurrency(v), 'Total Claimed']} />
                                        </PieChart>
                                    </div>
                                </div>
                                <div className="flex-grow-1" style={{ minWidth: 260 }}>
                                    <ReportTable
                                        cols={['Corporate','Claims','Enrollees Used','Claimed','Paid','Avg Claim']}
                                        rows={(() => {
                                            const corpData = Array.isArray(corpD?.data) ? corpD.data : 
                                                            Array.isArray(corpD) ? corpD : 
                                                            [];
                                            return corpData.map(r => [
                                                <><span className="fw-semibold">{r.corporate_name}</span>{' '}
                                                <span className="font-monospace text-muted" style={{ fontSize: 10 }}>({r.corporate_code})</span></>,
                                                <strong>{r.claim_count}</strong>,
                                                r.unique_enrollees,
                                                formatCurrency(r.total_claimed),
                                                formatCurrency(r.total_paid),
                                                formatCurrency(r.avg_claim_value),
                                            ]);
                                        })()}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab content - High-Cost Members */}
                    {tab === 'high' && (
                        highL ? <ChartLoading /> :
                        highE ? <ErrorAlert error={highE} /> :
                        <div>
                            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3"
                                 style={{ fontSize: 12 }}>
                                <AlertTriangle size={14} />
                                <span>
                                    Threshold: <strong>{formatCurrency(highD?.threshold)}</strong> annual spend per member.
                                    Year: <strong>{highD?.year}</strong>.
                                    Members approaching or exceeding this limit require review.
                                </span>
                            </div>
                            <ReportTable
                                cols={['Member','Enrollee ID','Corporate','Plan','Claims','Total Claimed','Avg Risk']}
                                rows={(() => {
                                    const highData = Array.isArray(highD?.data) ? highD.data : 
                                                     Array.isArray(highD) ? highD : 
                                                     [];
                                    return highData.map(r => [
                                        r.enrollee_name,
                                        <span className="font-monospace" style={{ fontSize: 11 }}>{r.enrollee_id}</span>,
                                        r.corporate_name,
                                        r.plan_name,
                                        r.claim_count,
                                        <span className="fw-bold text-danger">{formatCurrency(r.total_claimed)}</span>,
                                        <RiskBadge score={r.avg_risk_score} />,
                                    ]);
                                })()}
                            />
                        </div>
                    )}

                    {/* Tab content - Branch Comparison */}
                    {tab === 'branch' && isHQ() && (
                        branchL ? <ChartLoading /> :
                        branchE ? <ErrorAlert error={branchE} /> :
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold mb-0">Branch Performance ({branchD?.year})</h6>
                            </div>
                            {(() => {
                                const branchData = Array.isArray(branchD?.data) ? branchD.data : 
                                                  Array.isArray(branchD) ? branchD : 
                                                  [];
                                return branchData.length > 0 && (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart
                                            data={branchData.map(r => ({
                                                name: r.code,
                                                claimed: r.total_claimed,
                                                paid: r.total_paid,
                                                claims: r.total_claims,
                                            }))}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tickFormatter={compactCurrency} tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={v => [formatCurrency(v)]} />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Bar dataKey="claimed" fill="#1967d2" name="Claimed"  radius={[4,4,0,0]} />
                                            <Bar dataKey="paid"    fill="#137333" name="Paid"     radius={[4,4,0,0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                );
                            })()}
                            <ReportTable
                                cols={['Branch','Corporates','Enrollees','Claims','Total Claimed','Total Paid','Avg Risk']}
                                rows={(() => {
                                    const branchData = Array.isArray(branchD?.data) ? branchD.data : 
                                                      Array.isArray(branchD) ? branchD : 
                                                      [];
                                    return branchData.map(r => [
                                        <><span className="fw-semibold">{r.name}</span>{' '}
                                        <span className="badge bg-secondary-subtle text-secondary font-monospace" style={{ fontSize: 10 }}>{r.code}</span></>,
                                        r.total_corporates,
                                        r.total_enrollees,
                                        <strong>{r.total_claims}</strong>,
                                        formatCurrency(r.total_claimed),
                                        formatCurrency(r.total_paid),
                                        <RiskBadge score={r.avg_risk_score} />,
                                    ]);
                                })()}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* AI Summary Modal */}
            {showAISummary && (
                <AISummaryModal
                    reportType={tab}
                    reportData={getCurrentReportData()}
                    onClose={() => setShowAISummary(false)}
                />
            )}
        </div>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────

function ChartLoading() {
    return (
        <div className="py-5 text-center">
            <LoadingSpinner />
            <div className="text-muted mt-2" style={{ fontSize: 12 }}>Generating report…</div>
        </div>
    );
}

function ReportTable({ cols, rows }) {
    if (!rows || !rows.length) {
        return <p className="text-muted text-center py-4 mt-3">No data available for the selected period.</p>;
    }
    return (
        <div className="table-responsive mt-4">
            <table className="table table-hover table-sm">
                <thead className="table-light">
                    <tr>
                        {cols.map((c, i) => (
                            <th key={i} className={i > 0 ? 'text-end' : ''} style={{ fontSize: 11, fontWeight: 600 }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri}>
                            {row.map((cell, ci) => (
                                <td key={ci} className={ci > 0 ? 'text-end' : ''} style={{ fontSize: 12 }}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RiskBadge({ score }) {
    if (score == null || score === 0) return <span className="text-muted">—</span>;
    const n = parseFloat(score).toFixed(1);
    const cls = n >= 70 ? 'bg-danger-subtle text-danger' : n >= 40 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success';
    return <span className={`badge ${cls}`} style={{ fontSize: 10 }}>{n}</span>;
}

// AI Summary Modal Component
function AISummaryModal({ reportType, reportData, onClose }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await fetch('/api/ai/summarize-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        report_type: reportType, 
                        report_data: reportData 
                    }),
                });
                const data = await response.json();
                setSummary(data);
            } catch (error) {
                console.error('Failed to get AI summary:', error);
                setSummary({
                    summary: 'Unable to generate AI summary at this time.',
                    bullets: ['Please try again later'],
                    key_metric: 'Service unavailable',
                    recommendation: 'Manual review recommended'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [reportType, reportData]);

    if (loading) {
        return (
            <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-body text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status" />
                            <p className="mb-0">AI is analyzing your report...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title d-flex align-items-center gap-2">
                            <Sparkles size={18} className="text-primary" />
                            AI Executive Summary - {reportType.replace(/-/g, ' ').replace(/_/g, ' ')}
                        </h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        {summary?.summary && (
                            <div className="mb-4">
                                <p className="mb-0" style={{ fontSize: 14, lineHeight: 1.6 }}>
                                    {summary.summary}
                                </p>
                            </div>
                        )}
                        
                        {summary?.bullets?.length > 0 && (
                            <div className="mb-4">
                                <h6 className="fw-bold mb-2">Key Insights</h6>
                                <ul className="mb-0">
                                    {summary.bullets.map((point, idx) => (
                                        <li key={idx} className="mb-1" style={{ fontSize: 13 }}>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        <div className="row g-3 mt-2">
                            {summary?.key_metric && (
                                <div className="col-md-6">
                                    <div className="bg-light p-3 rounded">
                                        <small className="text-muted d-block mb-1">Key Metric</small>
                                        <strong className="text-primary fs-5">{summary.key_metric}</strong>
                                    </div>
                                </div>
                            )}
                            
                            {summary?.recommendation && (
                                <div className="col-md-6">
                                    <div className="bg-light p-3 rounded">
                                        <small className="text-muted d-block mb-1">Recommendation</small>
                                        <strong className="text-success fs-5">{summary.recommendation}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}