import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
    AlertTriangle, ChevronUp, ChevronDown, Search, Filter,ArrowLeft
} from 'lucide-react';
import { fetchFraudHeatmap } from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

const FLAG_LABELS = {
    duplicate_claim:        'Duplicate Claim',
    tariff_mismatch:        'Tariff Mismatch',
    expired_plan:           'Expired Plan',
    over_benefit_limit:     'Over Benefit Limit',
    frequency_anomaly:      'Frequency Anomaly',
    cost_spike:             'Cost Spike',
    pattern_deviation:      'Pattern Deviation',
    provider_blacklisted:   'Provider Blacklisted',
    invalid_diagnosis_code: 'Invalid Diagnosis',
    pre_auth_missing:       'PA Missing',
};

function riskLevel(avgScore) {
    if (avgScore >= 70) return { label: 'High',   color: '#dc2626', bg: '#fef2f2' };
    if (avgScore >= 40) return { label: 'Medium', color: '#d97706', bg: '#fffbeb' };
    return                     { label: 'Low',    color: '#059669', bg: '#f0fdf4' };
}

export default function FraudHeatmapPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ date_from: '', date_to: '', flag_type: '' });
    const [applied, setApplied] = useState({});
    const [sortBy, setSortBy]   = useState('total_flags');
    const [sortDir, setSortDir] = useState('desc');
    const [search, setSearch]   = useState('');

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey:  ['fraud-heatmap', applied],
        queryFn:   () => fetchFraudHeatmap(applied),
        staleTime: 120_000,
        enabled:   !!user,
        retry:     1,
    });

    if (authLoading) return <LoadingSpinner />;
    if (error?.response?.status === 401) {
        return <ErrorAlert message="Your session has expired. Please log in again." />;
    }

    // Safely extract data array from various possible response shapes
    const rawData = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data))                        return data;
        if (data.data && Array.isArray(data.data))      return data.data;
        if (data.heatmap && Array.isArray(data.heatmap)) return data.heatmap;
        if (typeof data === 'object' && data !== null) {
            const vals = Object.values(data);
            if (vals.length > 0 && Array.isArray(vals[0])) return vals[0];
        }
        return [];
    }, [data]);

    // Group flat rows (one per flag_type per HCP) into per-HCP objects
    const hcps = useMemo(() => {
        if (!rawData.length) return [];

        const map = {};
        for (const row of rawData) {
            if (!row || !row.hcp_id) continue;

            if (!map[row.hcp_id]) {
                map[row.hcp_id] = {
                    hcp_id:       row.hcp_id,
                    hcp_name:     row.hcp_name  || 'Unknown',
                    hcp_code:     row.hcp_code  || '',
                    state:        row.state     || '',
                    city:         row.city      || '',
                    total_flags:  0,
                    avg_score:    0,
                    total_at_risk:0,
                    flag_types:   {},
                };
            }
            const h = map[row.hcp_id];
            h.total_flags    += +(row.flag_count  || 0);
            h.total_at_risk  += +(row.total_at_risk || 0);
            h.avg_score       = Math.max(h.avg_score, +(row.avg_score || 0));
            if (row.flag_type) h.flag_types[row.flag_type] = +(row.flag_count || 0);
        }

        return Object.values(map);
    }, [rawData]);

    const allFlagTypes = useMemo(() =>
        [...new Set(rawData.map(r => r.flag_type).filter(Boolean))],
        [rawData]);

    const displayed = useMemo(() => {
        let rows = hcps;
        if (search) {
            const s = search.toLowerCase();
            rows = rows.filter(h =>
                (h.hcp_name?.toLowerCase() || '').includes(s) ||
                (h.hcp_code?.toLowerCase() || '').includes(s) ||
                (h.state?.toLowerCase()    || '').includes(s));
        }
        return [...rows].sort((a, b) => {
            const va = a[sortBy] ?? 0;
            const vb = b[sortBy] ?? 0;
            return sortDir === 'desc' ? vb - va : va - vb;
        });
    }, [hcps, search, sortBy, sortDir]);

    const chartData = useMemo(() =>
        [...hcps]
            .sort((a, b) => b.total_flags - a.total_flags)
            .slice(0, 10)
            .map(h => ({
                name:  h.hcp_name ? h.hcp_name.split(' ').slice(0, 2).join(' ') : 'Unknown',
                flags: h.total_flags,
                score: h.avg_score,
            })),
        [hcps]);

    const totalFlags    = hcps.reduce((s, h) => s + (h.total_flags   || 0), 0);
    const totalAtRisk   = hcps.reduce((s, h) => s + (h.total_at_risk || 0), 0);
    const highRiskCount = hcps.filter(h => (h.avg_score || 0) >= 70).length;

    const sortToggle = (col) => {
        if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const SortIcon = ({ col }) => sortBy !== col ? null
        : sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;

    if (isError) return <ErrorAlert message="Failed to load fraud heatmap." onRetry={refetch} />;

    return (
        <div>
            <PageHeader
                title="Fraud Heatmap"
                subtitle="HCP-level fraud flag analysis — identify patterns and high-risk providers"
            />
            {/* Back to Reports Button */}
            <div className="d-flex align-items-center gap-2 mb-3">
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate('/reports')}
                >
                    <ArrowLeft size={14} />
                    Back to Reports
                </button>
            </div>
            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body py-3">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>Date From</label>
                            <input type="date" className="form-control form-control-sm"
                                   value={filters.date_from}
                                   onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>Date To</label>
                            <input type="date" className="form-control form-control-sm"
                                   value={filters.date_to}
                                   onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>Flag Type</label>
                            <select className="form-select form-select-sm"
                                    value={filters.flag_type}
                                    onChange={e => setFilters(p => ({ ...p, flag_type: e.target.value }))}>
                                <option value="">All Types</option>
                                {Object.entries(FLAG_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <button className="btn btn-primary btn-sm w-100"
                                    onClick={() => setApplied({ ...filters })}>
                                <Filter size={13} className="me-1" /> Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? <LoadingSpinner /> : (
                <>
                    {/* Summary KPIs */}
                    {hcps.length > 0 && (
                        <div className="row g-3 mb-4">
                            {[
                                { label: 'HCPs Flagged',   value: hcps.length,                      color: '#374151', bg: '#f9fafb' },
                                { label: 'Total Flags',    value: totalFlags.toLocaleString(),        color: '#dc2626', bg: '#fef2f2' },
                                { label: 'High-Risk HCPs', value: highRiskCount,                     color: '#d97706', bg: '#fffbeb' },
                                { label: 'Total at Risk',  value: formatCurrency(totalAtRisk, false), color: '#2563eb', bg: '#eff6ff' },
                            ].map(c => (
                                <div key={c.label} className="col-md-3">
                                    <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                                        <div className="card-body py-3 px-4">
                                            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bar chart: top 10 by flag count */}
                    {chartData.length > 0 && (
                        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                            <div className="card-body">
                                <div className="fw-semibold mb-3" style={{ fontSize: 14 }}>Top 10 HCPs by Flag Count</div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip formatter={(v, n) => [v, n === 'flags' ? 'Flags' : 'Avg Score']} />
                                        <Bar dataKey="flags" name="flags" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i}
                                                      fill={entry.score >= 70 ? '#dc2626' : entry.score >= 40 ? '#f59e0b' : '#2563eb'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="d-flex gap-4 justify-content-center mt-2" style={{ fontSize: 11, color: '#6b7280' }}>
                                    {[['#dc2626', 'High risk (≥70)'], ['#f59e0b', 'Medium risk (40–69)'], ['#2563eb', 'Low risk (<40)']].map(([c, l]) => (
                                        <span key={l} className="d-flex align-items-center gap-1">
                                            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                                            {l}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main HCP table */}
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-3">
                            <div className="fw-semibold" style={{ fontSize: 14 }}>Provider Detail</div>
                            <div className="ms-auto" style={{ width: 220 }}>
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text"><Search size={12} /></span>
                                    <input type="text" className="form-control" placeholder="Search HCP…"
                                           value={search} onChange={e => setSearch(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {displayed.length === 0 ? (
                            <div className="card-body text-center py-5 text-muted">
                                <AlertTriangle size={36} className="mb-3 opacity-25" />
                                No fraud flags found for the selected filters.
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: 12 }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>HCP</th>
                                            <th style={{ fontWeight: 600, color: '#374151' }}>Location</th>
                                            <th className="text-end" style={{ cursor: 'pointer', fontWeight: 600, color: '#374151' }}
                                                onClick={() => sortToggle('total_flags')}>
                                                Flags <SortIcon col="total_flags" />
                                            </th>
                                            <th className="text-end" style={{ cursor: 'pointer', fontWeight: 600, color: '#374151' }}
                                                onClick={() => sortToggle('avg_score')}>
                                                Avg Score <SortIcon col="avg_score" />
                                            </th>
                                            <th className="text-end" style={{ cursor: 'pointer', fontWeight: 600, color: '#374151' }}
                                                onClick={() => sortToggle('total_at_risk')}>
                                                At Risk <SortIcon col="total_at_risk" />
                                            </th>
                                            <th style={{ fontWeight: 600, color: '#374151' }}>Risk Level</th>
                                            {allFlagTypes.slice(0, 4).map(t => (
                                                <th key={t} className="text-center"
                                                    style={{ fontWeight: 500, color: '#6b7280', fontSize: 11 }}
                                                    title={FLAG_LABELS[t] ?? t}>
                                                    {(FLAG_LABELS[t] ?? t).split(' ')[0]}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayed.map(h => {
                                            const risk = riskLevel(h.avg_score || 0);
                                            return (
                                                <tr key={h.hcp_id}
                                                    onClick={() => navigate(`/hcps/${h.hcp_id}`)}
                                                    style={{ cursor: 'pointer' }}>
                                                    <td className="ps-4">
                                                        <div style={{ fontWeight: 600, color: '#111' }}>{h.hcp_name}</div>
                                                        <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>{h.hcp_code}</div>
                                                    </td>
                                                    <td style={{ color: '#374151' }}>{h.city}, {h.state}</td>
                                                    <td className="text-end">
                                                        <strong style={{ color: '#dc2626' }}>{h.total_flags}</strong>
                                                    </td>
                                                    <td className="text-end font-monospace">
                                                        {(h.avg_score || 0).toFixed(1)}
                                                    </td>
                                                    <td className="text-end">
                                                        {formatCurrency(h.total_at_risk, false)}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                                                            color: risk.color, background: risk.bg,
                                                        }}>
                                                            {risk.label}
                                                        </span>
                                                    </td>
                                                    {allFlagTypes.slice(0, 4).map(t => (
                                                        <td key={t} className="text-center">
                                                            {h.flag_types[t] ? (
                                                                <span style={{
                                                                    display: 'inline-block', minWidth: 22, padding: '1px 5px',
                                                                    borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                                    background: '#fef2f2', color: '#dc2626',
                                                                }}>
                                                                    {h.flag_types[t]}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">—</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}