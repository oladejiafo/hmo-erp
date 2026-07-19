/**
 * FILE LOCATION: resources/js/pages/dashboard/DashboardPage.jsx
 *
 * Enhanced dashboard - Phase 5
 * New additions vs original:
 *   - Loss Ratio KPI card (current month + YTD, risk-colour coded)
 *   - 6-month Loss Ratio Trend chart (area + bar combo)
 *   - Secondary KPI row: avg processing days, PA approval rate, capitation YTD, overdue invoices
 *   - Improved chart styling with risk-coloured bars
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Users, Building2, CreditCard,
    AlertTriangle, CheckCircle, Clock, TrendingUp,
    TrendingDown, Minus, Activity, Shield, Calendar, AlertCircle,
} from 'lucide-react';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend,
    ComposedChart,
} from 'recharts';
import { fetchDashboard } from '../../api/index';
import { StatCard, StatusBadge, ErrorAlert, LoadingSpinner, PageHeader } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

// ── Loss Ratio helpers ────────────────────────────────────────────────────────

const LOSS_RATIO_CONFIG = {
    excellent: { label: 'Excellent', color: '#059669', bg: '#ecfdf5', bar: '#bbf7d0' },
    healthy:   { label: 'Healthy',   color: '#0891b2', bg: '#ecfeff', bar: '#a5f3fc' },
    moderate:  { label: 'Moderate',  color: '#d97706', bg: '#fffbeb', bar: '#fde68a' },
    high:      { label: 'High Risk', color: '#dc2626', bg: '#fef2f2', bar: '#fecaca' },
    critical:  { label: 'Critical',  color: '#7f1d1d', bg: '#fff1f2', bar: '#fecdd3' },
};

function lossRatioConfig(riskLevel) {
    return LOSS_RATIO_CONFIG[riskLevel] ?? LOSS_RATIO_CONFIG.moderate;
}

function TrendIndicator({ change }) {
    if (change === null || change === undefined) return null;
    const abs = Math.abs(change).toFixed(1);
    if (change > 1)  return <span className="d-flex align-items-center gap-1" style={{ color: '#dc2626', fontSize: 11 }}><TrendingUp size={11} />+{abs}% vs last month</span>;
    if (change < -1) return <span className="d-flex align-items-center gap-1" style={{ color: '#059669', fontSize: 11 }}><TrendingDown size={11} />{abs}% vs last month</span>;
    return <span className="d-flex align-items-center gap-1" style={{ color: '#6b7280', fontSize: 11 }}><Minus size={11} />Stable vs last month</span>;
}

// Custom tooltip for loss ratio trend chart
function LossRatioTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const ratio = payload.find(p => p.dataKey === 'ratio')?.value ?? 0;
    const cfg   = lossRatioConfig(
        ratio < 60 ? 'excellent' : ratio < 75 ? 'healthy' : ratio < 85 ? 'moderate' : ratio < 95 ? 'high' : 'critical'
    );
    return (
        <div className="card border-0 shadow" style={{ borderRadius: 10, padding: '10px 14px', fontSize: 12, minWidth: 180 }}>
            <div className="fw-semibold mb-2">{label}</div>
            {payload.map(p => (
                <div key={p.dataKey} className="d-flex justify-content-between gap-3">
                    <span style={{ color: p.color }}>{p.name}</span>
                    <span className="fw-semibold">
                        {p.dataKey === 'ratio' ? `${p.value}%` : formatCurrency(p.value, false)}
                    </span>
                </div>
            ))}
            <div className="mt-2 pt-2 border-top d-flex align-items-center gap-1">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { user, isHQ } = useAuth();
    const navigate = useNavigate();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['dashboard'],
        queryFn:  fetchDashboard,
        refetchInterval: 60_000,
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const d = data?.data?.data ?? null;

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h >= 5  && h < 12) return '🌅 Good morning';
        if (h >= 12 && h < 17) return '☀️ Good afternoon';
        if (h >= 17 && h < 21) return '🌆 Good evening';
        return '🌙 Good night';
    };

    const lr     = d?.loss_ratio;
    const lrConf = lossRatioConfig(lr?.risk_level);
    const kpi    = d?.kpi_highlights;
    const trend  = d?.loss_ratio_trend ?? [];

    return (
        <div>
            <PageHeader
                title={`${getGreeting()}, ${user?.name?.split(' ')[0] ?? ''}`}
                subtitle={`${isHQ() ? 'HQ Overview' : (user?.branch?.name ?? '')} · ${new Date().toLocaleDateString('en-NG', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}`}
            />

            {/* ── Row 1: Primary KPI Cards ──────────────────────────────── */}
            <div className="row g-3 mb-3">
                <div className="col-sm-6 col-xl">
                    <StatCard title="Total Claims" value={d?.claims_summary?.total?.toLocaleString()}
                        subtitle={`${d?.claims_summary?.pending ?? 0} pending`}
                        icon={FileText} color="primary" loading={isLoading} />
                </div>
                <div className="col-sm-6 col-xl">
                    <StatCard title="Active Enrollees" value={d?.enrollee_summary?.active?.toLocaleString()}
                        subtitle={`${d?.enrollee_summary?.expired ?? 0} expired plans`}
                        icon={Users} color="success" loading={isLoading} />
                </div>
                <div className="col-sm-6 col-xl">
                    <StatCard title="Active HCPs" value={d?.hcp_summary?.active?.toLocaleString()}
                        subtitle={`${d?.hcp_summary?.pending ?? 0} pending accreditation`}
                        icon={Building2} color="info" loading={isLoading} />
                </div>
                <div className="col-sm-6 col-xl">
                    <StatCard title="Pending Payout" value={formatCurrency(d?.finance_summary?.total_pending_payout)}
                        subtitle={`${d?.finance_summary?.pending_batches ?? 0} batches awaiting approval`}
                        icon={CreditCard} color="warning" loading={isLoading} />
                </div>

                {/* Loss Ratio KPI - special card */}
                <div className="col-sm-6 col-xl">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-body py-3 px-4">
                            {isLoading ? <LoadingSpinner /> : (
                                <>
                                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Loss Ratio (YTD)</div>
                                    <div className="d-flex align-items-baseline gap-2 mt-1">
                                        <div style={{ fontSize: 26, fontWeight: 800, color: lrConf.color }}>
                                            {lr?.ytd != null ? `${lr.ytd}%` : '-'}
                                        </div>
                                        <span style={{
                                            padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                                            background: lrConf.bg, color: lrConf.color,
                                        }}>
                                            {lrConf.label}
                                        </span>
                                    </div>
                                    <div className="mt-1">
                                        <TrendIndicator change={lr?.change} />
                                    </div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                                        This month: {lr?.current_month != null ? `${lr.current_month}%` : '-'}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 2: Secondary KPI Highlights ──────────────────────── */}
            <div className="row g-3 mb-4">
                {[
                    {
                        icon: Clock, color: '#6366f1', bg: '#eef2ff',
                        label: 'Avg Processing Time',
                        value: kpi?.avg_processing_days != null ? `${kpi.avg_processing_days}d` : '-',
                        sub: 'from submission to paid',
                    },
                    {
                        icon: Shield, color: '#0891b2', bg: '#ecfeff',
                        label: 'Pre-Auth. Approval Rate',
                        value: kpi?.pa_approval_rate != null ? `${kpi.pa_approval_rate}%` : '-',
                        sub: `${kpi?.active_pa_count ?? 0} active requests`,
                    },
                    {
                        icon: Activity, color: '#059669', bg: '#ecfdf5',
                        label: 'Capitation YTD',
                        value: formatCurrency(kpi?.capitation_ytd, false),
                        sub: 'total capitation paid this year',
                    },
                    {
                        icon: AlertCircle,
                        color: (kpi?.overdue_invoices ?? 0) > 0 ? '#dc2626' : '#6b7280',
                        bg:   (kpi?.overdue_invoices ?? 0) > 0 ? '#fef2f2' : '#f9fafb',
                        label: 'Overdue Invoices',
                        value: kpi?.overdue_invoices ?? '-',
                        sub: 'corporate premiums past due',
                    },
                ].map(({ icon: Icon, color, bg, label, value, sub }) => (
                    <div key={label} className="col-sm-6 col-xl-3">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                            <div className="card-body py-3 px-4 d-flex align-items-center gap-3">
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: bg, flexShrink: 0,
                                }}>
                                    <Icon size={18} style={{ color }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.2 }}>{isLoading ? '…' : value}</div>
                                    <div style={{ fontSize: 10, color: '#6b7280' }}>{sub}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Row 3: Charts ─────────────────────────────────────────── */}
            <div className="row g-4 mb-4">
                {/* Claims This Month */}
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                            <h6 className="fw-bold mb-0">Claims This Month</h6>
                            <p className="text-muted mb-0" style={{ fontSize: 12 }}>Weekly volume · bar colour = risk level</p>
                        </div>
                        <div className="card-body">
                            {!d?.claims_this_month?.length ? (
                                <div className="text-center py-5 text-muted" style={{ fontSize: 13 }}>No claims data for this month</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <ComposedChart data={d.claims_this_month}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                        <Tooltip 
    formatter={(val, name) => {
        if (name === 'count') {
            return [val, 'Claims'];
        }
        // Safe number formatting
        const num = typeof val === 'number' ? val : parseFloat(val);
        return [isNaN(num) ? '-' : num.toFixed(1), 'Avg Risk'];
    }} 
/>
                                        <Bar yAxisId="left" dataKey="count" radius={[4, 4, 0, 0]}>
                                            {d.claims_this_month.map((entry, i) => (
                                                <Cell key={i} fill={
                                                    entry.avg_risk_score >= 70 ? '#dc2626'
                                                    : entry.avg_risk_score >= 40 ? '#f59e0b'
                                                    : '#1e3a5f'
                                                } />
                                            ))}
                                        </Bar>
                                        <Line yAxisId="right" type="monotone" dataKey="avg_risk_score"
                                              stroke="#e53e3e" dot={false} strokeWidth={2} name="Avg Risk" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pending Actions */}
                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                            <h6 className="fw-bold mb-0">Pending Actions</h6>
                        </div>
                        <div className="card-body">
                            {isLoading ? <LoadingSpinner /> : (
                                <div className="vstack gap-3">
                                    <PendingItem icon={Clock} iconClass="text-info" label="Awaiting Review"
                                        count={d?.pending_actions?.claims_awaiting_review ?? 0}
                                        onClick={() => navigate('/claims?status=auto_validated')} />
                                    <PendingItem icon={FileText} iconClass="text-warning" label="Under Review"
                                        count={d?.pending_actions?.claims_under_review ?? 0}
                                        onClick={() => navigate('/claims?status=under_review')} />
                                    <PendingItem icon={AlertTriangle} iconClass="text-danger" label="Supervisor Review"
                                        count={d?.pending_actions?.claims_supervisor ?? 0}
                                        onClick={() => navigate('/claims?status=supervisor_review')} />
                                    <PendingItem icon={CheckCircle} iconClass="text-success" label="Approved - Not Batched"
                                        count={d?.pending_actions?.claims_approved_not_batched ?? 0}
                                        onClick={() => navigate('/finance')}
                                        highlight={(d?.pending_actions?.claims_approved_not_batched ?? 0) > 0} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 4: Loss Ratio Trend ────────────────────────────────── */}
            {(isLoading || trend.length > 0) && (
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                    <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex align-items-center justify-content-between">
                        <div>
                            <h6 className="fw-bold mb-0">Loss Ratio Trend</h6>
                            <p className="text-muted mb-0" style={{ fontSize: 12 }}>6-month claims paid vs premiums collected</p>
                        </div>
                        <div className="d-flex gap-3" style={{ fontSize: 11, color: '#6b7280' }}>
                            {[
                                ['#1e3a5f', 'Premiums collected'],
                                ['#f59e0b', 'Claims paid'],
                                ['#dc2626', 'Loss ratio %'],
                            ].map(([c, l]) => (
                                <span key={l} className="d-flex align-items-center gap-1">
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />
                                    {l}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="card-body">
                        {isLoading ? <LoadingSpinner /> : (
                            <ResponsiveContainer width="100%" height={260}>
                                <ComposedChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="money" tick={{ fontSize: 11 }}
                                           tickFormatter={v => `₦${(v / 1_000_000).toFixed(0)}M`} />
                                    <YAxis yAxisId="ratio" orientation="right" domain={[0, 120]}
                                           tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                                    <Tooltip content={<LossRatioTooltip />} />
                                    <Bar yAxisId="money" dataKey="premiums_collected" name="Premiums"
                                         fill="#1e3a5f" opacity={0.8} radius={[3, 3, 0, 0]} />
                                    <Bar yAxisId="money" dataKey="claims_paid" name="Claims Paid"
                                         fill="#f59e0b" opacity={0.85} radius={[3, 3, 0, 0]} />
                                    <Line yAxisId="ratio" type="monotone" dataKey="ratio" name="Loss Ratio %"
                                          stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4, fill: '#dc2626' }}
                                          activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}

            {/* ── Row 5: Fraud Alerts ───────────────────────────────────── */}
            {(isLoading || (d?.fraud_alerts?.length ?? 0) > 0) && (
                <div className="card border-0 shadow-sm border-start border-danger border-4">
                    <div className="card-header bg-white border-0 pt-3 px-4 pb-0 d-flex justify-content-between align-items-center">
                        <h6 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                            <AlertTriangle size={16} /> High-Risk Claims Requiring Attention
                        </h6>
                        <button className="btn btn-sm btn-outline-danger"
                                onClick={() => navigate('/claims?high_risk=1')}>
                            View All
                        </button>
                    </div>
                    <div className="card-body">
                        {isLoading ? <LoadingSpinner /> : (
                            <div className="table-responsive">
                                <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ fontSize: 12 }}>Claim No.</th>
                                            <th style={{ fontSize: 12 }}>HCP</th>
                                            <th style={{ fontSize: 12 }}>Amount</th>
                                            <th style={{ fontSize: 12 }}>Risk Score</th>
                                            <th style={{ fontSize: 12 }}>Status</th>
                                            <th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(d?.fraud_alerts ?? []).map(claim => (
                                            <tr key={claim.id}>
                                                <td className="font-monospace" style={{ fontSize: 12 }}>{claim.claim_number}</td>
                                                <td style={{ fontSize: 12 }}>{claim.hcp?.name}</td>
                                                <td style={{ fontSize: 12 }}>{formatCurrency(claim.total_amount_claimed)}</td>
                                                <td><RiskScoreBadge score={claim.risk_score} /></td>
                                                <td>
                                                    <StatusBadge status={claim.status} color="warning"
                                                                 label={claim.status?.replace(/_/g, ' ')} />
                                                </td>
                                                <td>
                                                    <button className="btn btn-sm btn-outline-primary py-0"
                                                            style={{ fontSize: 11 }}
                                                            onClick={() => navigate(`/claims/${claim.id}`)}>
                                                        Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PendingItem({ icon: Icon, iconClass, label, count, onClick, highlight }) {
    return (
        <button
            className={`btn text-start d-flex align-items-center justify-content-between p-3 rounded-3 border ${
                highlight ? 'border-success bg-success-subtle' : 'border-light'
            }`}
            onClick={onClick}
        >
            <div className="d-flex align-items-center gap-2">
                <Icon size={16} className={iconClass} />
                <span style={{ fontSize: 13 }}>{label}</span>
            </div>
            <span className={`badge rounded-pill ${count > 0 ? 'bg-primary' : 'bg-secondary'}`}
                  style={{ fontSize: 12 }}>
                {count}
            </span>
        </button>
    );
}

function RiskScoreBadge({ score }) {
    const color = score >= 90 ? '#c5221f' : score >= 70 ? '#e65100' : '#137333';
    return (
        <span className="badge" style={{ background: `${color}20`, color, fontWeight: 700, fontSize: 11 }}>
            {score}/100
        </span>
    );
}