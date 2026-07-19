/**
 * FILE LOCATION: resources/js/pages/finance/CapitationListPage.jsx
 * ROUTE:         /finance/capitation
 * PERMISSION:    finance.capitation
 *
 * Displays all capitation runs for the branch.
 * Tabs: Runs | Rates (HCP capitation rate management)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Plus, RefreshCw, ChevronRight, Activity,
    Users, Building2, TrendingUp, TrendingDown,
    DollarSign, CheckCircle, Clock, AlertTriangle,ArrowLeft,
} from 'lucide-react';
import {
    fetchCapitationRuns, generateCapitationRun, fetchCapitationSummary,
} from '../../api/index';
import {
    PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert,
} from '../../components/ui/index';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import RatesTab from './capitation/RatesTab';

// ─── Status badge colours ────────────────────────────────────────────────────
const RUN_STATUS = {
    draft:    { color: '#6b7280', bg: '#f3f4f6', label: 'Draft'    },
    approved: { color: '#0f4c81', bg: '#e8f0fe', label: 'Approved' },
    paid:     { color: '#137333', bg: '#e6f4ea', label: 'Paid'     },
};

// Current month helper
const NOW = new Date();

export default function CapitationListPage() {
    const { hasPermission } = useAuth();
    const navigate          = useNavigate();
    const qc                = useQueryClient();
    const [activeTab, setActiveTab] = useState('runs');
    const [showGenerate, setShowGenerate] = useState(false);

    const canManage = hasPermission('finance.capitation');

    return (
        <div>
            <PageHeader
                title="Capitation"
                subtitle="Monthly headcount-based payments to healthcare providers"
                actions={
                    canManage && activeTab === 'runs' && (
                        <button
                            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                            onClick={() => setShowGenerate(true)}
                        >
                            <Plus size={15} />
                            Generate Run
                        </button>
                    )
                }
            />
            <div className="d-flex align-items-center gap-2 mb-3">
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate('/finance')}
                >
                    <ArrowLeft size={14} />
                    Back to Finance
                </button>
            </div>

            {/* KPI Cards */}
            <SummaryCards />

            {/* Tabs */}
            <ul className="nav nav-tabs mb-0" style={{ fontSize: 13 }}>
                {[
                    { key: 'runs',  label: 'Capitation Runs'  },
                    { key: 'rates', label: 'HCP Rates'        },
                ].map(t => (
                    <li key={t.key} className="nav-item">
                        <button
                            className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    </li>
                ))}
            </ul>

            {activeTab === 'runs'  && <RunsTab navigate={navigate} />}
            {activeTab === 'rates' && <RatesTab />}

            {showGenerate && (
                <GenerateRunModal
                    onClose={() => setShowGenerate(false)}
                    onSuccess={(run) => {
                        qc.invalidateQueries({ queryKey: ['capitation-runs'] });
                        qc.invalidateQueries({ queryKey: ['capitation-summary'] });
                        setShowGenerate(false);
                        navigate(`/finance/capitation/${run.id}`);
                    }}
                />
            )}
        </div>
    );
}

/* ── Summary KPI Cards ──────────────────────────────────────────────────────── */

