/**
 * FILE: resources/js/pages/finance/FinancePage.jsx
 *
 * Changes from original:
 *  - Added "HCP Payment Summary" tab (permission: finance.view)
 *  - Capitation tab now navigates to /finance/capitation (unchanged)
 *  - HCP Payment Summary tab renders inline (no navigation)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Plus, TrendingUp, TrendingDown, Wallet, Clock,
    FileText, Filter, Activity, Layers, Building2,
    AlertCircle, CheckCircle2, Users,
} from 'lucide-react';
import {
    fetchPaymentBatches as fetchBatches,
    createPaymentBatch as createBatch,
    fetchLedger,
    fetchLedgerSummary,
    fetchHCPPaymentSummary,
    fetchReimbursements,
} from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import ReimbursementsQueuePage from './ReimbursementsQueuePage';

const BATCH_STATUS_COLOR = {
    draft: 'secondary', submitted: 'warning', approved: 'primary',
    processing: 'info', completed: 'success', failed: 'danger', reversed: 'dark',
};

const ENTRY_TYPE_COLOR = { credit: 'success', debit: 'danger' };

const PAYMENT_MODEL_STYLE = {
    capitation:       { bg: '#e8f0fe', color: '#1967d2', label: 'Capitation'       },
    fee_for_service:  { bg: '#f0fdf4', color: '#166534', label: 'Fee for Service'  },
    hybrid:           { bg: '#fef9c3', color: '#854d0e', label: 'Hybrid'           },
};

export default function FinancePage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState('batches');

    const tabs = [
        { key: 'batches',        label: 'Payment Batches',        always: true, icon: <Wallet size={13} /> },
        { key: 'ledger',         label: 'General Ledger',         perm: 'finance.ledger_view', icon: <FileText size={13} /> },
        { key: 'hcp_summary',    label: 'HCP Payment Summary',    perm: 'finance.view', icon: <Building2 size={13} /> },
        { key: 'capitation',     label: 'Capitation',             perm: 'finance.capitation', navigate: '/finance/capitation', icon: <Activity size={13} /> },
        { key: 'ffs',            label: 'FFS Providers',          perm: 'finance.ffs', navigate: '/finance/ffs', icon: <Layers size={13} /> },
        { key: 'reimbursements', label: 'Reimbursement Requests', perm: 'reimbursements.view', icon: <FileText size={13} /> },
        
    ].filter(t => t.always || !t.perm || hasPermission(t.perm));

    return (
        <div>
            <PageHeader
                title="Finance & Payments"
                subtitle="Payment batches, provider remittances, ledger and HCP payment overview"
                actions={
                    hasPermission('finance.batch_create') && activeTab === 'batches' && (
                        <CreateBatchButton qc={qc} navigate={navigate} />
                    )
                }
            />

            {/* Tab switcher */}
            <ul className="nav nav-tabs mb-4" style={{ fontSize: 13 }}>
                {tabs.map(tab => (
                    <li key={tab.key} className="nav-item">
                        <button
                            className={`nav-link d-inline-flex align-items-center gap-1 ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => {
                                if (tab.navigate) {
                                    navigate(tab.navigate);
                                } else {
                                    setActiveTab(tab.key);
                                }
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {activeTab === 'batches'     && <BatchesTab navigate={navigate} />}
            {activeTab === 'ledger'      && <LedgerTab />}
            {activeTab === 'hcp_summary' && <HCPPaymentSummaryTab navigate={navigate} />}
            {activeTab === 'reimbursements' && <ReimbursementsQueuePage />}
        </div>
    );
}

/* ── Create Batch Button ─────────────────────────────────────────────────────── */

function CreateBatchButton({ qc, navigate }) {
    const mutation = useMutation({
        mutationFn: () => createBatch({}),
        onSuccess: (res) => {
            toast.success(`Batch ${res.data.data.batch_number} created.`);
            qc.invalidateQueries({ queryKey: ['batches'] });
            navigate(`/finance/batches/${res.data.data.id}`);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to create batch.'),
    });

    return (
        <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
        >
            {mutation.isPending
                ? <><span className="spinner-border spinner-border-sm" />Creating...</>
                : <><Plus size={16} /> New Batch from Approved Claims</>}
        </button>
    );
}

/* ── Payment Batches Tab ─────────────────────────────────────────────────────── */

function BatchesTab({ navigate }) {
    const [page, setPage]           = useState(1);
    const [statusFilter, setStatus] = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['batches', { page, status: statusFilter }],
        queryFn:  () => fetchBatches({ page, status: statusFilter || undefined }),
        keepPreviousData: true,
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const batches = data?.data?.data ?? data?.data ?? [];

    const kpis = [
        { label: 'Pending Approval', value: batches.filter(b => b.status === 'submitted').length, color: '#b05e00', bg: '#fef7e0', icon: <Clock size={18} /> },
        { label: 'Approved - Queued', value: batches.filter(b => b.status === 'approved').length, color: '#1967d2', bg: '#e8f0fe', icon: <FileText size={18} /> },
        { label: 'Completed this page', value: batches.filter(b => b.status === 'completed').length, color: '#137333', bg: '#e6f4ea', icon: <TrendingUp size={18} /> },
        { label: 'Total Value (page)', value: formatCurrency(batches.reduce((s, b) => s + parseFloat(b.total_amount ?? 0), 0), false), color: '#5e35b1', bg: '#f3e8fd', icon: <Wallet size={18} /> },
    ];

    return (
        <div>
            <div className="row g-3 mb-4">
                {kpis.map(k => (
                    <div key={k.label} className="col-md-3 col-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body d-flex align-items-center gap-3 py-3">
                                <div className="rounded-3 d-flex align-items-center justify-content-center"
                                     style={{ width: 44, height: 44, background: k.bg, color: k.color, flexShrink: 0 }}>
                                    {k.icon}
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                                    <div className="fw-bold" style={{ fontSize: 20, color: k.color, lineHeight: 1.2 }}>{k.value}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2">
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <Filter size={14} className="text-muted" />
                        <span className="text-muted me-1" style={{ fontSize: 12 }}>Status:</span>
                        {['','draft','submitted','approved','completed','reversed'].map(s => (
                            <button key={s}
                                className={`btn btn-sm rounded-pill ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ fontSize: 11 }}
                                onClick={() => { setStatus(s); setPage(1); }}>
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : batches.length === 0 ? (
                        <div className="py-5 text-center text-muted">
                            <FileText size={36} className="mb-2 opacity-25" />
                            <p className="mb-0">No payment batches found.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12 }}>Batch No.</th>
                                        <th style={{ fontSize: 12 }} className="text-center">Claims</th>
                                        <th style={{ fontSize: 12 }} className="text-center">Providers</th>
                                        <th style={{ fontSize: 12 }} className="text-end">Total Amount</th>
                                        <th style={{ fontSize: 12 }}>Created</th>
                                        <th style={{ fontSize: 12 }}>Approved By</th>
                                        <th style={{ fontSize: 12 }}>Status</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => (
                                        <tr key={b.id} className="cursor-pointer"
                                            onClick={() => navigate(`/finance/batches/${b.id}`)}>
                                            <td>
                                                <span className="fw-semibold font-monospace" style={{ fontSize: 12 }}>{b.batch_number}</span>
                                                {b.description && <div className="text-muted" style={{ fontSize: 11 }}>{b.description}</div>}
                                            </td>
                                            <td className="text-center" style={{ fontSize: 13 }}>{b.claim_count}</td>
                                            <td className="text-center" style={{ fontSize: 13 }}>{b.provider_count}</td>
                                            <td className="text-end fw-bold" style={{ fontSize: 14 }}>{formatCurrency(b.total_amount)}</td>
                                            <td style={{ fontSize: 12 }}>{formatDateTime(b.created_at)}</td>
                                            <td style={{ fontSize: 12 }}>{b.approved_by?.name ?? <span className="text-muted">-</span>}</td>
                                            <td>
                                                <StatusBadge status={b.status} color={BATCH_STATUS_COLOR[b.status] ?? 'secondary'} label={b.status_label ?? b.status} />
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-primary py-0" style={{ fontSize: 11 }}
                                                        onClick={e => { e.stopPropagation(); navigate(`/finance/batches/${b.id}`); }}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {data?.meta && (
                    <div className="card-body border-top py-2">
                        <Pagination meta={data.meta} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── General Ledger Tab ──────────────────────────────────────────────────────── */

function LedgerTab() {
    const [page, setPage]         = useState(1);
    const [entryType, setEntry]   = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['ledger', { page, entryType, dateFrom, dateTo }],
        queryFn:  () => fetchLedger({ page, entry_type: entryType || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }),
        keepPreviousData: true,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['ledger-summary'],
        queryFn:  fetchLedgerSummary,
        staleTime: 60000,
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const entries = data?.data?.data?.data ?? [];
    const summary = summaryData?.data?.data ?? summaryData?.data;

    return (
        <div>
            {summary && (
                <div className="row g-3 mb-4">
                    {[
                        { label: 'Total Credits', value: formatCurrency(summary.total_credits), icon: <TrendingUp size={18}/>, color: '#137333', bg: '#e6f4ea' },
                        { label: 'Total Debits',  value: formatCurrency(summary.total_debits),  icon: <TrendingDown size={18}/>, color: '#c5221f', bg: '#fce8e6' },
                        { label: 'Net Balance',   value: formatCurrency(summary.net_balance),   icon: <Wallet size={18}/>, color: summary.net_balance >= 0 ? '#137333' : '#c5221f', bg: '#f4f6fa' },
                    ].map(k => (
                        <div key={k.label} className="col-md-4">
                            <div className="card border-0 shadow-sm">
                                <div className="card-body d-flex align-items-center gap-3 py-3">
                                    <div className="rounded-3 d-flex align-items-center justify-content-center"
                                         style={{ width: 44, height: 44, background: k.bg, color: k.color, flexShrink: 0 }}>
                                        {k.icon}
                                    </div>
                                    <div>
                                        <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                                        <div className="fw-bold" style={{ fontSize: 18, color: k.color }}>{k.value}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2">
                    <div className="d-flex gap-3 align-items-center flex-wrap">
                        <select className="form-select form-select-sm" style={{ width: 160 }}
                                value={entryType} onChange={e => { setEntry(e.target.value); setPage(1); }}>
                            <option value="">All Entry Types</option>
                            <option value="credit">Credits Only</option>
                            <option value="debit">Debits Only</option>
                        </select>
                        <input type="date" className="form-control form-control-sm" style={{ width: 150 }}
                               value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                        <span className="text-muted">-</span>
                        <input type="date" className="form-control form-control-sm" style={{ width: 150 }}
                               value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
                        {(entryType || dateFrom || dateTo) && (
                            <button className="btn btn-sm btn-outline-secondary"
                                    onClick={() => { setEntry(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
                                Clear
                            </button>
                        )}
                        <span className="ms-auto text-muted" style={{ fontSize: 12 }}>
                            {data?.meta?.total != null && `${data.meta.total} entries`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12 }}>Date</th>
                                        <th style={{ fontSize: 12 }}>Type</th>
                                        <th style={{ fontSize: 12 }}>Category</th>
                                        <th style={{ fontSize: 12 }}>Description</th>
                                        <th style={{ fontSize: 12 }}>Reference</th>
                                        <th className="text-end" style={{ fontSize: 12 }}>Amount</th>
                                        <th className="text-end" style={{ fontSize: 12 }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(entries) && entries.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(e.entry_date)}</td>
                                            <td>
                                                <span className={`badge bg-${ENTRY_TYPE_COLOR[e.entry_type]}-subtle text-${ENTRY_TYPE_COLOR[e.entry_type]}`} style={{ fontSize: 10 }}>
                                                    {e.entry_type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border" style={{ fontSize: 10 }}>
                                                    {e.category?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{e.description}</td>
                                            <td className="font-monospace" style={{ fontSize: 11 }}>{e.reference_number ?? '-'}</td>
                                            <td className="text-end fw-semibold" style={{ fontSize: 13, color: e.entry_type === 'credit' ? '#137333' : '#c5221f' }}>
                                                {e.entry_type === 'credit' ? '+' : '−'}{formatCurrency(Math.abs(e.amount))}
                                            </td>
                                            <td className="text-end" style={{ fontSize: 12 }}>
                                                {e.running_balance != null ? formatCurrency(e.running_balance) : <span className="text-muted">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {entries.length === 0 && (
                                        <tr><td colSpan={7} className="py-5 text-center text-muted">No ledger entries match the current filters.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {data?.meta && (
                    <div className="card-body border-top py-2">
                        <Pagination meta={data.meta} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── HCP Payment Summary Tab ─────────────────────────────────────────────────── */

function HCPPaymentSummaryTab({ navigate }) {
    const [modelFilter, setModelFilter] = useState('');
    const [search, setSearch] = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['hcp-payment-summary'],
        queryFn:  fetchHCPPaymentSummary,
        staleTime: 60000,
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    console.log('HCP Payment Summary data:', data);
    const summary = data?.summary ?? {};
    const allRows = data?.data ?? [];

    const rows = allRows.filter(r => {
        const modelOk  = !modelFilter || r.payment_model === modelFilter;
        const searchOk = !search ||
            r.hcp_name?.toLowerCase().includes(search.toLowerCase()) ||
            r.hcp_code?.toLowerCase().includes(search.toLowerCase());
        return modelOk && searchOk;
    });

    const summaryCards = [
        { label: 'Total Capitation Liability', value: formatCurrency(summary.total_capitation_liability ?? 0), color: '#0f4c81', bg: '#e8f0fe', icon: <Activity size={18} /> },
        { label: 'Total FFS Pending',          value: formatCurrency(summary.total_ffs_liability ?? 0),        color: '#166534', bg: '#f0fdf4', icon: <Layers size={18} /> },
        { label: 'Total Liability This Month', value: formatCurrency(summary.total_liability ?? 0),             color: '#5e35b1', bg: '#f5f3ff', icon: <Wallet size={18} /> },
        { label: 'FFS Claims Pending Batch',   value: (summary.ffs_pending_claims ?? 0).toLocaleString(),      color: '#b45309', bg: '#fef3c7', icon: <FileText size={18} /> },
    ];

    return (
        <div>
            {/* KPI row */}
            <div className="row g-3 mb-4">
                {summaryCards.map(k => (
                    <div key={k.label} className="col-md-3 col-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body d-flex align-items-center gap-3 py-3">
                                <div className="rounded-3 d-flex align-items-center justify-content-center"
                                     style={{ width: 44, height: 44, background: k.bg, color: k.color, flexShrink: 0 }}>
                                    {k.icon}
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                                    <div className="fw-bold" style={{ fontSize: 18, color: k.color, lineHeight: 1.2 }}>
                                        {isLoading ? <span className="spinner-border spinner-border-sm" /> : k.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Context info banner */}
            <div className="alert alert-info d-flex align-items-start gap-2 mb-4 py-2" style={{ fontSize: 13 }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-1" />
                <span>
                    This table shows what is currently owed to every active HCP in <strong>{summary.current_period}</strong>.
                    Capitation amounts come from the current month's run. FFS amounts are approved claims not yet batched.
                    <strong> Hybrid</strong> providers show both.
                </span>
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2 d-flex gap-3 flex-wrap align-items-center">
                    <Filter size={14} className="text-muted" />
                    {['','capitation','fee_for_service','hybrid'].map(m => (
                        <button key={m}
                            className={`btn btn-sm rounded-pill ${modelFilter === m ? 'btn-primary' : 'btn-outline-secondary'}`}
                            style={{ fontSize: 11 }}
                            onClick={() => setModelFilter(m)}>
                            {m === '' ? 'All Models' : PAYMENT_MODEL_STYLE[m]?.label ?? m}
                        </button>
                    ))}
                    <div className="input-group ms-auto" style={{ maxWidth: 240 }}>
                        <span className="input-group-text bg-white border-end-0" style={{ fontSize: 13 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                        </span>
                        <input type="text" className="form-control border-start-0 form-control-sm"
                               placeholder="Search HCP…"
                               value={search}
                               onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : rows.length === 0 ? (
                        <div className="py-5 text-center text-muted">
                            <Building2 size={36} className="mb-2 opacity-25" />
                            <p className="mb-0">No HCPs match the current filters.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12 }}>Provider</th>
                                        <th style={{ fontSize: 12 }}>Tier</th>
                                        <th style={{ fontSize: 12 }}>Payment Model</th>
                                        <th className="text-end" style={{ fontSize: 12 }}>Capitation</th>
                                        <th className="text-center" style={{ fontSize: 12 }}>FFS Claims</th>
                                        <th className="text-end" style={{ fontSize: 12 }}>FFS Amount</th>
                                        <th className="text-end" style={{ fontSize: 12 }}>Total Liability</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => {
                                        const ms = PAYMENT_MODEL_STYLE[r.payment_model] ?? {};
                                        const TIER_COLOR = {
                                            primary:   { bg: '#e8f0fe', text: '#1967d2' },
                                            secondary: { bg: '#fff3cd', text: '#664d03' },
                                            tertiary:  { bg: '#fce8e6', text: '#c5221f' },
                                        };
                                        const tc = TIER_COLOR[r.tier] ?? {};

                                        return (
                                            <tr key={r.hcp_id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/hcps/${r.hcp_id}`)}>
                                                <td>
                                                    <div className="fw-semibold" style={{ color: '#111' }}>{r.hcp_name}</div>
                                                    <div className="font-monospace text-muted" style={{ fontSize: 11 }}>{r.hcp_code}</div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: tc.bg, color: tc.text, fontSize: 11, textTransform: 'capitalize' }}>
                                                        {r.tier ?? '-'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: ms.bg, color: ms.color, fontSize: 11 }}>
                                                        {ms.label ?? r.payment_model}
                                                    </span>
                                                </td>
                                                <td className="text-end font-monospace">
                                                    {r.capitation_amount > 0
                                                        ? <span style={{ color: '#0f4c81', fontWeight: 600 }}>{formatCurrency(r.capitation_amount)}</span>
                                                        : <span className="text-muted">-</span>}
                                                </td>
                                                <td className="text-center">
                                                    {r.ffs_pending_count > 0
                                                        ? <span className="badge bg-warning-subtle text-warning fw-bold">{r.ffs_pending_count} pending</span>
                                                        : <span className="text-muted">-</span>}
                                                </td>
                                                <td className="text-end font-monospace">
                                                    {r.ffs_pending_amount > 0
                                                        ? <span style={{ color: '#166534', fontWeight: 600 }}>{formatCurrency(r.ffs_pending_amount)}</span>
                                                        : <span className="text-muted">-</span>}
                                                </td>
                                                <td className="text-end">
                                                    <strong style={{ color: '#5e35b1', fontSize: 14 }}>{formatCurrency(r.total_liability)}</strong>
                                                </td>
                                                <td>
                                                    {r.ffs_pending_count > 0 && (
                                                        <button
                                                            className="btn btn-sm btn-outline-success py-0"
                                                            style={{ fontSize: 11 }}
                                                            title="Create FFS batch for this provider"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                navigate(`/finance?create_batch=ffs&hcp_id=${r.hcp_id}`);
                                                            }}
                                                        >
                                                            Batch FFS
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {/* Footer totals */}
                                <tfoot style={{ borderTop: '2px solid #e5e7eb', background: '#f8fafc' }}>
                                    <tr>
                                        <td colSpan={3} className="fw-bold ps-3" style={{ fontSize: 13 }}>
                                            Totals ({rows.length} HCPs)
                                        </td>
                                        <td className="text-end fw-bold font-monospace" style={{ color: '#0f4c81' }}>
                                            {formatCurrency(rows.reduce((s, r) => s + r.capitation_amount, 0))}
                                        </td>
                                        <td className="text-center fw-bold" style={{ color: '#b45309' }}>
                                            {rows.reduce((s, r) => s + r.ffs_pending_count, 0)} claims
                                        </td>
                                        <td className="text-end fw-bold font-monospace" style={{ color: '#166534' }}>
                                            {formatCurrency(rows.reduce((s, r) => s + r.ffs_pending_amount, 0))}
                                        </td>
                                        <td className="text-end">
                                            <strong style={{ color: '#5e35b1', fontSize: 15 }}>
                                                {formatCurrency(rows.reduce((s, r) => s + r.total_liability, 0))}
                                            </strong>
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
