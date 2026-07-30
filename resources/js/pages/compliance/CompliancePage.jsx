/**
 * FILE LOCATION: resources/js/pages/compliance/CompliancePage.jsx
 * ROUTE:         /compliance
 * PERMISSION:    compliance.view
 *
 * Compliance Calendar - tracks regulatory obligations, internal audits,
 * contract renewals, and recurring filing deadlines.
 *
 * Tabs:
 *   Calendar - visual 3-month forward view of all due dates
 *   Filings  - full list with filters, create, complete, upload docs
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    CalendarDays, Plus, CheckCircle, Upload, ChevronRight,
    AlertTriangle, Clock, FileText, Filter, AlertOctagon, X,
} from 'lucide-react';
import {
    fetchFilings, fetchComplianceSummary, createFiling,
    completeFiling, uploadFilingDoc,
    fetchBreaches, createBreach, updateBreach, // PHASE 6
} from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert, Pagination } from '../../components/ui/index';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_LABEL = {
    nhis_return:       'NHIS Return',
    naicom_filing:     'NAICOM Filing',
    nitda_report:      'NITDA Report',
    internal_audit:    'Internal Audit',
    contract_renewal:  'Contract Renewal',
    accreditation:     'Accreditation',
    tax_filing:        'Tax Filing',
    board_resolution:  'Board Resolution',
    staff_certification:'Staff Cert',
    other:             'Other',
};

const STATUS_META = {
    upcoming:    { label: 'Upcoming',    color: '#2563eb', bg: '#eff6ff' },
    in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
    submitted:   { label: 'Submitted',   color: '#7c3aed', bg: '#f5f3ff' },
    completed:   { label: 'Completed',   color: '#059669', bg: '#f0fdf4' },
    overdue:     { label: 'Overdue',     color: '#dc2626', bg: '#fef2f2' },
    waived:      { label: 'Waived',      color: '#6b7280', bg: '#f3f4f6' },
};

const PRIORITY_META = {
    low:      { color: '#6b7280', bg: '#f3f4f6' },
    medium:   { color: '#2563eb', bg: '#eff6ff' },
    high:     { color: '#d97706', bg: '#fffbeb' },
    critical: { color: '#dc2626', bg: '#fef2f2' },
};

const URGENCY_COLOR = {
    overdue:  '#dc2626',
    critical: '#dc2626',
    warning:  '#d97706',
    normal:   '#059669',
};

export default function CompliancePage() {
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState('calendar');
    const [showCreate, setShowCreate] = useState(false);
    const [detailFiling, setDetailFiling] = useState(null);
    const canManage = hasPermission('compliance.manage');

    return (
        <div>
            <PageHeader
                title="Compliance Calendar"
                subtitle="Regulatory obligations, audit schedules, and filing deadlines"
                actions={
                    canManage && (
                        <button
                            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus size={14} /> Add Filing
                        </button>
                    )
                }
            />

            {/* Summary KPIs */}
            <SummaryCards />

            {/* Tabs */}
            <ul className="nav nav-tabs mb-0" style={{ fontSize: 13 }}>
                {[
                    { key: 'calendar', label: 'Calendar' },
                    { key: 'filings',  label: 'All Filings' },
                    { key: 'breaches', label: 'Data Breaches' },
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

            {activeTab === 'calendar' && (
                <CalendarTab onSelect={setDetailFiling} canManage={canManage} />
            )}
            {activeTab === 'filings' && (
                <FilingsTab
                    onSelect={setDetailFiling}
                    canManage={canManage}
                    qc={qc}
                />
            )}
            {activeTab === 'breaches' && (
                <BreachesTab canManage={canManage} qc={qc} />
            )}

            {showCreate && (
                <CreateFilingModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        qc.invalidateQueries({ queryKey: ['filings'] });
                        qc.invalidateQueries({ queryKey: ['compliance-summary'] });
                        setShowCreate(false);
                    }}
                />
            )}

            {detailFiling && (
                <FilingDetailModal
                    filing={detailFiling}
                    canManage={canManage}
                    onClose={() => setDetailFiling(null)}
                    onUpdate={(updated) => {
                        qc.invalidateQueries({ queryKey: ['filings'] });
                        qc.invalidateQueries({ queryKey: ['compliance-summary'] });
                        setDetailFiling(updated ?? null);
                    }}
                />
            )}
        </div>
    );
}