function SummaryCards() {
    const { data, isLoading } = useQuery({
        queryKey:  ['capitation-summary'],
        queryFn:   fetchCapitationSummary,
        staleTime: 60_000,
    });

    const d = data?.data ?? {};

    const cards = [
        {
            label:   'This Month',
            value:   d.current_run_amount != null ? formatCurrency(d.current_run_amount) : '-',
            sub:     d.current_run_period ?? (isLoading ? '…' : 'No run yet'),
            icon:    DollarSign,
            color:   '#0f4c81',
            bg:      '#e8f0fe',
        },
        {
            label:   'Active Members',
            value:   d.total_active_members?.toLocaleString() ?? '-',
            sub:     `${(d.active_principal_count ?? 0).toLocaleString()} principals · ${(d.active_dependent_count ?? 0).toLocaleString()} dependants`,
            icon:    Users,
            color:   '#137333',
            bg:      '#e6f4ea',
        },
        {
            label:   'YTD Paid',
            value:   d.ytd_paid_amount != null ? formatCurrency(d.ytd_paid_amount) : '-',
            sub:     `${NOW.getFullYear()} year to date`,
            icon:    TrendingUp,
            color:   '#7c3aed',
            bg:      '#f5f3ff',
        },
        {
            label:   'HCPs with Rates',
            value:   d.hcp_with_rates_count?.toLocaleString() ?? '-',
            sub:     d.pending_runs_count
                ? `${d.pending_runs_count} run${d.pending_runs_count > 1 ? 's' : ''} pending approval`
                : 'All rates current',
            icon:    Building2,
            color:   d.pending_runs_count > 0 ? '#b45309' : '#0f4c81',
            bg:      d.pending_runs_count > 0 ? '#fef3c7' : '#e8f0fe',
        },
    ];

    return (
        <div className="row g-3 mb-4">
            {cards.map(card => (
                <div key={card.label} className="col-md-3">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-body d-flex align-items-start gap-3" style={{ padding: '18px 20px' }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: 10,
                                background: card.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <card.icon size={20} color={card.color} />
                            </div>
                            <div className="overflow-hidden">
                                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {card.label}
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                                    {isLoading ? <span className="spinner-border spinner-border-sm" /> : card.value}
                                </div>
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {card.sub}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Runs Tab ───────────────────────────────────────────────────────────────── */

function RunsTab({ navigate }) {
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey:  ['capitation-runs', page],
        queryFn:   () => fetchCapitationRuns({ page, per_page: 20 }),
        keepPreviousData: true,
    });

    if (isLoading) return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body py-5"><LoadingSpinner /></div></div>;
    if (isError)   return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body"><ErrorAlert message="Failed to load capitation runs." onRetry={refetch} /></div></div>;

    const runs = data?.data ?? [];

    return (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}>
            {runs.length === 0 ? (
                <div className="card-body text-center py-5 text-muted">
                    <Activity size={36} className="mb-3 opacity-25" />
                    <p className="mb-1">No capitation runs yet.</p>
                    <p style={{ fontSize: 13 }}>Click <strong>Generate Run</strong> to create the first monthly run.</p>
                </div>
            ) : (
                <>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>Period</th>
                                    <th>Status</th>
                                    <th className="text-end">HCPs</th>
                                    <th className="text-end">Members</th>
                                    <th className="text-end">Variance</th>
                                    <th className="text-end">Total Amount</th>
                                    <th>Batch</th>
                                    <th>Generated</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.map(run => {
                                    const st = RUN_STATUS[run.status] ?? RUN_STATUS.draft;
                                    const varPositive = run.member_variance > 0;
                                    const varZero     = run.member_variance === 0;

                                    return (
                                        <tr
                                            key={run.id}
                                            onClick={() => navigate(`/finance/capitation/${run.id}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className="ps-4">
                                                <div style={{ fontWeight: 600, color: '#111' }}>
                                                    {run.period_label}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                    {run.approved_by_name
                                                        ? `Approved by ${run.approved_by_name}`
                                                        : `Generated by ${run.generated_by_name}`}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 12,
                                                    fontSize: 11, fontWeight: 600,
                                                    color: st.color, background: st.bg,
                                                }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="text-end font-monospace">
                                                {run.total_hcp_count.toLocaleString()}
                                            </td>
                                            <td className="text-end">
                                                <div className="font-monospace">{run.total_member_count.toLocaleString()}</div>
                                                <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                    {run.total_principal_count}P + {run.total_dependent_count}D
                                                </div>
                                            </td>
                                            <td className="text-end">
                                                {varZero ? (
                                                    <span className="text-muted">-</span>
                                                ) : (
                                                    <span style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
                                                        color: varPositive ? '#137333' : '#c5221f',
                                                        fontWeight: 600,
                                                    }}>
                                                        {varPositive
                                                            ? <TrendingUp size={12} />
                                                            : <TrendingDown size={12} />}
                                                        {varPositive ? '+' : ''}{run.member_variance}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <strong style={{ color: '#0f4c81' }}>
                                                    {formatCurrency(run.total_amount)}
                                                </strong>
                                            </td>
                                            <td>
                                                {run.batch_number ? (
                                                    <span className="font-monospace" style={{ fontSize: 11 }}>
                                                        {run.batch_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td style={{ color: '#6b7280' }}>
                                                {formatDate(run.created_at)}
                                            </td>
                                            <td>
                                                <ChevronRight size={15} className="text-muted" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {data?.meta && (
                        <div className="card-body border-top py-2">
                            <Pagination meta={data.meta} onPageChange={setPage} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ── Generate Run Modal ─────────────────────────────────────────────────────── */

function GenerateRunModal({ onClose, onSuccess }) {
    const now = new Date();
    const [form, setForm] = useState({
        period_month: now.getMonth() + 1,
        period_year:  now.getFullYear(),
        notes:        '',
    });
    const [errors, setErrors] = useState({});

    const mutation = useMutation({
        mutationFn: generateCapitationRun,
        onSuccess: (res) => {
            toast.success(`Run generated for ${res.data?.data?.period_label}.`);
            onSuccess(res.data?.data);
        },
        onError: (err) => {
            const msg = err.response?.data?.message ?? 'Generation failed.';
            toast.error(msg);
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
        },
    });

    const months = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December',
    ];

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="modal-dialog modal-md modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold">Generate Capitation Run</h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    
                    <div className="modal-body">
                        <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                            The system will snapshot current enrollee headcounts per HCP and
                            compute capitation amounts using agreed rates. The run starts as a
                            draft - you can review and adjust before approving.
                        </p>

                        <div className="row g-3">
                            <div className="col-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Month</label>
                                <select
                                    className="form-select"
                                    value={form.period_month}
                                    onChange={e => setForm(p => ({ ...p, period_month: +e.target.value }))}
                                >
                                    {months.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Year</label>
                                <select
                                    className="form-select"
                                    value={form.period_year}
                                    onChange={e => setForm(p => ({ ...p, period_year: +e.target.value }))}
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Notes (optional)</label>
                                <textarea
                                    className="form-control"
                                    rows={2}
                                    value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="e.g. Revised headcount for mid-month transfer"
                                />
                            </div>
                        </div>

                        {errors.period_month && (
                            <div className="alert alert-danger mt-3 py-2 mb-0" style={{ fontSize: 13 }}>
                                {errors.period_month}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate(form)}
                        >
                            {mutation.isPending
                                ? <><span className="spinner-border spinner-border-sm" /> Generating…</>
                                : <><Activity size={14} /> Generate Run</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}