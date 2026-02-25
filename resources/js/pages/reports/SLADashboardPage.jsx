/**
 * FILE LOCATION: resources/js/pages/reports/SLADashboardPage.jsx
 * ROUTE:         /reports/sla
 * PERMISSION:    reports.branch
 *
 * SLA monitoring dashboard — shows how well claims are being processed
 * against NHIS target turnaround times.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
    Clock, AlertTriangle, CheckCircle, TrendingDown,
    ChevronRight, RefreshCw, ShieldAlert,
} from 'lucide-react';
import {
    fetchSLADashboard, fetchOverdueClaims,
} from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatDate } from '../../utils/format';
import client from '../../api/client';

const CLAIM_TYPE_LABEL = {
    outpatient: 'Outpatient', inpatient: 'Inpatient', dental: 'Dental',
    optical: 'Optical', maternity: 'Maternity', emergency: 'Emergency',
    surgery: 'Surgery', laboratory: 'Laboratory', radiology: 'Radiology',
    drug_refill: 'Drug Refill',
};

const STATUS_COLOR = {
    submitted: '#6b7280', auto_validating: '#6b7280', auto_validated: '#2563eb',
    flagged: '#dc2626', under_review: '#d97706', supervisor_review: '#7c3aed',
    approved: '#059669', rejected: '#dc2626', paid: '#047857', reversed: '#374151',
};

export default function SLADashboardPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [filter, setFilter] = useState('breached');
    const [page, setPage] = useState(1);

    const { data: dash, isLoading: dashLoading, error: dashError, refetch } = useQuery({
        queryKey:  ['sla-dashboard'],
        queryFn:   fetchSLADashboard,
        staleTime: 60_000,
    });

    const { data: overdueData, isLoading: overdueLoading } = useQuery({
        queryKey:  ['overdue-claims', filter, page],
        queryFn:   () => fetchOverdueClaims({ filter, page, per_page: 20 }),
        keepPreviousData: true,
    });

    const scanMutation = useMutation({
        mutationFn: () => client.post('/reports/sla/breach-scan'),
        onSuccess:  (r) => {
            const n = r.data?.data?.newly_breached ?? 0;
            toast.success(n > 0 ? `${n} new breach(es) detected.` : 'No new breaches found.');
            qc.invalidateQueries({ queryKey: ['sla-dashboard'] });
            qc.invalidateQueries({ queryKey: ['overdue-claims'] });
        },
        onError: () => toast.error('Scan failed.'),
    });

    const d = dash?.data ?? {};

    if (dashError) return <ErrorAlert message="Failed to load SLA data." onRetry={refetch} />;

    return (
        <div>
            <PageHeader
                title="SLA Monitoring"
                subtitle="Claims processing turnaround vs NHIS regulatory targets"
                actions={
                    <button
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={() => scanMutation.mutate()}
                        disabled={scanMutation.isPending}
                    >
                        {scanMutation.isPending
                            ? <span className="spinner-border spinner-border-sm" />
                            : <RefreshCw size={13} />
                        }
                        Scan Breaches
                    </button>
                }
            />

            {/* KPI Cards */}
            {dashLoading ? <LoadingSpinner /> : (
                <div className="row g-3 mb-4">
                    {[
                        {
                            label:   'Open Claims',
                            value:   d.kpis?.total_open?.toLocaleString() ?? '—',
                            sub:     'Currently unresolved',
                            icon:    Clock,
                            color:   '#2563eb',
                            bg:      '#eff6ff',
                        },
                        {
                            label:   'SLA Breached',
                            value:   d.kpis?.breached?.toLocaleString() ?? '—',
                            sub:     'Past deadline, still open',
                            icon:    AlertTriangle,
                            color:   d.kpis?.breached > 0 ? '#dc2626' : '#059669',
                            bg:      d.kpis?.breached > 0 ? '#fef2f2' : '#f0fdf4',
                        },
                        {
                            label:   'At Risk (24h)',
                            value:   d.kpis?.at_risk_24h?.toLocaleString() ?? '—',
                            sub:     'Due within 24 hours',
                            icon:    ShieldAlert,
                            color:   '#d97706',
                            bg:      '#fffbeb',
                        },
                        {
                            label:   'Compliance Rate',
                            value:   d.kpis?.compliance_rate != null
                                ? `${d.kpis.compliance_rate}%`
                                : '—',
                            sub:     'Resolved within SLA this month',
                            icon:    CheckCircle,
                            color:   (d.kpis?.compliance_rate ?? 100) >= 90 ? '#059669' : '#dc2626',
                            bg:      (d.kpis?.compliance_rate ?? 100) >= 90 ? '#f0fdf4' : '#fef2f2',
                        },
                    ].map(card => (
                        <div key={card.label} className="col-md-3">
                            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                                <div className="card-body d-flex align-items-start gap-3" style={{ padding: '18px 20px' }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 10,
                                        background: card.bg, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <card.icon size={20} color={card.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {card.label}
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                                            {card.value}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6b7280' }}>{card.sub}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="row g-4 mb-4">
                {/* 12-week breach rate trend */}
                <div className="col-md-7">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-body">
                            <div className="fw-semibold mb-3" style={{ fontSize: 14 }}>
                                12-Week Breach Rate Trend
                            </div>
                            {dashLoading ? <LoadingSpinner /> : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={d.weekly_trend ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="breachGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="week" tick={{ fontSize: 11 }}
                                               tickFormatter={v => v ? new Date(v).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : ''} />
                                        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                                        <Tooltip
                                            formatter={(v) => [`${v}%`, 'Breach Rate']}
                                            labelFormatter={v => v ? new Date(v).toLocaleDateString('en-NG', { month: 'long', day: 'numeric' }) : ''} />
                                        <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="4 4"
                                                       label={{ value: '10% target', fontSize: 10, fill: '#f59e0b' }} />
                                        <Area type="monotone" dataKey="breach_rate"
                                              stroke="#dc2626" fill="url(#breachGrad)"
                                              strokeWidth={2} dot={{ r: 3 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* By claim type */}
                <div className="col-md-5">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-body">
                            <div className="fw-semibold mb-3" style={{ fontSize: 14 }}>
                                Breach Rate by Claim Type
                            </div>
                            {dashLoading ? <LoadingSpinner /> : (
                                <div style={{ overflowY: 'auto', maxHeight: 240 }}>
                                    {(d.by_type ?? []).map(row => (
                                        <div key={row.claim_type} className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>
                                                    {CLAIM_TYPE_LABEL[row.claim_type] ?? row.claim_type}
                                                    <span className="text-muted fw-normal ms-1" style={{ fontSize: 11 }}>
                                                        (SLA: {row.sla_days}d)
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 12 }}>
                                                    <span style={{ color: row.breached > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                                                        {row.breached}
                                                    </span>
                                                    <span className="text-muted"> / {row.total}</span>
                                                </div>
                                            </div>
                                            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 4 }}>
                                                <div style={{
                                                    height: 6, borderRadius: 4,
                                                    width: `${Math.min(row.breach_rate, 100)}%`,
                                                    background: row.breach_rate > 20 ? '#dc2626'
                                                              : row.breach_rate > 10 ? '#f59e0b'
                                                              : '#059669',
                                                    transition: 'width 0.5s ease',
                                                }} />
                                            </div>
                                            <div className="text-muted mt-1" style={{ fontSize: 10 }}>
                                                {row.breach_rate}% breach · avg {row.avg_age_days}d age
                                            </div>
                                        </div>
                                    ))}
                                    {(d.by_type ?? []).length === 0 && (
                                        <div className="text-center text-muted py-4" style={{ fontSize: 13 }}>
                                            No open claims
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Overdue Claims Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
                    <div className="fw-semibold" style={{ fontSize: 14 }}>Claims Detail</div>

                    <div className="btn-group btn-group-sm">
                        {[
                            { key: 'breached',  label: 'Breached' },
                            { key: 'at_risk',   label: 'At Risk' },
                            { key: 'all_open',  label: 'All Open' },
                        ].map(f => (
                            <button
                                key={f.key}
                                className={`btn ${filter === f.key ? 'btn-dark' : 'btn-outline-secondary'}`}
                                onClick={() => { setFilter(f.key); setPage(1); }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {overdueLoading ? (
                    <div className="card-body py-5"><LoadingSpinner /></div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>Claim</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>HCP</th>
                                        <th>Enrollee</th>
                                        <th className="text-end">Age</th>
                                        <th className="text-end">SLA Target</th>
                                        <th className="text-end">Days Over</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(overdueData?.data ?? []).map(c => (
                                        <tr key={c.id}
                                            onClick={() => navigate(`/claims/${c.id}`)}
                                            style={{ cursor: 'pointer' }}>
                                            <td className="ps-4">
                                                <span className="font-monospace fw-semibold" style={{ fontSize: 12, color: '#111' }}>
                                                    {c.claim_number}
                                                </span>
                                                {c.sla_breached && (
                                                    <span className="ms-2" style={{
                                                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                                                        borderRadius: 8, background: '#fef2f2', color: '#dc2626',
                                                    }}>
                                                        BREACHED
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                {CLAIM_TYPE_LABEL[c.claim_type] ?? c.claim_type}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                                    background: `${STATUS_COLOR[c.status] ?? '#6b7280'}18`,
                                                    color: STATUS_COLOR[c.status] ?? '#6b7280',
                                                }}>
                                                    {c.status?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{c.hcp_name ?? '—'}</td>
                                            <td style={{ fontSize: 12 }}>{c.enrollee_name ?? '—'}</td>
                                            <td className="text-end font-monospace">
                                                <span style={{ color: c.age_days > (c.sla_target ?? 7) ? '#dc2626' : '#374151', fontWeight: 600 }}>
                                                    {c.age_days}d
                                                </span>
                                            </td>
                                            <td className="text-end font-monospace" style={{ color: '#6b7280' }}>
                                                {c.sla_target}d
                                            </td>
                                            <td className="text-end">
                                                {c.sla_breached ? (
                                                    <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>
                                                        +{c.days_over_sla}d
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">—</span>
                                                )}
                                            </td>
                                            <td><ChevronRight size={14} className="text-muted" /></td>
                                        </tr>
                                    ))}
                                    {(overdueData?.data ?? []).length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center py-5 text-muted">
                                                {filter === 'breached' ? '✓ No breached claims — SLA is healthy.' : 'No claims match this filter.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {overdueData?.meta && overdueData.meta.last_page > 1 && (
                            <div className="card-body border-top py-2 d-flex align-items-center justify-content-between">
                                <span className="text-muted" style={{ fontSize: 12 }}>
                                    {overdueData.meta.total} total
                                </span>
                                <div className="btn-group btn-group-sm">
                                    <button className="btn btn-outline-secondary"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}>
                                        ‹ Prev
                                    </button>
                                    <button className="btn btn-outline-secondary" disabled>
                                        {page} / {overdueData.meta.last_page}
                                    </button>
                                    <button className="btn btn-outline-secondary"
                                            disabled={page >= overdueData.meta.last_page}
                                            onClick={() => setPage(p => p + 1)}>
                                        Next ›
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}