/**
 * FinancePage — /finance
 * Permission: finance.view
 *
 * Tabs:
 *   1. Payment Batches — list, create, navigate to detail
 *   2. Ledger — credit/debit entries, running balance
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Plus, Download, TrendingUp, TrendingDown, Wallet, Clock,
    FileText, Filter, Search, RefreshCw, Activity,
} from 'lucide-react';
// import { fetchBatches, createBatch, fetchLedger, fetchLedgerSummary } from '../../api/index';
import { 
    fetchPaymentBatches as fetchBatches, 
    createPaymentBatch as createBatch, 
    fetchLedger, 
    fetchLedgerSummary 
} from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const BATCH_STATUS_COLOR = {
    draft: 'secondary', submitted: 'warning', approved: 'primary',
    processing: 'info', completed: 'success', failed: 'danger', reversed: 'dark',
};

const ENTRY_TYPE_COLOR = { credit: 'success', debit: 'danger' };

export default function FinancePage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState('batches');

    return (
        <div>
            <PageHeader
                title="Finance & Payments"
                subtitle="Manage payment batches, provider remittances and the general ledger"
                actions={
                    hasPermission('finance.batch_create') && activeTab === 'batches' && (
                        <CreateBatchButton qc={qc} navigate={navigate} />
                    )
                }
            />

            {/* Tab switcher */}
            <ul className="nav nav-tabs mb-4" style={{ fontSize: 13 }}>
                {[
                    { key: 'batches', label: 'Payment Batches' },
                    hasPermission('finance.ledger_view') && { key: 'ledger', label: 'General Ledger' },
                    hasPermission('finance.capitation')  && { key: 'capitation', label: 'Capitation' },
                ].filter(Boolean).map(tab => (
                    <li key={tab.key} className="nav-item">
                        <button
                            className={`nav-link d-inline-flex align-items-center ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => {
                                if (tab.key === 'capitation') {
                                    navigate('/finance/capitation');
                                } else {
                                    setActiveTab(tab.key);
                                }
                            }}
                        >
                            {tab.key === 'capitation' && <Activity size={13} className="me-1" />}
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {activeTab === 'batches' && <BatchesTab navigate={navigate} />}
            {activeTab === 'ledger'  && <LedgerTab />}
        </div>
    );
}

/* ── Payment Batches Tab ─────────────────────────────────────────────────── */

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

function BatchesTab({ navigate }) {
    const [page, setPage]         = useState(1);
    const [statusFilter, setStatus] = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['batches', { page, status: statusFilter }],
        queryFn:  () => fetchBatches({ page, status: statusFilter || undefined }),
        keepPreviousData: true,
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    // const batches = data?.data ?? [];
    const batches = data?.data?.data ?? data?.data ?? [];

    // KPI cards — computed from the current page for a quick at-a-glance
    const kpis = [
        {
            label: 'Pending Approval',
            value: batches.filter(b => b.status === 'submitted').length,
            color: '#b05e00',
            bg:    '#fef7e0',
            icon:  <Clock size={18} />,
        },
        {
            label: 'Approved — Queued',
            value: batches.filter(b => b.status === 'approved').length,
            color: '#1967d2',
            bg:    '#e8f0fe',
            icon:  <FileText size={18} />,
        },
        {
            label: 'Completed this page',
            value: batches.filter(b => b.status === 'completed').length,
            color: '#137333',
            bg:    '#e6f4ea',
            icon:  <TrendingUp size={18} />,
        },
        {
            label: 'Total Value (page)',
            value: formatCurrency(batches.reduce((s, b) => s + parseFloat(b.total_amount ?? 0), 0), false),
            color: '#5e35b1',
            bg:    '#f3e8fd',
            icon:  <Wallet size={18} />,
        },
    ];

    return (
        <div>
            {/* KPIs */}
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
                                    <div className="fw-bold" style={{ fontSize: 20, color: k.color, lineHeight: 1.2 }}>
                                        {k.value}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2">
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <Filter size={14} className="text-muted" />
                        <span className="text-muted me-1" style={{ fontSize: 12 }}>Status:</span>
                        {['','draft','submitted','approved','completed','reversed'].map(s => (
                            <button key={s}
                                className={`btn btn-sm rounded-pill ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ fontSize: 11 }}
                                onClick={() => { setStatus(s); setPage(1); }}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
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
                                                <span className="fw-semibold font-monospace" style={{ fontSize: 12 }}>
                                                    {b.batch_number}
                                                </span>
                                                {b.description && (
                                                    <div className="text-muted" style={{ fontSize: 11 }}>{b.description}</div>
                                                )}
                                            </td>
                                            <td className="text-center" style={{ fontSize: 13 }}>{b.claim_count}</td>
                                            <td className="text-center" style={{ fontSize: 13 }}>{b.provider_count}</td>
                                            <td className="text-end fw-bold" style={{ fontSize: 14 }}>
                                                {formatCurrency(b.total_amount)}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{formatDateTime(b.created_at)}</td>
                                            <td style={{ fontSize: 12 }}>
                                                {b.approved_by?.name ?? <span className="text-muted">—</span>}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    status={b.status}
                                                    color={BATCH_STATUS_COLOR[b.status] ?? 'secondary'}
                                                    label={b.status_label ?? b.status}
                                                />
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-primary py-0"
                                                        style={{ fontSize: 11 }}
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

/* ── General Ledger Tab ──────────────────────────────────────────────────── */

function LedgerTab() {
    const [page, setPage]         = useState(1);
    const [entryType, setEntry]   = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo]     = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['ledger', { page, entryType, dateFrom, dateTo }],
        queryFn:  () => fetchLedger({
            page,
            entry_type: entryType || undefined,
            date_from:  dateFrom  || undefined,
            date_to:    dateTo    || undefined,
        }),
        keepPreviousData: true,
    });

    const { data: summaryData } = useQuery({
        queryKey: ['ledger-summary'],
        queryFn:  fetchLedgerSummary,
        staleTime: 60000,
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const entries = data?.data ?? [];
    const summary = summaryData?.data;

    return (
        <div>
            {/* Balance summary */}
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
                                        <div className="fw-bold" style={{ fontSize: 18, color: k.color }}>
                                            {k.value}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
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
                        <span className="text-muted">—</span>
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

            {/* Ledger table */}
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
                                    {entries.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                                {formatDate(e.entry_date)}
                                            </td>
                                            <td>
                                                <span className={`badge bg-${ENTRY_TYPE_COLOR[e.entry_type]}-subtle text-${ENTRY_TYPE_COLOR[e.entry_type]}`}
                                                      style={{ fontSize: 10 }}>
                                                    {e.entry_type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border"
                                                      style={{ fontSize: 10 }}>
                                                    {e.category?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{e.description}</td>
                                            <td className="font-monospace" style={{ fontSize: 11 }}>
                                                {e.reference_number ?? '—'}
                                            </td>
                                            <td className="text-end fw-semibold"
                                                style={{
                                                    fontSize: 13,
                                                    color: e.entry_type === 'credit' ? '#137333' : '#c5221f',
                                                }}>
                                                {e.entry_type === 'credit' ? '+' : '−'}
                                                {formatCurrency(Math.abs(e.amount))}
                                            </td>
                                            <td className="text-end" style={{ fontSize: 12 }}>
                                                {e.running_balance != null
                                                    ? formatCurrency(e.running_balance)
                                                    : <span className="text-muted">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {entries.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-5 text-center text-muted">
                                                No ledger entries match the current filters.
                                            </td>
                                        </tr>
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