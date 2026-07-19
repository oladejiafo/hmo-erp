/**
 * FILE LOCATION: resources/js/pages/preauth/PAListPage.jsx
 *
 * Pre-Authorisation Queue - the central clinical decision workspace.
 *
 * NHIA TAT standards enforced in this UI:
 *   Standard PA  → respond within 15–30 min  (yellow >15, red >30)
 *   Urgent PA    → respond within 30–60 min  (yellow >30, red >60)
 *   Emergency PA → auto-approved at admission, retrospective review within 24 hrs
 *
 * Tabs:
 *   Pending    - awaiting first approval decision (TAT clock active)
 *   Awaiting MD - approved at standard level, awaiting Medical Director (>₦500k)
 *   Awaiting CEO- approved at MD level, awaiting CEO sign-off (>₦2M)
 *   All        - full history with filters
 *
 * Permissions:
 *   pa.view             - see the queue
 *   pa.approve_standard - approve standard-value PAs
 *   pa.approve_high     - approve >₦500k PAs (Medical Director)
 *   pa.approve_critical - approve >₦2M PAs (CEO)
 *   pa.decline          - decline any PA
 *   pa.request          - submit new PA request
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Clock, AlertTriangle, CheckCircle, XCircle,
    Plus, Search, Filter, RefreshCw, Zap,
    TrendingUp, Timer, Activity, ShieldCheck,
} from 'lucide-react';
import { fetchPARequests, fetchPAStats } from '../../api/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/format';
import { StatusBadge, LoadingSpinner, ErrorAlert, PageHeader, Pagination } from '../../components/ui/index';

// ─────────────────── TAT helpers ──────────────────────────────────────────────

/**
 * Returns minutes elapsed since a given ISO timestamp.
 */
function minutesElapsed(isoStr) {
    return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
}

/**
 * For a given urgency and minutes elapsed, return TAT status.
 * standard: yellow >15 min, red >30 min
 * urgent:   yellow >30 min, red >60 min
 * emergency: always green (retrospective)
 */
function tatStatus(urgency, minutes) {
    if (urgency === 'emergency') return 'safe';
    const [warn, danger] = urgency === 'urgent' ? [30, 60] : [15, 30];
    if (minutes >= danger) return 'danger';
    if (minutes >= warn)   return 'warning';
    return 'safe';
}

const TAT_STYLE = {
    safe:    { bg: '#e6f4ea', color: '#137333', border: '#a8d5b5' },
    warning: { bg: '#fff8e1', color: '#b45309', border: '#fcd34d' },
    danger:  { bg: '#fce8e6', color: '#c5221f', border: '#fca5a5' },
};

/**
 * Live TAT clock component - re-renders every 30 seconds.
 */
function TATClock({ submittedAt, urgency, status }) {
    const [mins, setMins] = useState(minutesElapsed(submittedAt));

    useEffect(() => {
        if (!['pending', 'awaiting_md', 'awaiting_ceo'].includes(status)) return;
        const interval = setInterval(() => setMins(minutesElapsed(submittedAt)), 30000);
        return () => clearInterval(interval);
    }, [submittedAt, status]);

    if (!['pending', 'awaiting_md', 'awaiting_ceo'].includes(status)) return null;

    const ts  = tatStatus(urgency, mins);
    const sty = TAT_STYLE[ts];
    const h   = Math.floor(mins / 60);
    const m   = mins % 60;
    const label = h > 0 ? `${h}h ${m}m` : `${m}m`;

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
            padding: '3px 8px', borderRadius: 8,
            background: sty.bg, color: sty.color,
            border: `1px solid ${sty.border}`,
        }}>
            <Timer size={10} />
            {label}
            {ts === 'danger'  && ' ⚠ OVERDUE'}
            {ts === 'warning' && ' ⚡ DUE SOON'}
        </span>
    );
}

// ─────────────────── Status config ────────────────────────────────────────────