/* ── Summary KPI Cards ──────────────────────────────────────────────────────── */

function SummaryCards() {
    const { data, isLoading } = useQuery({
        queryKey:  ['compliance-summary'],
        queryFn:   fetchComplianceSummary,
        staleTime: 60_000,
    });
    const d = data?.data ?? {};

    return (
        <div className="row g-3 mb-4">
            {[
                { label: 'Overdue',        value: d.overdue,          icon: AlertTriangle, color: d.overdue > 0 ? '#dc2626' : '#059669', bg: d.overdue > 0 ? '#fef2f2' : '#f0fdf4' },
                { label: 'Due This Month', value: d.due_this_month,   icon: CalendarDays,  color: '#d97706', bg: '#fffbeb' },
                { label: 'Due in 7 Days',  value: d.due_next_7_days,  icon: Clock,         color: d.due_next_7_days > 0 ? '#dc2626' : '#059669', bg: d.due_next_7_days > 0 ? '#fef2f2' : '#f0fdf4' },
                { label: 'Completed (MTD)',value: d.completed_month,   icon: CheckCircle,   color: '#059669', bg: '#f0fdf4' },
            ].map(card => (
                <div key={card.label} className="col-md-3">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                        <div className="card-body d-flex align-items-start gap-3" style={{ padding: '16px 20px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <card.icon size={18} color={card.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.label}</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: card.color, lineHeight: 1.2 }}>
                                    {isLoading ? '…' : (card.value ?? '-')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Calendar Tab ────────────────────────────────────────────────────────────── */

function CalendarTab({ onSelect }) {
    const { data, isLoading } = useQuery({
        queryKey: ['compliance-summary'],
        queryFn:  fetchComplianceSummary,
        staleTime: 60_000,
    });
    const items = data?.data?.calendar_items ?? [];

    // Group by month
    const byMonth = useMemo(() => {
        const groups = {};
        for (const item of items) {
            const key = item.due_date.slice(0, 7); // YYYY-MM
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        }
        return groups;
    }, [items]);

    const months = Object.keys(byMonth).sort();

    if (isLoading) return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body py-5"><LoadingSpinner /></div></div>;

    return (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}>
            <div className="card-body">
                {months.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <CalendarDays size={40} className="mb-3 opacity-25" />
                        <div>No upcoming filings in the next 3 months.</div>
                    </div>
                ) : (
                    months.map(month => {
                        const label = new Date(month + '-01').toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
                        return (
                            <div key={month} className="mb-5">
                                <div className="fw-bold mb-3" style={{ fontSize: 15, color: '#0f4c81', borderBottom: '2px solid #e8f0fe', paddingBottom: 8 }}>
                                    {label}
                                </div>
                                <div className="row g-3">
                                    {byMonth[month].map(item => {
                                        const st = STATUS_META[item.status] ?? STATUS_META.upcoming;
                                        const pr = PRIORITY_META[item.priority] ?? PRIORITY_META.medium;
                                        const dueDate = new Date(item.due_date);
                                        const day = dueDate.getDate();
                                        const mon = dueDate.toLocaleDateString('en-NG', { month: 'short' });

                                        return (
                                            <div key={item.id} className="col-md-4 col-lg-3">
                                                <div
                                                    className="d-flex gap-3 p-3 rounded-3 border"
                                                    style={{ cursor: 'pointer', background: '#fafbff', transition: 'box-shadow 0.15s' }}
                                                    onClick={() => onSelect(item)}
                                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                                >
                                                    {/* Date block */}
                                                    <div style={{ textAlign: 'center', minWidth: 40 }}>
                                                        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f4c81', lineHeight: 1 }}>{day}</div>
                                                        <div style={{ fontSize: 11, color: '#6b7280' }}>{mon}</div>
                                                    </div>
                                                    {/* Content */}
                                                    <div className="flex-grow-1 overflow-hidden">
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.title}
                                                        </div>
                                                        <div className="d-flex gap-2 mt-1 flex-wrap">
                                                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8, color: st.color, background: st.bg }}>
                                                                {st.label}
                                                            </span>
                                                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 8, color: pr.color, background: pr.bg }}>
                                                                {item.priority}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                                            {CATEGORY_LABEL[item.category] ?? item.category}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ── Filings Tab ─────────────────────────────────────────────────────────────── */

function FilingsTab({ onSelect, canManage, qc }) {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [category, setCategory] = useState('');

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey:  ['filings', page, status, category],
        queryFn:   () => fetchFilings({ page, per_page: 25, status: status || undefined, category: category || undefined }),
        keepPreviousData: true,
    });

    const filings = data?.data ?? [];

    if (isLoading) return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body py-5"><LoadingSpinner /></div></div>;
    if (isError)   return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body"><ErrorAlert message="Failed to load filings." onRetry={refetch} /></div></div>;

    return (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}>
            {/* Filters */}
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center gap-3">
                <select className="form-select form-select-sm" style={{ width: 160 }}
                        value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <select className="form-select form-select-sm" style={{ width: 180 }}
                        value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                    <option value="">All Categories</option>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
            </div>

            {filings.length === 0 ? (
                <div className="card-body text-center py-5 text-muted">
                    <FileText size={36} className="mb-3 opacity-25" />
                    <div>No filings match the current filters.</div>
                </div>
            ) : (
                <>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>Filing</th>
                                    <th>Category</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Priority</th>
                                    <th>Assigned To</th>
                                    <th className="text-end">Days</th>
                                    <th>Docs</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filings.map(f => {
                                    const st = STATUS_META[f.status] ?? STATUS_META.upcoming;
                                    const pr = PRIORITY_META[f.priority] ?? PRIORITY_META.medium;
                                    const urgColor = URGENCY_COLOR[f.urgency] ?? '#374151';

                                    return (
                                        <tr key={f.id} onClick={() => onSelect(f)} style={{ cursor: 'pointer' }}>
                                            <td className="ps-4">
                                                <div style={{ fontWeight: 600, color: '#111', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {f.title}
                                                </div>
                                                {f.recurrence !== 'none' && (
                                                    <div style={{ fontSize: 10, color: '#6b7280' }}>↻ {f.recurrence}</div>
                                                )}
                                            </td>
                                            <td style={{ color: '#374151' }}>
                                                {CATEGORY_LABEL[f.category] ?? f.category}
                                            </td>
                                            <td style={{ color: '#374151' }}>
                                                {formatDate(f.due_date)}
                                            </td>
                                            <td>
                                                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: st.color, background: st.bg }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: pr.color, background: pr.bg, textTransform: 'capitalize' }}>
                                                    {f.priority}
                                                </span>
                                            </td>
                                            <td style={{ color: '#374151', fontSize: 12 }}>
                                                {f.assigned_to_name ?? '-'}
                                            </td>
                                            <td className="text-end">
                                                <span style={{ fontWeight: 700, color: urgColor }}>
                                                    {f.is_overdue ? `+${Math.abs(f.days_until_due)}d` : `${f.days_until_due}d`}
                                                </span>
                                            </td>
                                            <td>
                                                {f.document_count > 0 && (
                                                    <span style={{ fontSize: 11, color: '#2563eb' }}>
                                                        {f.document_count} doc{f.document_count !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td><ChevronRight size={14} className="text-muted" /></td>
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

/* ── Create Filing Modal ─────────────────────────────────────────────────────── */

function CreateFilingModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        category: 'nhis_return', title: '', description: '',
        due_date: '', priority: 'medium', recurrence: 'none',
        assigned_to: '', notes: '',
    });
    const [errors, setErrors] = useState({});

    const mutation = useMutation({
        mutationFn: createFiling,
        onSuccess:  () => { toast.success('Filing created.'); onSuccess(); },
        onError:    (err) => {
            toast.error(err.response?.data?.message ?? 'Failed to create filing.');
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
        },
    });

    const f = (name, label, type = 'text', extra = {}) => (
        <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>{label}</label>
            {type === 'textarea' ? (
                <textarea className="form-control form-control-sm" rows={2}
                          value={form[name]}
                          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                          {...extra} />
            ) : (
                <input type={type} className={`form-control form-control-sm ${errors[name] ? 'is-invalid' : ''}`}
                       value={form[name]}
                       onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                       {...extra} />
            )}
            {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
        </div>
    );

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold">Add Compliance Filing</h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Category</label>
                                <select className="form-select form-select-sm" value={form.category}
                                        onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-6">
                                {f('title', 'Title')}
                            </div>
                            <div className="col-12">
                                {f('description', 'Description', 'textarea')}
                            </div>
                            <div className="col-md-4">
                                {f('due_date', 'Due Date', 'date')}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Priority</label>
                                <select className="form-select form-select-sm" value={form.priority}
                                        onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                    {['low', 'medium', 'high', 'critical'].map(p => (
                                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Recurrence</label>
                                <select className="form-select form-select-sm" value={form.recurrence}
                                        onChange={e => setForm(p => ({ ...p, recurrence: e.target.value }))}>
                                    {['none', 'monthly', 'quarterly', 'biannual', 'annual'].map(r => (
                                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-12">
                                {f('notes', 'Notes', 'textarea')}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary btn-sm" disabled={mutation.isPending}
                                onClick={() => mutation.mutate(form)}>
                            {mutation.isPending ? <><span className="spinner-border spinner-border-sm me-1" /> Saving…</> : 'Create Filing'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Filing Detail Modal ─────────────────────────────────────────────────────── */

function FilingDetailModal({ filing, canManage, onClose, onUpdate }) {
    const qc = useQueryClient();
    const [showComplete, setShowComplete] = useState(false);
    const [completeForm, setCompleteForm] = useState({ submission_reference: '', completion_notes: '' });
    const [uploading, setUploading] = useState(false);

    const completeMutation = useMutation({
        mutationFn: (data) => completeFiling(filing.id, data),
        onSuccess:  (res) => {
            toast.success('Filing marked complete.');
            onUpdate(res.data?.data ?? null);
            setShowComplete(false);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed.'),
    });

    const st = STATUS_META[filing.status] ?? STATUS_META.upcoming;
    const pr = PRIORITY_META[filing.priority] ?? PRIORITY_META.medium;
    const isTerminal = ['completed', 'waived'].includes(filing.status);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('document', file);
            fd.append('doc_name', file.name);
            await uploadFilingDoc(filing.id, fd);
            toast.success('Document uploaded.');
            qc.invalidateQueries({ queryKey: ['filings'] });
            onUpdate({ ...filing });
        } catch {
            toast.error('Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1055 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <div>
                            <h5 className="modal-title fw-bold mb-1">{filing.title}</h5>
                            <div className="d-flex gap-2">
                                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
                                <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: pr.color, background: pr.bg, textTransform: 'capitalize' }}>{filing.priority}</span>
                            </div>
                        </div>
                        <button className="btn-close" onClick={onClose} />
                    </div>

                    <div className="modal-body">
                        {/* Meta grid */}
                        <div className="row g-3 mb-4">
                            {[
                                { label: 'Category',    value: CATEGORY_LABEL[filing.category] ?? filing.category },
                                { label: 'Due Date',    value: formatDate(filing.due_date), bold: true, color: URGENCY_COLOR[filing.urgency] },
                                { label: 'Days Until Due', value: filing.is_overdue ? `${Math.abs(filing.days_until_due)}d overdue` : `${filing.days_until_due}d remaining`, color: URGENCY_COLOR[filing.urgency] },
                                { label: 'Recurrence',  value: filing.recurrence === 'none' ? 'One-time' : filing.recurrence },
                                { label: 'Assigned To', value: filing.assigned_to_name ?? 'Unassigned' },
                                { label: 'Documents',   value: `${filing.document_count ?? 0} file(s)` },
                            ].map(row => (
                                <div key={row.label} className="col-md-4">
                                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{row.label}</div>
                                    <div style={{ fontSize: 13, fontWeight: row.bold ? 700 : 500, color: row.color ?? '#111', marginTop: 2 }}>
                                        {row.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filing.description && (
                            <div className="mb-4">
                                <div className="fw-semibold mb-1" style={{ fontSize: 13 }}>Description</div>
                                <div style={{ fontSize: 13, color: '#374151' }}>{filing.description}</div>
                            </div>
                        )}

                        {filing.submission_reference && (
                            <div className="alert alert-success py-2 mb-3" style={{ fontSize: 13 }}>
                                <strong>Submission Reference:</strong> {filing.submission_reference}
                                {filing.completion_notes && <div className="mt-1">{filing.completion_notes}</div>}
                            </div>
                        )}

                        {/* Complete form */}
                        {!isTerminal && canManage && showComplete && (
                            <div className="border rounded-3 p-3 mb-3 bg-light">
                                <div className="fw-semibold mb-2" style={{ fontSize: 13 }}>Mark as Complete</div>
                                <div className="mb-2">
                                    <label className="form-label mb-1" style={{ fontSize: 12 }}>Submission Reference (optional)</label>
                                    <input type="text" className="form-control form-control-sm"
                                           value={completeForm.submission_reference}
                                           onChange={e => setCompleteForm(p => ({ ...p, submission_reference: e.target.value }))}
                                           placeholder="e.g. NHIS/2025/06/00123" />
                                </div>
                                <div className="mb-2">
                                    <label className="form-label mb-1" style={{ fontSize: 12 }}>Notes</label>
                                    <textarea className="form-control form-control-sm" rows={2}
                                              value={completeForm.completion_notes}
                                              onChange={e => setCompleteForm(p => ({ ...p, completion_notes: e.target.value }))} />
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-success btn-sm"
                                            disabled={completeMutation.isPending}
                                            onClick={() => completeMutation.mutate(completeForm)}>
                                        {completeMutation.isPending ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                                        Confirm Complete
                                    </button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowComplete(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex gap-2">
                            {/* Upload */}
                            {canManage && !isTerminal && (
                                <label className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 mb-0">
                                    {uploading
                                        ? <span className="spinner-border spinner-border-sm" />
                                        : <><Upload size={13} /> Upload Doc</>
                                    }
                                    <input type="file" className="d-none" onChange={handleFileUpload} />
                                </label>
                            )}
                            {/* Complete */}
                            {canManage && !isTerminal && !showComplete && (
                                <button className="btn btn-sm btn-success d-flex align-items-center gap-1"
                                        onClick={() => setShowComplete(true)}>
                                    <CheckCircle size={13} /> Mark Complete
                                </button>
                            )}
                        </div>
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
/* ── PHASE 6 - Data Breach Register ──────────────────────────────────────────── */

const SEVERITY_META = {
    low:      { label: 'Low',      color: '#166534', bg: '#f0fdf4' },
    medium:   { label: 'Medium',   color: '#d97706', bg: '#fffbeb' },
    high:     { label: 'High',     color: '#c2410c', bg: '#fff7ed' },
    critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
};

const BREACH_STATUS_META = {
    open:       { label: 'Open',       color: '#dc2626', bg: '#fef2f2' },
    contained:  { label: 'Contained',  color: '#d97706', bg: '#fffbeb' },
    resolved:   { label: 'Resolved',   color: '#166534', bg: '#f0fdf4' },
};

function BreachesTab({ canManage, qc }) {
    const [status, setStatus] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [detail, setDetail] = useState(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['breaches', status],
        queryFn: () => fetchBreaches({ status: status || undefined }),
    });

    const breaches = data?.data ?? [];

    if (isLoading) return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body py-5"><LoadingSpinner /></div></div>;
    if (isError)   return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body"><ErrorAlert message="Failed to load breach register." onRetry={refetch} /></div></div>;

    return (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}>
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between gap-3">
                <select className="form-select form-select-sm" style={{ width: 160 }}
                        value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {Object.entries(BREACH_STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                {canManage && (
                    <button className="btn btn-sm btn-danger d-flex align-items-center gap-1" onClick={() => setShowCreate(true)}>
                        <Plus size={14} /> Log Incident
                    </button>
                )}
            </div>

            {breaches.length === 0 ? (
                <div className="card-body text-center py-5 text-muted">
                    <AlertOctagon size={36} className="mb-3 opacity-25" />
                    <div>No incidents logged. That's a good thing.</div>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>Incident</th>
                                <th>Severity</th>
                                <th>Discovered</th>
                                <th>Affected Records</th>
                                <th>Regulator Notified</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {breaches.map(b => (
                                <tr key={b.id} onClick={() => setDetail(b)} style={{ cursor: 'pointer' }}>
                                    <td className="ps-4">
                                        <div style={{ fontWeight: 600, color: '#111' }}>{b.title}</div>
                                        {b.is_notification_overdue && (
                                            <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>
                                                <AlertTriangle size={10} style={{ verticalAlign: 'middle' }} /> Notification deadline passed
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: SEVERITY_META[b.severity]?.color, background: SEVERITY_META[b.severity]?.bg }}>
                                            {SEVERITY_META[b.severity]?.label ?? b.severity}
                                        </span>
                                    </td>
                                    <td style={{ color: '#374151' }}>{formatDate(b.discovered_at)}</td>
                                    <td style={{ color: '#374151' }}>{b.affected_records_count}</td>
                                    <td>{b.regulator_notified ? <CheckCircle size={15} color="#166534" /> : <span style={{ color: '#a0aec0', fontSize: 11 }}>No</span>}</td>
                                    <td>
                                        <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: BREACH_STATUS_META[b.status]?.color, background: BREACH_STATUS_META[b.status]?.bg }}>
                                            {BREACH_STATUS_META[b.status]?.label ?? b.status}
                                        </span>
                                    </td>
                                    <td><ChevronRight size={14} className="text-muted" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate && (
                <CreateBreachModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        qc.invalidateQueries({ queryKey: ['breaches'] });
                        setShowCreate(false);
                    }}
                />
            )}

            {detail && (
                <BreachDetailModal
                    breach={detail}
                    canManage={canManage}
                    onClose={() => setDetail(null)}
                    onSuccess={() => {
                        qc.invalidateQueries({ queryKey: ['breaches'] });
                        setDetail(null);
                    }}
                />
            )}
        </div>
    );
}

function CreateBreachModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        title: '', description: '', data_categories_affected: '',
        affected_records_count: '', severity: 'medium', discovered_at: '',
    });

    const mutation = useMutation({
        mutationFn: () => createBreach(form),
        onSuccess: () => { toast.success('Incident logged.'); onSuccess(); },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Could not log the incident.'),
    });

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h6 className="modal-title d-flex align-items-center gap-2">
                            <AlertOctagon size={16} color="#dc2626" /> Log a Data Breach Incident
                        </h6>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body d-flex flex-column gap-3">
                        <div>
                            <label className="form-label small fw-semibold">Title</label>
                            <input className="form-control form-control-sm" value={form.title}
                                   onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                   placeholder="Brief summary of what happened" />
                        </div>
                        <div>
                            <label className="form-label small fw-semibold">What happened</label>
                            <textarea className="form-control form-control-sm" rows={3} value={form.description}
                                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div>
                            <label className="form-label small fw-semibold">Data categories affected</label>
                            <input className="form-control form-control-sm" value={form.data_categories_affected}
                                   onChange={e => setForm(f => ({ ...f, data_categories_affected: e.target.value }))}
                                   placeholder="e.g. NIN, bank details, health records" />
                        </div>
                        <div className="row g-2">
                            <div className="col-6">
                                <label className="form-label small fw-semibold">Affected records</label>
                                <input type="number" min="0" className="form-control form-control-sm" value={form.affected_records_count}
                                       onChange={e => setForm(f => ({ ...f, affected_records_count: e.target.value }))} />
                            </div>
                            <div className="col-6">
                                <label className="form-label small fw-semibold">Severity</label>
                                <select className="form-select form-select-sm" value={form.severity}
                                        onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                                    {Object.entries(SEVERITY_META).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="form-label small fw-semibold">Discovered at</label>
                            <input type="datetime-local" className="form-control form-control-sm" value={form.discovered_at}
                                   onChange={e => setForm(f => ({ ...f, discovered_at: e.target.value }))} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
                        <button className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                                disabled={mutation.isPending || !form.title || !form.discovered_at}
                                onClick={() => mutation.mutate()}>
                            {mutation.isPending ? <span className="spinner-border spinner-border-sm" /> : null}
                            Log Incident
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BreachDetailModal({ breach, canManage, onClose, onSuccess }) {
    const [remediation, setRemediation] = useState(breach.remediation_actions ?? '');

    const mutation = useMutation({
        mutationFn: (payload) => updateBreach(breach.id, payload),
        onSuccess: () => { toast.success('Incident updated.'); onSuccess(); },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Update failed.'),
    });

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h6 className="modal-title">{breach.title}</h6>
                        <button className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body d-flex flex-column gap-3">
                        <div className="d-flex gap-2">
                            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: SEVERITY_META[breach.severity]?.color, background: SEVERITY_META[breach.severity]?.bg }}>
                                {SEVERITY_META[breach.severity]?.label}
                            </span>
                            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, color: BREACH_STATUS_META[breach.status]?.color, background: BREACH_STATUS_META[breach.status]?.bg }}>
                                {BREACH_STATUS_META[breach.status]?.label}
                            </span>
                        </div>

                        {canManage && (
                            <>
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="regNotified"
                                           checked={!!breach.regulator_notified}
                                           onChange={e => mutation.mutate({ regulator_notified: e.target.checked })} />
                                    <label className="form-check-label small" htmlFor="regNotified">Regulator notified</label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="checkbox" id="subjNotified"
                                           checked={!!breach.data_subjects_notified}
                                           onChange={e => mutation.mutate({ data_subjects_notified: e.target.checked })} />
                                    <label className="form-check-label small" htmlFor="subjNotified">Affected data subjects notified</label>
                                </div>

                                <div>
                                    <label className="form-label small fw-semibold">Remediation actions</label>
                                    <textarea className="form-control form-control-sm" rows={3} value={remediation}
                                              onChange={e => setRemediation(e.target.value)} />
                                </div>

                                <div>
                                    <label className="form-label small fw-semibold">Status</label>
                                    <select className="form-select form-select-sm" value={breach.status}
                                            onChange={e => mutation.mutate({ status: e.target.value })}>
                                        {Object.entries(BREACH_STATUS_META).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        {canManage && (
                            <button className="btn btn-primary btn-sm"
                                    disabled={mutation.isPending}
                                    onClick={() => mutation.mutate({ remediation_actions: remediation })}>
                                Save remediation notes
                            </button>
                        )}
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
