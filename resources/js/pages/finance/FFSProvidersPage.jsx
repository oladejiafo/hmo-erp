/**
 * FILE: resources/js/pages/finance/FFSProvidersPage.jsx
 * ROUTE: /finance/ffs
 * PERMISSION: finance.ffs
 *
 * Shows all Fee-for-Service and Hybrid HCPs with:
 *  - Monthly FFS spend trend chart
 *  - Pending FFS claims per provider
 *  - Quick "Batch all approved FFS claims for provider" action
 *  - FFS contract status (active/expiring/expired)
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Layers, FileText, AlertCircle, CheckCircle2,
    TrendingUp, TrendingDown, DollarSign, Building2, Filter,
    CalendarDays, Plus, ChevronRight,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { fetchFFSProviders, fetchFFSSpendTrend, createFFSBatch } from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert, Pagination } from '../../components/ui/index';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

const PAYMENT_MODEL_STYLE = {
    fee_for_service: { bg: '#f0fdf4', color: '#166534', label: 'Fee for Service' },
    hybrid:          { bg: '#fef9c3', color: '#854d0e', label: 'Hybrid'          },
};

const TIER_COLOR = {
    primary:   { bg: '#e8f0fe', text: '#1967d2' },
    secondary: { bg: '#fff3cd', text: '#664d03' },
    tertiary:  { bg: '#fce8e6', text: '#c5221f' },
};

function contractStatus(endDate) {
    if (!endDate) return { label: 'Open-ended', color: '#137333', bg: '#e6f4ea' };
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0)  return { label: 'Expired',  color: '#c5221f', bg: '#fce8e6' };
    if (daysLeft < 30) return { label: `Exp. in ${daysLeft}d`, color: '#b45309', bg: '#fef3c7' };
    return { label: formatDate(endDate), color: '#374151', bg: '#f3f4f6' };
}

export default function FFSProvidersPage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [modelFilter, setModelFilter] = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['ffs-providers', { page, search, modelFilter }],
        queryFn:  () => fetchFFSProviders({
            page,
            per_page: 20,
            search:   search || undefined,
            model:    modelFilter || undefined,
        }),
        keepPreviousData: true,
    });

    const { data: trendData, isLoading: trendLoading } = useQuery({
        queryKey: ['ffs-spend-trend'],
        queryFn:  fetchFFSSpendTrend,
        staleTime: 300_000,
    });

    const providers = data?.data?.data ?? data?.data ?? [];
    const meta      = data?.meta;
    const summary   = data?.summary ?? {};
    const trend     = trendData?.data ?? [];

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const canBatch = hasPermission('finance.batch_create');

    return (
        <div>
            <PageHeader
                title="FFS Providers"
                subtitle="Fee-for-Service and Hybrid healthcare providers - claim-based payment tracking"
            />

            {/* Back button */}
            <div className="d-flex align-items-center gap-2 mb-4">
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate('/finance')}
                >
                    <ArrowLeft size={14} /> Back to Finance
                </button>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'FFS Providers',       value: summary.ffs_count ?? '-',                          color: '#166534', bg: '#f0fdf4', icon: <Layers size={18} /> },
                    { label: 'Hybrid Providers',    value: summary.hybrid_count ?? '-',                       color: '#854d0e', bg: '#fef9c3', icon: <Building2 size={18} /> },
                    { label: 'Approved - Unbatched',value: formatCurrency(summary.total_pending_amount ?? 0), color: '#b45309', bg: '#fef3c7', icon: <FileText size={18} /> },
                    { label: 'Expiring Contracts',  value: summary.expiring_contracts ?? '-',                 color: '#c5221f', bg: '#fce8e6', icon: <CalendarDays size={18} /> },
                ].map(k => (
                    <div key={k.label} className="col-md-3 col-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body d-flex align-items-center gap-3 py-3">
                                <div className="rounded-3 d-flex align-items-center justify-content-center"
                                     style={{ width: 44, height: 44, background: k.bg, color: k.color, flexShrink: 0 }}>
                                    {k.icon}
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                                    <div className="fw-bold" style={{ fontSize: 20, color: k.color, lineHeight: 1.2 }}>
                                        {isLoading ? <span className="spinner-border spinner-border-sm" /> : k.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* FFS Spend Trend Chart */}
            {!trendLoading && trend.length > 0 && (
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                    <div className="card-body">
                        <div className="fw-semibold mb-1" style={{ fontSize: 14 }}>FFS vs Capitation Spend - Last 12 Months</div>
                        <div className="text-muted mb-3" style={{ fontSize: 12 }}>Completed batches only</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={v => [formatCurrency(v)]} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="ffs_paid"        name="FFS Paid"        fill="#166534" radius={[3,3,0,0]} barSize={12} />
                                <Bar dataKey="capitation_paid" name="Capitation Paid" fill="#1967d2" radius={[3,3,0,0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2 d-flex gap-3 flex-wrap align-items-center">
                    <Filter size={14} className="text-muted" />
                    {[
                        { key: '',                label: 'All'             },
                        { key: 'fee_for_service', label: 'FFS Only'        },
                        { key: 'hybrid',          label: 'Hybrid Only'     },
                    ].map(m => (
                        <button key={m.key}
                            className={`btn btn-sm rounded-pill ${modelFilter === m.key ? 'btn-primary' : 'btn-outline-secondary'}`}
                            style={{ fontSize: 11 }}
                            onClick={() => { setModelFilter(m.key); setPage(1); }}>
                            {m.label}
                        </button>
                    ))}
                    <div className="input-group ms-auto" style={{ maxWidth: 260 }}>
                        <span className="input-group-text bg-white border-end-0" style={{ fontSize: 13 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                        </span>
                        <input type="text" className="form-control border-start-0 form-control-sm"
                               placeholder="Search provider name or code…"
                               value={search}
                               onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                </div>
            </div>

            {/* Providers Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                <div className="card-body p-0">
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : providers.length === 0 ? (
                        <div className="py-5 text-center text-muted">
                            <Layers size={36} className="mb-3 opacity-25" />
                            <p className="fw-semibold mb-1">No FFS or Hybrid providers found.</p>
                            <p style={{ fontSize: 13 }}>
                                To classify a provider as FFS, open their profile under{' '}
                                <button className="btn btn-link p-0" style={{ fontSize: 13 }} onClick={() => navigate('/hcps')}>
                                    HCPs
                                </button>{' '}
                                and update the Payment Model field.
                            </p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>Provider</th>
                                        <th style={{ fontWeight: 600, color: '#374151' }}>Tier</th>
                                        <th style={{ fontWeight: 600, color: '#374151' }}>Model</th>
                                        <th className="text-end" style={{ fontWeight: 600, color: '#374151' }}>Pending Claims</th>
                                        <th className="text-end" style={{ fontWeight: 600, color: '#374151' }}>Pending Amount</th>
                                        <th style={{ fontWeight: 600, color: '#374151' }}>Contract Ref</th>
                                        <th style={{ fontWeight: 600, color: '#374151' }}>Contract End</th>
                                        <th style={{ fontWeight: 600, color: '#374151' }}>Tariff Enforced</th>
                                        {canBatch && <th style={{ fontWeight: 600, color: '#374151' }}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {providers.map(p => {
                                        const ms = PAYMENT_MODEL_STYLE[p.payment_model] ?? {};
                                        const tc = TIER_COLOR[p.tier] ?? {};
                                        const cs = contractStatus(p.ffs_contract_end);

                                        return (
                                            <tr key={p.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/hcps/${p.id}`)}>
                                                <td className="ps-4">
                                                    <div className="fw-semibold" style={{ color: '#111' }}>{p.name}</div>
                                                    <div className="font-monospace text-muted" style={{ fontSize: 11 }}>{p.hcp_code}</div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: tc.bg, color: tc.text, fontSize: 11, textTransform: 'capitalize' }}>
                                                        {p.tier ?? '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: ms.bg, color: ms.color, fontSize: 11 }}>
                                                        {ms.label ?? p.payment_model}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    {p.ffs_pending_count > 0 ? (
                                                        <span className="badge bg-warning-subtle text-warning fw-bold" style={{ fontSize: 12 }}>
                                                            {p.ffs_pending_count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">0</span>
                                                    )}
                                                </td>
                                                <td className="text-end">
                                                    {p.ffs_pending_amount > 0 ? (
                                                        <strong style={{ color: '#166534' }}>{formatCurrency(p.ffs_pending_amount)}</strong>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {p.ffs_contract_ref ? (
                                                        <span className="font-monospace" style={{ fontSize: 11 }}>{p.ffs_contract_ref}</span>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 10, fontSize: 11,
                                                        fontWeight: 600, color: cs.color, background: cs.bg,
                                                    }}>
                                                        {cs.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {p.ffs_tariff_enforced ? (
                                                        <span style={{ color: '#137333', fontSize: 12 }}>
                                                            <CheckCircle2 size={14} className="me-1" />Strict
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#6b7280', fontSize: 12 }}>Flexible</span>
                                                    )}
                                                </td>
                                                {canBatch && (
                                                    <td onClick={e => e.stopPropagation()}>
                                                        {p.ffs_pending_count > 0 ? (
                                                            <BatchFFSButton hcpId={p.id} hcpName={p.name} qc={qc} navigate={navigate} />
                                                        ) : (
                                                            <span className="text-muted" style={{ fontSize: 11 }}>No pending</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {meta && (
                    <div className="card-body border-top py-2">
                        <Pagination meta={meta} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Batch FFS Button ────────────────────────────────────────────────────────── */

function BatchFFSButton({ hcpId, hcpName, qc, navigate }) {
    const mutation = useMutation({
        mutationFn: () => createFFSBatch({ hcp_id: hcpId }),
        onSuccess: (res) => {
            toast.success(`Batch ${res.data?.data?.batch_number} created for ${hcpName}.`);
            qc.invalidateQueries({ queryKey: ['ffs-providers'] });
            qc.invalidateQueries({ queryKey: ['batches'] });
            qc.invalidateQueries({ queryKey: ['hcp-payment-summary'] });
            navigate(`/finance/batches/${res.data?.data?.id}`);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to create FFS batch.'),
    });

    return (
        <button
            className="btn btn-sm btn-outline-success py-0"
            style={{ fontSize: 11 }}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
        >
            {mutation.isPending
                ? <span className="spinner-border spinner-border-sm" />
                : <><Plus size={11} className="me-1" />Batch FFS</>
            }
        </button>
    );
}