const STATUS_CFG = {
    pending:      { label: 'Pending',         color: 'warning' },
    awaiting_md:  { label: 'Awaiting MD',     color: 'info'    },
    awaiting_ceo: { label: 'Awaiting CEO',    color: 'primary' },
    approved:     { label: 'Approved',        color: 'success' },
    declined:     { label: 'Declined',        color: 'danger'  },
    expired:      { label: 'Expired',         color: 'dark'    },
    used:         { label: 'Used',            color: 'secondary'},
    revoked:      { label: 'Revoked',         color: 'dark'    },
};

const URGENCY_CFG = {
    standard:  { label: 'Standard',  bg: '#e8f0fe', color: '#1967d2' },
    urgent:    { label: 'Urgent',    bg: '#fff3e0', color: '#e65100' },
    emergency: { label: 'Emergency', bg: '#fce8e6', color: '#c5221f' },
};

// ─────────────────── Main component ───────────────────────────────────────────

export default function PAListPage() {
    const { hasPermission } = useAuth();
    const navigate          = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = searchParams.get('tab') || 'pending';
    const [search,   setSearch]   = useState('');
    const [urgency,  setUrgency]  = useState('');
    const [page,     setPage]     = useState(1);

    const setTab = (t) => { setSearchParams({ tab: t }); setPage(1); };

    // Tab → status filter mapping
    const statusForTab = {
        pending:      'pending',
        awaiting_md:  'awaiting_md',
        awaiting_ceo: 'awaiting_ceo',
        all:          '',
    };

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['pa-requests', activeTab, search, urgency, page],
        queryFn:  () => fetchPARequests({
            status:  statusForTab[activeTab] ?? '',
            search,
            urgency: urgency || undefined,
            page,
        }),
        refetchInterval: activeTab !== 'all' ? 60000 : false,  // live refresh pending queue
    });

    const { data: statsData } = useQuery({
        queryKey: ['pa-stats'],
        queryFn:  fetchPAStats,
        refetchInterval: 120000,
    });

    const requests = data?.data ?? [];
    const meta     = data?.meta ?? {};
    const stats    = statsData?.data ?? {};

    const canRequest = hasPermission('pa.request');
    const canView    = hasPermission('pa.view');

    const tabs = [
        { key: 'pending',      label: 'Pending Queue',    count: stats.pending_count    ?? 0, urgent: stats.overdue_count ?? 0 },
        { key: 'awaiting_md',  label: 'Awaiting MD',      count: stats.awaiting_md_count ?? 0 },
        { key: 'awaiting_ceo', label: 'Awaiting CEO',     count: stats.awaiting_ceo_count ?? 0 },
        { key: 'all',          label: 'All Requests',     count: null },
    ];

    return (
        <div>
            <PageHeader
                title="Pre-Authorisation"
                subtitle="Clinical PA queue - NHIA TAT standards enforced"
                actions={
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                            onClick={() => refetch()}
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canRequest && (
                            <button
                                className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={() => navigate('/pre-auth/new')}
                            >
                                <Plus size={16} /> New PA Request
                            </button>
                        )}
                    </div>
                }
            />

            {/* Module info hint - This should be OUTSIDE the PageHeader component */}
            <div className="alert alert-light border-0 bg-light py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                <small className="text-muted d-flex align-items-center gap-2">
                    <ShieldCheck size={14} className="text-primary" />
                    <span>
                        <strong>Pre-Authorisation Module:</strong> Manage clinical approvals before service delivery. 
                        NHIA TAT standards: Standard (15-30 min), Urgent (30-60 min), Emergency (auto-approved, 24h review).
                    </span>
                </small>
            </div>

            {/* ── Stats bar ──────────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'Pending',         value: stats.pending_count    ?? 0, icon: Clock,        color: '#b45309', bg: '#fff8e1' },
                    { label: 'Overdue',         value: stats.overdue_count    ?? 0, icon: AlertTriangle, color: '#c5221f', bg: '#fce8e6' },
                    { label: 'Approved Today',  value: stats.approved_today   ?? 0, icon: CheckCircle,   color: '#137333', bg: '#e6f4ea' },
                    { label: 'Declined Today',  value: stats.declined_today   ?? 0, icon: XCircle,       color: '#555',    bg: '#f1f5f9' },
                    { label: 'Avg Response (min)', value: stats.avg_response_mins ?? '-', icon: Timer,   color: '#1967d2', bg: '#e8f0fe' },
                ].map(s => (
                    <div key={s.label} className="col-6 col-xl">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body py-3 d-flex align-items-center gap-3">
                                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                     style={{ width: 40, height: 40, background: s.bg }}>
                                    <s.icon size={18} color={s.color} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#718096' }}>{s.label}</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <ul className="nav nav-tabs mb-0" style={{ fontSize: 13, borderBottom: 'none' }}>
                {tabs.map(tab => (
                    <li key={tab.key} className="nav-item">
                        <button
                            className={`nav-link d-flex align-items-center gap-2 ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setTab(tab.key)}
                        >
                            {tab.label}
                            {tab.count != null && tab.count > 0 && (
                                <span className={`badge ${tab.urgent > 0 ? 'bg-danger' : 'bg-secondary'}`}
                                      style={{ fontSize: 10 }}>
                                    {tab.count}
                                    {tab.urgent > 0 && ` (${tab.urgent} overdue)`}
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>

            {/* ── Content panel ──────────────────────────────────────────── */}
            <div className="card border-0 shadow-sm" style={{ borderTopLeftRadius: 0 }}>
                {/* Filters */}
                <div className="card-header bg-white border-bottom py-3">
                    <div className="d-flex gap-2 flex-wrap align-items-center">
                        <div className="position-relative flex-grow-1" style={{ minWidth: 200 }}>
                            <Search size={14} className="position-absolute"
                                    style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by PA code, enrollee, or HCP…"
                                className="form-control form-control-sm"
                                style={{ paddingLeft: 30 }}
                            />
                        </div>
                        <select
                            value={urgency}
                            onChange={e => { setUrgency(e.target.value); setPage(1); }}
                            className="form-select form-select-sm"
                            style={{ width: 150 }}
                        >
                            <option value="">All Urgency</option>
                            <option value="standard">Standard</option>
                            <option value="urgent">Urgent</option>
                            <option value="emergency">Emergency</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="card-body p-0">
                    {isLoading ? (
                        <div className="d-flex justify-content-center py-5">
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <ErrorAlert error={error} />
                    ) : !requests.length ? (
                        <EmptyState tab={activeTab} />
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={TH}>PA Code</th>
                                        <th style={TH}>Enrollee / Dependant</th>
                                        <th style={TH}>HCP</th>
                                        <th style={TH}>Service / Diagnosis</th>
                                        <th style={TH} className="text-end">Est. Amount</th>
                                        <th style={TH}>Urgency</th>
                                        <th style={TH}>Status</th>
                                        <th style={TH}>TAT</th>
                                        <th style={TH}>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => {
                                        const urgCfg = URGENCY_CFG[req.urgency] ?? URGENCY_CFG.standard;
                                        const stsCfg = STATUS_CFG[req.status]  ?? { label: req.status, color: 'secondary' };
                                        return (
                                            <tr
                                                key={req.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/pre-auth/${req.id}`)}
                                            >
                                                <td style={TD}>
                                                    <span className="font-monospace fw-bold"
                                                          style={{ fontSize: 12, color: '#1967d2' }}>
                                                        {req.pa_code ?? <span className="text-muted">Pending…</span>}
                                                    </span>
                                                </td>
                                                <td style={TD}>
                                                    <div className="fw-semibold" style={{ fontSize: 13 }}>
                                                        {req.enrollee_name}
                                                    </div>
                                                    {req.dependent_name && (
                                                        <div className="text-muted" style={{ fontSize: 11 }}>
                                                            for: {req.dependent_name}
                                                        </div>
                                                    )}
                                                    <div className="font-monospace text-muted" style={{ fontSize: 10 }}>
                                                        {req.enrollee_member_no}
                                                    </div>
                                                </td>
                                                <td style={TD}>
                                                    <div style={{ fontSize: 13 }}>{req.hcp_name}</div>
                                                    <div className="text-muted" style={{ fontSize: 11 }}>
                                                        {req.hcp_tier}
                                                    </div>
                                                </td>
                                                <td style={{ ...TD, maxWidth: 220 }}>
                                                    <div style={{ fontSize: 13 }}>
                                                        {req.service_type_label ?? req.service_type}
                                                    </div>
                                                    {req.diagnosis_description && (
                                                        <div className="text-muted text-truncate" style={{ fontSize: 11 }}>
                                                            {req.diagnosis_description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ ...TD, textAlign: 'right' }}>
                                                    <span className="fw-semibold" style={{ fontSize: 13 }}>
                                                        {req.estimated_amount
                                                            ? formatCurrency(req.estimated_amount)
                                                            : <span className="text-muted">-</span>}
                                                    </span>
                                                    {req.estimated_amount > 2_000_000 && (
                                                        <div style={{ fontSize: 10, color: '#c5221f', fontWeight: 700 }}>
                                                            CEO REQUIRED
                                                        </div>
                                                    )}
                                                    {req.estimated_amount > 500_000 && req.estimated_amount <= 2_000_000 && (
                                                        <div style={{ fontSize: 10, color: '#b45309', fontWeight: 700 }}>
                                                            MD REQUIRED
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={TD}>
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 600,
                                                        padding: '3px 8px', borderRadius: 8,
                                                        background: urgCfg.bg, color: urgCfg.color,
                                                    }}>
                                                        {urgCfg.label}
                                                    </span>
                                                </td>
                                                <td style={TD}>
                                                    <StatusBadge
                                                        status={req.status}
                                                        color={stsCfg.color}
                                                        label={stsCfg.label}
                                                    />
                                                </td>
                                                <td style={TD}>
                                                    <TATClock
                                                        submittedAt={req.created_at}
                                                        urgency={req.urgency}
                                                        status={req.status}
                                                    />
                                                </td>
                                                <td style={{ ...TD, fontSize: 11, color: '#718096' }}>
                                                    {formatDateTime(req.created_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {meta?.last_page > 1 && (
                    <div className="card-footer bg-white border-top py-2">
                        <Pagination meta={meta} onPageChange={setPage} showInfo />
                    </div>
                )}
            </div>

            {/* TAT legend */}
            <div className="d-flex gap-3 mt-3 flex-wrap" style={{ fontSize: 11, color: '#718096' }}>
                <span>TAT Clock Legend:</span>
                {Object.entries(TAT_STYLE).map(([k, s]) => (
                    <span key={k} style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 6, border: `1px solid ${s.border}` }}>
                        {k === 'safe' ? '< threshold' : k === 'warning' ? '>15 min / >30 min urgent' : '>30 min / >60 min urgent'}
                    </span>
                ))}
            </div>
        </div>
    );
}

function EmptyState({ tab }) {
    const icons = { pending: Clock, awaiting_md: Activity, awaiting_ceo: TrendingUp, all: Filter };
    const Icon  = icons[tab] ?? Filter;
    const msgs  = {
        pending:      'No pending PA requests. The queue is clear.',
        awaiting_md:  'No requests awaiting Medical Director approval.',
        awaiting_ceo: 'No requests awaiting CEO approval.',
        all:          'No PA requests found matching your filters.',
    };
    return (
        <div className="text-center py-5">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                 style={{ width: 64, height: 64, background: '#f0f4f8' }}>
                <Icon size={28} color="#a0aec0" />
            </div>
            <div style={{ color: '#a0aec0', fontSize: 14 }}>{msgs[tab] ?? 'No results.'}</div>
        </div>
    );
}

const TH = { fontSize: 11, fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', padding: '10px 14px' };
const TD = { padding: '12px 14px', verticalAlign: 'middle' };