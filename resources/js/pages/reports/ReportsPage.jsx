import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    Download, Sparkles, TrendingDown, TrendingUp, AlertTriangle, Users, BarChart2,
    Calendar, Filter, DollarSign, Building2, FileText, RefreshCw, Settings,
    CheckCircle2, Clock, Plus, ChevronDown,
} from 'lucide-react';

import {
    fetchClaimsAging, fetchClaimsByHCP, fetchCostByCorporate,
    fetchHighCostEnrollees, fetchBranchComparison, fetchDashboard,
    fetchClaimsByType, fetchHCPPerformance
} from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert, StatCard } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, compactCurrency, formatDateTime } from '../../utils/format';
import client from '../../api/client';

const PALETTE = ['#1967d2','#137333','#b05e00','#c5221f','#5e35b1','#0277bd','#558b2f','#6d4c41'];

// Report types for NHIA and automated reports
const REPORT_TYPES = [
    { key:'monthly_claims_returns',      label:'Monthly Claims Returns',      freq:'Monthly',   nhia:true,  icon:'📋' },
    { key:'capitation_payment_schedule', label:'Capitation Payment Schedule',  freq:'Monthly',   nhia:true,  icon:'💰' },
    { key:'quarterly_utilisation',       label:'Quarterly Utilisation Report', freq:'Quarterly', nhia:true,  icon:'📊' },
    { key:'ffs_claims_register',         label:'FFS Claims Register',          freq:'Monthly',   nhia:true,  icon:'🏥' },
    { key:'annual_report',               label:'Annual Report',                freq:'Annual',    nhia:true,  icon:'📅' },
    { key:'ffs_remittance_advice',       label:'FFS Remittance Advice (HCP)',  freq:'Per Batch', nhia:false, icon:'📨' },
    { key:'corporate_cost_report',       label:'Corporate Cost Report',        freq:'Monthly',   nhia:false, icon:'🏢' },
    { key:'ndpa_data_processing_register', label:'NDPA Data Processing Register', freq:'On demand', nhia:false, icon:'🔒' },
    { key:'ndpa_consent_audit',          label:'NDPA Consent Audit Log',       freq:'On demand', nhia:false, icon:'📝' },
];

const STATUS_STYLE = {
    queued:     { color:'#64748b', bg:'#f1f5f9', label:'Queued'     },
    generating: { color:'#1e40af', bg:'#dbeafe', label:'Generating' },
    ready:      { color:'#166534', bg:'#dcfce7', label:'Ready'      },
    failed:     { color:'#991b1b', bg:'#fee2e2', label:'Failed'     },
};

