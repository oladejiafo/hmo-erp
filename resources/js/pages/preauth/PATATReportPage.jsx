/**
 * FILE LOCATION: resources/js/pages/preauth/PATATReportPage.jsx
 *
 * Pre-Auth TAT (Turnaround Time) Report.
 * Shows NHIA-required TAT metrics:
 *   - Average response time by urgency tier
 *   - % within TAT (pass/fail per NHIA standard)
 *   - Breach list with reviewer and delay duration
 *   - Daily trend of PA volume and response times
 *
 * Required for NHIA quarterly Quality Assurance Report.
 * Access requires: reports.branch permission
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Timer, CheckCircle, XCircle, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import { fetchPATATReport, exportPATATReport, fetchPARequests } from '../../api/index';
import { formatDateTime, formatDate } from '../../utils/format';
import { PageHeader, LoadingSpinner } from '../../components/ui/index';
import { toast } from 'react-toastify';

// NHIA TAT thresholds in minutes
const TAT_THRESHOLDS = {
    standard:  { warn: 15, limit: 30,  label: 'Standard PA' },
    urgent:    { warn: 30, limit: 60,  label: 'Urgent PA'   },
    emergency: { limit: 1440,          label: 'Emergency (Retro)' }, // 24 hrs
};

export default function PATATReportPage() {
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['pa-tat-stats', dateFrom, dateTo],
        queryFn:  () => fetchPATATReport({ date_from: dateFrom, date_to: dateTo }),
    });

    const { data: breachData } = useQuery({
        queryKey: ['pa-breaches', dateFrom, dateTo],
        queryFn:  () => fetchPARequests({ status: 'all', date_from: dateFrom, date_to: dateTo, overdue_only: 1, per_page: 50 }),
    });

    const stats   = statsData?.data ?? {};
    const breaches = breachData?.data ?? [];

    const exportCSV = () => {
        exportPATATReport({ date_from: dateFrom, date_to: dateTo })
            .then(res => {
                const url = URL.createObjectURL(res.data);
                const a   = document.createElement('a');
                a.href = url; a.download = `pa-tat-report-${dateFrom}-${dateTo}.csv`; a.click();
            }).catch(() => toast.error('Export failed.'));
    };

    return (
        <div>
            <PageHeader
                title="PA TAT Report"
                subtitle="Pre-authorisation turnaround time analysis · NHIA compliance"
                actions={
                    <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                            onClick={exportCSV}>
                        <Download size={14} /> Export CSV
                    </button>
                }
            />

            {/* Date filter */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3 d-flex gap-3 align-items-center flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                        <label className="form-label mb-0 fw-semibold" style={{ fontSize: 13 }}>From:</label>
                        <input type="date" className="form-control form-control-sm" value={dateFrom}
                               onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <label className="form-label mb-0 fw-semibold" style={{ fontSize: 13 }}>To:</label>
                        <input type="date" className="form-control form-control-sm" value={dateTo}
                               onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
                    </div>
                    {[
                        ['Last 7 days', 7], ['Last 30 days', 30], ['Last 90 days', 90],
                    ].map(([label, days]) => (
                        <button
                            key={label}
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                const d = new Date(); d.setDate(d.getDate() - days);
                                setDateFrom(d.toISOString().slice(0, 10));
                                setDateTo(new Date().toISOString().slice(0, 10));
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {statsLoading ? (
                <div className="d-flex justify-content-center py-5"><LoadingSpinner /></div>
            ) : (
                <>
                    {/* ── Overall compliance summary ── */}
                    <div className="row g-3 mb-4">
                        {[
                            {
                                label:    'Overall TAT Compliance',
                                value:    stats.overall_compliance != null ? `${stats.overall_compliance}%` : '—',
                                sub:      `${stats.total_within_tat ?? 0} / ${stats.total_resolved ?? 0} within threshold`,
                                icon:     CheckCircle,
                                color:    stats.overall_compliance >= 90 ? '#137333' : stats.overall_compliance >= 75 ? '#b45309' : '#c5221f',
                                bg:       stats.overall_compliance >= 90 ? '#e6f4ea' : stats.overall_compliance >= 75 ? '#fff8e1' : '#fce8e6',
                                threshold: 'NHIA target: ≥ 90%',
                            },
                            {
                                label:    'Avg Response — Standard',
                                value:    stats.avg_mins_standard != null ? formatMins(stats.avg_mins_standard) : '—',
                                sub:      'NHIA limit: 30 minutes',
                                icon:     Timer,
                                color:    (stats.avg_mins_standard ?? 0) <= 30 ? '#137333' : '#c5221f',
                                bg:       (stats.avg_mins_standard ?? 0) <= 30 ? '#e6f4ea' : '#fce8e6',
                            },
                            {
                                label:    'Avg Response — Urgent',
                                value:    stats.avg_mins_urgent != null ? formatMins(stats.avg_mins_urgent) : '—',
                                sub:      'NHIA limit: 60 minutes',
                                icon:     AlertTriangle,
                                color:    (stats.avg_mins_urgent ?? 0) <= 60 ? '#137333' : '#c5221f',
                                bg:       (stats.avg_mins_urgent ?? 0) <= 60 ? '#e6f4ea' : '#fce8e6',
                            },
                            {
                                label:    'Emergency Retro Reviews',
                                value:    stats.emergency_within_24h != null ? `${stats.emergency_within_24h}%` : '—',
                                sub:      'Reviewed within 24 hrs',
                                icon:     TrendingUp,
                                color:    '#0f4c81',
                                bg:       '#e8f0fe',
                            },
                            {
                                label:    'TAT Breaches (Period)',
                                value:    stats.breach_count ?? 0,
                                sub:      `${stats.breach_standard_count ?? 0} standard · ${stats.breach_urgent_count ?? 0} urgent`,
                                icon:     XCircle,
                                color:    (stats.breach_count ?? 0) === 0 ? '#137333' : '#c5221f',
                                bg:       (stats.breach_count ?? 0) === 0 ? '#e6f4ea' : '#fce8e6',
                            },
                        ].map(card => (
                            <div key={card.label} className="col-6 col-xl">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body py-3">
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <div className="rounded-2 d-flex align-items-center justify-content-center"
                                                 style={{ width: 32, height: 32, background: card.bg, flexShrink: 0 }}>
                                                <card.icon size={16} color={card.color} />
                                            </div>
                                            <div style={{ fontSize: 11, color: '#718096' }}>{card.label}</div>
                                        </div>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                                        <div style={{ fontSize: 11, color: '#a0aec0' }}>{card.sub}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Charts row ── */}
                    <div className="row g-4 mb-4">
                        {/* Daily PA volume + avg TAT trend */}
                        <div className="col-lg-8">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header bg-white border-bottom py-3">
                                    <h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>Daily PA Volume & Avg Response Time</h6>
                                </div>
                                <div className="card-body">
                                    {stats.daily_trend?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={stats.daily_trend} barCategoryGap="30%">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                                                <XAxis dataKey="date" tick={{ fontSize: 11 }}
                                                       tickFormatter={d => d?.slice(5)} />
                                                <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
                                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="m" />
                                                <Tooltip
                                                    formatter={(val, name) => [
                                                        name === 'avg_mins' ? formatMins(val) : val,
                                                        name === 'avg_mins' ? 'Avg Response' : 'PA Count',
                                                    ]}
                                                />
                                                <Legend />
                                                <Bar yAxisId="left"  dataKey="count"    name="PA Count"   fill="#e8f0fe" stroke="#1967d2" strokeWidth={1} />
                                                <Line yAxisId="right" type="monotone" dataKey="avg_mins" name="Avg TAT (min)" stroke="#c5221f" strokeWidth={2} dot={false} />
                                                <ReferenceLine yAxisId="right" y={30} stroke="#b45309" strokeDasharray="4 2"
                                                               label={{ value: '30m std', position: 'right', fontSize: 10 }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
                                            No trend data for selected period
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Compliance by urgency tier */}
                        <div className="col-lg-4">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header bg-white border-bottom py-3">
                                    <h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>Compliance by Urgency</h6>
                                </div>
                                <div className="card-body">
                                    {['standard', 'urgent', 'emergency'].map(urg => {
                                        const d   = stats[`${urg}_compliance`];
                                        const pct = d ?? 0;
                                        const threshold = TAT_THRESHOLDS[urg];
                                        const color = pct >= 90 ? '#137333' : pct >= 75 ? '#b45309' : '#c5221f';
                                        return (
                                            <div key={urg} className="mb-4">
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="fw-semibold" style={{ fontSize: 13 }}>
                                                        {threshold.label}
                                                    </span>
                                                    <span className="fw-bold" style={{ fontSize: 14, color }}>
                                                        {d != null ? `${pct}%` : '—'}
                                                    </span>
                                                </div>
                                                <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                                                    <div
                                                        className="progress-bar"
                                                        style={{ width: `${pct}%`, background: color, borderRadius: 4 }}
                                                    />
                                                </div>
                                                <div className="d-flex justify-content-between mt-1" style={{ fontSize: 10, color: '#a0aec0' }}>
                                                    <span>{stats[`${urg}_within`] ?? 0} within</span>
                                                    <span>Limit: {urg === 'emergency' ? '24h' : `${threshold.limit}m`}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="p-2 rounded-3 bg-light" style={{ fontSize: 11, color: '#718096' }}>
                                        NHIA target: ≥ 90% compliance across all tiers
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Breach list ── */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ fontSize: 14 }}>
                                <XCircle size={15} className="text-danger" />
                                TAT Breaches
                                {breaches.length > 0 && (
                                    <span className="badge bg-danger" style={{ fontSize: 10 }}>{breaches.length}</span>
                                )}
                            </h6>
                            <span style={{ fontSize: 11, color: '#718096' }}>
                                Cases that exceeded NHIA response limits
                            </span>
                        </div>
                        <div className="card-body p-0">
                            {!breaches.length ? (
                                <div className="text-center py-5">
                                    <CheckCircle size={36} color="#137333" style={{ display: 'block', margin: '0 auto 10px' }} />
                                    <div style={{ color: '#718096', fontSize: 14 }}>No TAT breaches in selected period</div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                {['PA Code', 'Enrollee', 'Urgency', 'Submitted', 'Response Time', 'TAT Limit', 'Overage', 'Reviewer'].map(h => (
                                                    <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#718096', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {breaches.map(req => {
                                                const mins    = req.response_minutes ?? minutesElapsedBetween(req.created_at, req.reviewed_at);
                                                const limit   = req.urgency === 'urgent' ? 60 : req.urgency === 'emergency' ? 1440 : 30;
                                                const over    = Math.max(0, mins - limit);
                                                return (
                                                    <tr key={req.id}>
                                                        <td style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#1967d2', padding: '10px 14px' }}>
                                                            {req.pa_code ?? 'N/A'}
                                                        </td>
                                                        <td style={{ fontSize: 13, padding: '10px 14px' }}>{req.enrollee_name}</td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <span style={{
                                                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                                                                background: req.urgency === 'urgent' ? '#fff3e0' : req.urgency === 'emergency' ? '#fce8e6' : '#e8f0fe',
                                                                color:      req.urgency === 'urgent' ? '#e65100' : req.urgency === 'emergency' ? '#c5221f' : '#1967d2',
                                                            }}>
                                                                {req.urgency}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: 11, color: '#718096', padding: '10px 14px' }}>
                                                            {formatDateTime(req.created_at)}
                                                        </td>
                                                        <td style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: '#c5221f', padding: '10px 14px' }}>
                                                            {formatMins(mins)}
                                                        </td>
                                                        <td style={{ fontSize: 12, color: '#718096', padding: '10px 14px' }}>
                                                            {req.urgency === 'emergency' ? '24h' : `${limit}m`}
                                                        </td>
                                                        <td style={{ fontSize: 12, fontWeight: 700, color: '#c5221f', padding: '10px 14px' }}>
                                                            +{formatMins(over)}
                                                        </td>
                                                        <td style={{ fontSize: 12, padding: '10px 14px' }}>
                                                            {req.reviewed_by_name ?? '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function formatMins(mins) {
    if (!mins && mins !== 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function minutesElapsedBetween(start, end) {
    if (!start || !end) return 0;
    return Math.floor((new Date(end) - new Date(start)) / 60000);
}