export default function ReportsPage() {
    const { isHQ, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('aging');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');
    const [showAISummary, setShowAISummary] = useState(false);
    const queryClient = useQueryClient();

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

    const dashboardData = dashboard?.data?.data || dashboard?.data || dashboard || {};

    // Tab configuration - includes both operational reports and NHIA reports
    const tabs = [
        { key: 'aging',   label: 'Claims Aging',      icon: <TrendingDown size={13}/> },
        { key: 'by_hcp',  label: 'By HCP',            icon: <BarChart2 size={13}/> },
        { key: 'by_corp', label: 'By Corporate',       icon: <Users size={13}/> },
        { key: 'high',    label: 'High-Cost Members',  icon: <AlertTriangle size={13}/> },
        ...(isHQ() ? [{ key: 'branch', label: 'Branch Comparison', icon: <TrendingUp size={13}/> }] : []),
        { key: 'generate', label: 'Generate Reports',   icon: <Plus size={13}/> },
        { key: 'history',  label: 'Report History',     icon: <FileText size={13}/> },
        { key: 'schedules',label: 'Auto-Schedule',      icon: <Settings size={13}/> },
        { key: 'sla',     label: 'SLA Dashboard',      icon: null, link: '/reports/sla' },
        ...(hasPermission('reports.fraud_heatmap') ? [{ key: 'heatmap', label: 'Fraud Heatmap', icon: null, link: '/reports/fraud-heatmap' }] : []),
    ];

    const getCurrentReportData = () => {
        switch(tab) {
            case 'aging':
                return agingD?.data?.data || [];
            case 'by_hcp':
                return hcpD?.data?.data || [];
            case 'by_corp':
                return corpD?.data?.data || [];
            case 'high':
                return highD?.data?.data || [];
            case 'branch':
                return branchD?.data?.data || [];
            default:
                return [];
        }
    };
    
    return (
        <div>
            <PageHeader
                title="Reports & Analytics"
                subtitle="Operational intelligence and NHIA regulatory returns"
                actions={
                    <div className="d-flex gap-2 align-items-center">
                        {(tab === 'aging' || tab === 'by_hcp' || tab === 'by_corp') && (
                            <>
                                <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                                    value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    placeholder="From" title="Date from" />
                                <span className="text-muted">-</span>
                                <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                                    value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    placeholder="To" title="Date to" />
                            </>
                        )}
                        
                        {/* Export Button */}
                        {(tab === 'aging' || tab === 'by_hcp' || tab === 'by_corp' || tab === 'high' || tab === 'branch') && (
                            <button
                                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                onClick={() => exportMutation.mutate(tab)}
                                disabled={exportMutation.isPending}
                            >
                                <Download size={14} />
                                {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
                            </button>
                        )}

                        {/* AI Summary Button */}
                        {hasPermission('ai.tools') && (tab === 'aging' || tab === 'by_hcp' || tab === 'by_corp' || tab === 'high') && (
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
                        value={dashboardData.claims_summary?.total?.toLocaleString() || '0'}
                        subtitle="All time claims"
                        icon={FileText}
                        color="primary"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Total Paid This Month"
                        value={formatCurrency(dashboardData.finance_summary?.total_paid_this_month || 0)}
                        subtitle="Amount disbursed"
                        icon={DollarSign}
                        color="success"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Pending Claims"
                        value={dashboardData.claims_summary?.pending?.toLocaleString() || '0'}
                        subtitle="Awaiting processing"
                        icon={FileText}
                        color="warning"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Active HCPs"
                        value={dashboardData.hcp_summary?.active?.toLocaleString() || '0'}
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
                    {/* Operational Report Tabs */}
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
                                    // const agingData = Array.isArray(agingD?.data) ? agingD.data : 
                                    //                   Array.isArray(agingD) ? agingD : 
                                    //                   [];
                                    const agingData = agingD?.data?.data ?? agingD?.data ?? [];
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
                                    // const agingData = Array.isArray(agingD?.data) ? agingD.data : 
                                    //                   Array.isArray(agingD) ? agingD : 
                                    //                   [];
                                    const agingData = agingD?.data?.data ?? agingD?.data ?? [];
                                    return agingData.map(r => [
                                        r.bucket,
                                        <strong>{r.count}</strong>,
                                        formatCurrency(r.total_value),
                                        formatCurrency(r.avg_value),
                                        <span className={r.oldest_days > 30 ? 'text-danger fw-semibold' : ''}>{r.oldest_days ?? '-'}</span>,
                                    ]);
                                })()}
                            />
                        </div>
                    )}

                    {tab === 'by_hcp' && (
                        hcpL ? <ChartLoading /> :
                        hcpE ? <ErrorAlert error={hcpE} /> :
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold mb-0">Claims by Health Care Provider</h6>
                                <span className="text-muted" style={{ fontSize: 12 }}>
                                    Top {(() => {
                                        // const hcpData = Array.isArray(hcpD?.data) ? hcpD.data : 
                                        //                Array.isArray(hcpD) ? hcpD : 
                                        //                [];
                                        const hcpData    = hcpD?.data?.data    ?? hcpD?.data    ?? [];
                                        return Math.min(hcpData.length, 10);
                                    })()} providers by volume
                                </span>
                            </div>
                            {(() => {
                                // const hcpData = Array.isArray(hcpD?.data) ? hcpD.data : 
                                //                 Array.isArray(hcpD) ? hcpD : 
                                //                 [];
                                const hcpData    = hcpD?.data?.data    ?? hcpD?.data    ?? [];
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
                                    // const hcpData = Array.isArray(hcpD?.data) ? hcpD.data : 
                                    //                 Array.isArray(hcpD) ? hcpD : 
                                    //                 [];
                                    const hcpData    = hcpD?.data?.data    ?? hcpD?.data    ?? [];

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
                                                    // const corpData = Array.isArray(corpD?.data) ? corpD.data : 
                                                    //                 Array.isArray(corpD) ? corpD : 
                                                    //                 [];
                                                    const corpData   = corpD?.data?.data   ?? corpD?.data   ?? [];
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
                                                    const corpData   = corpD?.data?.data   ?? corpD?.data   ?? [];
                                                    // const corpData = Array.isArray(corpD?.data) ? corpD.data : 
                                                    //                 Array.isArray(corpD) ? corpD : 
                                                    //                 [];
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
                                            const corpData   = corpD?.data?.data   ?? corpD?.data   ?? [];
                                            // const corpData = Array.isArray(corpD?.data) ? corpD.data : 
                                            //                 Array.isArray(corpD) ? corpD : 
                                            //                 [];
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

                    {tab === 'high' && (
                        highL ? <ChartLoading /> :
                        highE ? <ErrorAlert error={highE} /> :
                        <div>
                            <div className="alert alert-warning d-flex align-items-center gap-2 mb-3"
                                 style={{ fontSize: 12 }}>
                                <AlertTriangle size={14} />
                                <span>
                                    Threshold: <strong>{formatCurrency(highD?.data?.threshold ?? highD?.threshold)}</strong>
                                    Year: <strong>{highD?.data?.year ?? highD?.year}</strong>.
                                    Members approaching or exceeding this limit require review.
                                </span>
                            </div>
                            <ReportTable
                                cols={['Member','Enrollee ID','Corporate','Plan','Claims','Total Claimed','Avg Risk']}
                                rows={(() => {
                                    const highData   = highD?.data?.data   ?? highD?.data   ?? [];
                                    // const highData = Array.isArray(highD?.data) ? highD.data : 
                                    //                  Array.isArray(highD) ? highD : 
                                    //                  [];
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

                    {tab === 'branch' && isHQ() && (
                        branchL ? <ChartLoading /> :
                        branchE ? <ErrorAlert error={branchE} /> :
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold mb-0">Branch Performance ({branchD?.year})</h6>
                            </div>
                            {(() => {
                                const branchData = branchD?.data?.data ?? branchD?.data ?? [];
                                // const branchData = Array.isArray(branchD?.data) ? branchD.data : 
                                //                   Array.isArray(branchD) ? branchD : 
                                //                   [];
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
                                    const branchData = branchD?.data?.data ?? branchD?.data ?? [];
                                    // const branchData = Array.isArray(branchD?.data) ? branchD.data : 
                                    //                   Array.isArray(branchD) ? branchD : 
                                    //                   [];
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

                    {/* NHIA and Automated Reports Tabs */}
                    {tab === 'generate' && <GenerateTab queryClient={queryClient} />}
                    {tab === 'history' && <HistoryTab />}
                    {tab === 'schedules' && <SchedulesTab />}
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

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ queryClient }) {
    const [selected, setSelected] = useState(null);
    const [form, setForm]         = useState({ period:'', format:'xlsx', hcp_id:'', corporate_id:'', payment_batch_id:'', config:{} });

    const { data: hcpsData }      = useQuery({ queryKey:['hcps-mini'],      queryFn: () => client.get('/hcps',       { params:{per_page:200} }), staleTime:300_000 });
    const { data: corporatesData} = useQuery({ queryKey:['corporates-mini'], queryFn: () => client.get('/corporates', { params:{per_page:200} }), staleTime:300_000 });
    const { data: batchesData }   = useQuery({ queryKey:['batches-mini'],    queryFn: () => client.get('/finance/batches', { params:{status:'approved',per_page:50} }), staleTime:60_000, enabled: selected?.key === 'ffs_remittance_advice' });

    const hcps       = hcpsData?.data?.data       ?? hcpsData?.data       ?? [];
    const corporates = corporatesData?.data?.data  ?? corporatesData?.data  ?? [];
    const batches    = batchesData?.data?.data     ?? batchesData?.data    ?? [];

    const generateMutation = useMutation({
        mutationFn: (payload) => client.post('/reports/generate', payload),
        onSuccess: (res) => {
            toast.success('Report generated successfully.');
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            setSelected(null);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Generation failed.'),
    });

    const handleGenerate = () => {
        if (!selected || !form.period) return;
        generateMutation.mutate({
            report_type: selected.key,
            period:      form.period,
            format:      form.format,
            hcp_id:      form.hcp_id       || undefined,
            corporate_id:form.corporate_id  || undefined,
            payment_batch_id: form.payment_batch_id || undefined,
        });
    };

    // Period field type based on report frequency
    const getPeriodType = () => {
        if (!selected) return 'month';
        if (selected.freq === 'Annual') return 'year';
        if (selected.freq === 'Quarterly') return 'quarter-select';
        return 'month';
    };

    return (
        <div className="row">
            {/* Report type cards */}
            <div className="col-md-7">
                <div className="mb-3">
                    <p className="text-muted mb-3" style={{fontSize:13}}>
                        <span className="badge bg-primary-subtle text-primary me-1">NHIA</span> reports are submitted to the regulator.
                        Others are for HCPs and corporates.
                    </p>
                    <div className="row g-3">
                        {REPORT_TYPES.map(rt => (
                            <div key={rt.key} className="col-md-6">
                                <div
                                    className={`card border-2 h-100 ${selected?.key===rt.key?'border-primary bg-primary-subtle':'border-0 shadow-sm'}`}
                                    style={{cursor:'pointer',transition:'all .15s'}}
                                    onClick={() => { setSelected(rt); setForm(f=>({...f,period:'',hcp_id:'',corporate_id:'',payment_batch_id:''})); }}
                                >
                                    <div className="card-body py-3">
                                        <div className="d-flex align-items-start gap-2">
                                            <span style={{fontSize:22}}>{rt.icon}</span>
                                            <div>
                                                <div className="fw-semibold" style={{fontSize:13}}>{rt.label}</div>
                                                <div className="d-flex gap-1 mt-1">
                                                    <span className="badge bg-secondary-subtle text-secondary" style={{fontSize:10}}>{rt.freq}</span>
                                                    {rt.nhia && <span className="badge bg-primary-subtle text-primary" style={{fontSize:10}}>NHIA</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Config panel */}
            <div className="col-md-5">
                {selected ? (
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white fw-semibold" style={{fontSize:13}}>
                            {selected.icon} {selected.label}
                        </div>
                        <div className="card-body">
                            {/* Period */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{fontSize:13}}>Report Period *</label>
                                {getPeriodType() === 'year' ? (
                                    <input type="number" className="form-control" min={2020} max={new Date().getFullYear()}
                                           value={form.period} onChange={e => setForm(f=>({...f,period:e.target.value}))}
                                           placeholder="e.g. 2024" />
                                ) : getPeriodType() === 'quarter-select' ? (
                                    <select className="form-select" value={form.period} onChange={e => setForm(f=>({...f,period:e.target.value}))}>
                                        <option value="">Select quarter…</option>
                                        {[1,2,3,4].map(q => {
                                            const yr = new Date().getFullYear();
                                            return <option key={q} value={`${yr}-Q${q}`}>{yr} Q{q}</option>;
                                        })}
                                        {[1,2,3,4].map(q => {
                                            const yr = new Date().getFullYear()-1;
                                            return <option key={`p${q}`} value={`${yr}-Q${q}`}>{yr} Q{q}</option>;
                                        })}
                                    </select>
                                ) : (
                                    <input type="month" className="form-control"
                                           value={form.period} onChange={e => setForm(f=>({...f,period:e.target.value}))}
                                           max={new Date().toISOString().slice(0,7)} />
                                )}
                            </div>

                            {/* Format */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{fontSize:13}}>Output Format</label>
                                <div className="d-flex gap-2">
                                    {['xlsx','pdf','both'].map(f => (
                                        <button key={f} className={`btn btn-sm ${form.format===f?'btn-primary':'btn-outline-secondary'}`}
                                                onClick={() => setForm(prev=>({...prev,format:f}))}>
                                            {f.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* HCP selector (for FFS remittance) */}
                            {selected.key === 'ffs_remittance_advice' && (
                                <>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" style={{fontSize:13}}>HCP *</label>
                                        <select className="form-select" value={form.hcp_id} onChange={e => setForm(f=>({...f,hcp_id:e.target.value}))}>
                                            <option value="">Select HCP…</option>
                                            {hcps.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold" style={{fontSize:13}}>Payment Batch *</label>
                                        <select className="form-select" value={form.payment_batch_id} onChange={e => setForm(f=>({...f,payment_batch_id:e.target.value}))}>
                                            <option value="">Select batch…</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number} - ₦{Number(b.total_amount).toLocaleString()}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Corporate selector (for corporate cost report) */}
                            {selected.key === 'corporate_cost_report' && (
                                <div className="mb-3">
                                    <label className="form-label fw-semibold" style={{fontSize:13}}>Corporate *</label>
                                    <select className="form-select" value={form.corporate_id} onChange={e => setForm(f=>({...f,corporate_id:e.target.value}))}>
                                        <option value="">Select corporate…</option>
                                        {corporates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <button className="btn btn-primary w-100"
                                    disabled={!form.period || generateMutation.isPending ||
                                        (selected.key==='ffs_remittance_advice' && (!form.hcp_id||!form.payment_batch_id)) ||
                                        (selected.key==='corporate_cost_report' && !form.corporate_id)}
                                    onClick={handleGenerate}>
                                {generateMutation.isPending
                                    ? <><span className="spinner-border spinner-border-sm me-2"/>Generating…</>
                                    : <><RefreshCw size={14} className="me-1"/>Generate Report</>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card border-0 shadow-sm h-100 d-flex align-items-center justify-content-center">
                        <div className="text-center text-muted p-5">
                            <FileText size={40} className="mb-3 opacity-25" />
                            <p className="mb-0">Select a report type to configure and generate</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatus]   = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['reports', { typeFilter, statusFilter }],
        queryFn: () => client.get('/reports/generated', { params: { report_type: typeFilter||undefined, status: statusFilter||undefined } }),
        refetchInterval: 10_000,  // poll while any are generating
    });

    // const reports = data?.data?.data ?? data?.data ?? [];
    const reports = data?.data?.data?.data ?? data?.data?.data ?? data?.data ?? [];
    if (error) return <ErrorAlert error={error} onRetry={refetch}/>;

    return (
        <div>
            <div className="d-flex flex-wrap gap-2 mb-4 align-items-center">
                <select className="form-select form-select-sm" style={{maxWidth:220}} value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}>
                    <option value="">All Report Types</option>
                    {REPORT_TYPES.map(rt => <option key={rt.key} value={rt.key}>{rt.label}</option>)}
                </select>
                <select className="form-select form-select-sm" style={{maxWidth:140}} value={statusFilter}
                        onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="ready">Ready</option>
                    <option value="generating">Generating</option>
                    <option value="failed">Failed</option>
                </select>
                <button className="btn btn-sm btn-outline-secondary" onClick={refetch}><RefreshCw size={13}/></button>
            </div>

            {isLoading ? <div className="py-5 text-center"><LoadingSpinner /></div> : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3">Report</th>
                                    <th>Period</th>
                                    <th>For</th>
                                    <th>Generated</th>
                                    <th className="text-end">Amount</th>
                                    <th>Records</th>
                                    <th>Status</th>
                                    <th>Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center text-muted py-5">No reports generated yet.</td></tr>
                                ) : reports.map(r => {
                                    const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.queued;
                                    const rt = REPORT_TYPES.find(t => t.key === r.report_type);
                                    return (
                                        <tr key={r.id}>
                                            <td className="ps-3">
                                                <div className="fw-semibold">{rt?.icon} {r.type_label ?? rt?.label}</div>
                                                <div className="text-muted" style={{fontSize:11}}>
                                                    {r.generated_by ? `By ${r.generated_by?.name}` : 'Auto-scheduled'}
                                                </div>
                                            </td>
                                            <td className="font-monospace" style={{fontSize:12}}>{r.period}</td>
                                            <td style={{fontSize:12}}>
                                                {r.hcp?.name ?? r.corporate?.name ?? (rt?.nhia ? 'NHIA' : '-')}
                                            </td>
                                            <td style={{fontSize:12}}>{r.generated_at ? formatDateTime(r.generated_at) : '-'}</td>
                                            <td className="text-end font-monospace">
                                                {r.total_amount ? formatCurrency(r.total_amount) : '-'}
                                            </td>
                                            <td className="text-center">{r.record_count ?? '-'}</td>
                                            <td>
                                                <span className="badge" style={{background:ss.bg,color:ss.color,fontSize:10}}>
                                                    {r.status==='generating' && <span className="spinner-border spinner-border-sm me-1" style={{width:8,height:8}}/>}
                                                    {ss.label}
                                                </span>
                                                {r.error_message && (
                                                    <div className="text-danger" style={{fontSize:10,maxWidth:120}}>{r.error_message}</div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    {r.file_path_xlsx && (
                                                        <a href={`/api/v1/reports/${r.id}/download/xlsx`} className="btn btn-xs btn-outline-success py-0 px-1" style={{fontSize:10}} download>
                                                            <Download size={11} className="me-1"/>XLSX
                                                        </a>
                                                    )}
                                                    {r.file_path_pdf && (
                                                        <a href={`/api/v1/reports/${r.id}/download/pdf`} className="btn btn-xs btn-outline-danger py-0 px-1" style={{fontSize:10}} download>
                                                            <Download size={11} className="me-1"/>PDF
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Schedules Tab ─────────────────────────────────────────────────────────────
function SchedulesTab() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['report-schedules'],
        queryFn: () => client.get('/reports/schedules'),
    });

    const schedules  = data?.data?.data?.data ?? data?.data?.data ?? data?.data ?? [];

    const updateMutation = useMutation({
        mutationFn: ({ reportType, payload }) => client.put(`/reports/schedules/${reportType}`, payload),
        onSuccess: () => { toast.success('Schedule updated.'); qc.invalidateQueries({ queryKey:['report-schedules'] }); },
    });

    const nhiaReports = REPORT_TYPES.filter(rt => rt.nhia);

    return (
        <div>
            <div className="alert alert-info d-flex gap-2 mb-4" style={{fontSize:13}}>
                <Calendar size={15} className="flex-shrink-0 mt-1"/>
                <span>
                    Automated reports run via a daily cron job at 06:00. Each report fires on its configured day of the month.
                    Monthly reports use the <strong>previous</strong> month's data. Quarterly/Annual reports use the previous period.
                    Register the scheduler in <code>app/Console/Kernel.php</code>.
                </span>
            </div>

            {isLoading ? <LoadingSpinner /> : (
                <div className="card border-0 shadow-sm">
                    <div className="card-body p-0">
                        <table className="table align-middle mb-0" style={{fontSize:13}}>
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3">Report</th>
                                    <th>Frequency</th>
                                    <th>Trigger Day</th>
                                    <th>Format</th>
                                    <th>Last Run</th>
                                    <th>Next Run</th>
                                    <th>Enabled</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nhiaReports.map(rt => {
                                    const sched = schedules.find(s => s.report_type === rt.key) ?? { enabled:false, day_of_month:28, format:'xlsx' };
                                    return (
                                        <tr key={rt.key}>
                                            <td className="ps-3 fw-semibold">{rt.icon} {rt.label}</td>
                                            <td><span className="badge bg-secondary-subtle text-secondary">{rt.freq}</span></td>
                                            <td>
                                                <select className="form-select form-select-sm" style={{width:80}}
                                                        value={sched.day_of_month ?? 28}
                                                        onChange={e => updateMutation.mutate({ reportType:rt.key, payload:{day_of_month:+e.target.value} })}>
                                                    {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select className="form-select form-select-sm" style={{width:80}}
                                                        value={sched.format ?? 'xlsx'}
                                                        onChange={e => updateMutation.mutate({ reportType:rt.key, payload:{format:e.target.value} })}>
                                                    <option value="xlsx">XLSX</option>
                                                    <option value="pdf">PDF</option>
                                                    <option value="both">Both</option>
                                                </select>
                                            </td>
                                            <td className="text-muted" style={{fontSize:11}}>{sched.last_run_at ? new Date(sched.last_run_at).toLocaleDateString() : 'Never'}</td>
                                            <td className="text-muted" style={{fontSize:11}}>{sched.next_run_at ? new Date(sched.next_run_at).toLocaleDateString() : '-'}</td>
                                            <td>
                                                <div className="form-check form-switch mb-0">
                                                    <input className="form-check-input" type="checkbox"
                                                           checked={!!sched.enabled}
                                                           onChange={e => updateMutation.mutate({ reportType:rt.key, payload:{enabled:e.target.checked} })} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
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
    if (score == null || score === 0) return <span className="text-muted">-</span>;
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
                const response = await client.post('/ai/summarize-report', {
                    report_type: reportType,
                    report_data: reportData,
                });
                setSummary(response.data?.data ?? response.data);
                // const data = await response.json();
                // setSummary(data);
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