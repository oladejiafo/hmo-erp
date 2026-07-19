/**
 * FILE LOCATION: resources/js/pages/alerts/AlertsPage.jsx
 * ROUTE:         /alerts
 * PERMISSION:    authenticated (no extra permission - all staff see their own)
 *
 * In-app notification centre. Shows all notifications for the logged-in user,
 * filterable by type and read state. Clicking a notification marks it read
 * and navigates to the action_url if set.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Bell, CheckCheck, AlertTriangle, Info,
    ShieldAlert, Clock, FileText, DollarSign,
    Calendar, Activity, ChevronRight, BellOff,
} from 'lucide-react';
import {
    fetchNotifications, markNotificationRead, markAllNotificationsRead,
} from '../../api/index';
import { PageHeader, LoadingSpinner, Pagination } from '../../components/ui/index';

// ─── Notification type config ─────────────────────────────────────────────────

const TYPE_META = {
    sla_breach:         { icon: Clock,        label: 'SLA Breach',       color: '#dc2626', bg: '#fef2f2' },
    pa_pending:         { icon: ShieldAlert,   label: 'Pre-Auth. Approval',      color: '#7c3aed', bg: '#f5f3ff' },
    pa_expiring:        { icon: ShieldAlert,   label: 'Pre-Auth. Expiring',      color: '#d97706', bg: '#fffbeb' },
    fraud_flag:         { icon: AlertTriangle, label: 'Fraud Alert',      color: '#dc2626', bg: '#fef2f2' },
    batch_ready:        { icon: DollarSign,    label: 'Batch Ready',      color: '#2563eb', bg: '#eff6ff' },
    capitation_due:     { icon: Activity,      label: 'Capitation Due',   color: '#0f4c81', bg: '#e8f0fe' },
    plan_expiring:      { icon: FileText,      label: 'Plan Expiring',    color: '#d97706', bg: '#fffbeb' },
    contract_expiring:  { icon: FileText,      label: 'Contract Expiring',color: '#d97706', bg: '#fffbeb' },
    compliance_due:     { icon: Calendar,      label: 'Compliance Due',   color: '#d97706', bg: '#fffbeb' },
    compliance_overdue: { icon: Calendar,      label: 'Compliance Overdue',color: '#dc2626', bg: '#fef2f2' },
    system:             { icon: Info,          label: 'System',           color: '#6b7280', bg: '#f9fafb' },
};

const SEVERITY_COLOR = {
    info:     { badge: '#2563eb', badgeBg: '#eff6ff' },
    warning:  { badge: '#d97706', badgeBg: '#fffbeb' },
    critical: { badge: '#dc2626', badgeBg: '#fef2f2' },
};

const ALL_TYPES = Object.entries(TYPE_META).map(([k, v]) => ({ key: k, label: v.label }));

export default function AlertsPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey:  ['notifications', page, unreadOnly, typeFilter],
        queryFn:   () => fetchNotifications({
            page,
            per_page:    25,
            unread_only: unreadOnly || undefined,
            type:        typeFilter || undefined,
        }),
        keepPreviousData: true,
        refetchInterval:  30_000,
    });

    const markReadMutation = useMutation({
        mutationFn: (id) => markNotificationRead(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
            qc.invalidateQueries({ queryKey: ['notification-count'] });
        },
    });

    const markAllMutation = useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: (res) => {
            const n = res.data?.data?.marked_read ?? 0;
            toast.success(n > 0 ? `${n} notification(s) marked as read.` : 'All already read.');
            qc.invalidateQueries({ queryKey: ['notifications'] });
            qc.invalidateQueries({ queryKey: ['notification-count'] });
        },
        onError: () => toast.error('Failed to mark all read.'),
    });

    const notifications = data?.data ?? [];
    const meta          = data?.meta ?? {};
    const unreadTotal   = meta.unread_total ?? 0;

    const handleClick = (n) => {
        if (!n.is_read) {
            markReadMutation.mutate(n.id);
        }
        if (n.action_url) {
            navigate(n.action_url);
        }
    };

    return (
        <div>
            <PageHeader
                title="Notification Centre"
                subtitle={unreadTotal > 0 ? `${unreadTotal} unread notification${unreadTotal !== 1 ? 's' : ''}` : 'All caught up'}
                actions={
                    unreadTotal > 0 && (
                        <button
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                            disabled={markAllMutation.isPending}
                            onClick={() => markAllMutation.mutate()}
                        >
                            {markAllMutation.isPending
                                ? <span className="spinner-border spinner-border-sm" />
                                : <CheckCheck size={14} />
                            }
                            Mark All Read
                        </button>
                    )
                }
            />

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body py-3 d-flex align-items-center gap-3 flex-wrap">
                    {/* Unread toggle */}
                    <div className="form-check form-switch mb-0">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="unreadOnly"
                            checked={unreadOnly}
                            onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }}
                        />
                        <label className="form-check-label" htmlFor="unreadOnly" style={{ fontSize: 13 }}>
                            Unread only
                        </label>
                    </div>

                    <div className="vr" style={{ height: 24 }} />

                    {/* Type filter pills */}
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            className={`btn btn-sm ${!typeFilter ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => { setTypeFilter(''); setPage(1); }}
                        >
                            All
                        </button>
                        {ALL_TYPES.map(t => (
                            <button
                                key={t.key}
                                className={`btn btn-sm ${typeFilter === t.key ? 'btn-dark' : 'btn-outline-secondary'}`}
                                onClick={() => { setTypeFilter(t.key); setPage(1); }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notification list */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                {isLoading ? (
                    <div className="card-body py-5"><LoadingSpinner /></div>
                ) : isError ? (
                    <div className="card-body">
                        <div className="alert alert-danger">Failed to load notifications.</div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="card-body text-center py-5 text-muted">
                        <BellOff size={40} className="mb-3 opacity-25" />
                        <div className="fw-semibold mb-1">No notifications</div>
                        <div style={{ fontSize: 13 }}>
                            {unreadOnly ? 'No unread notifications.' : 'Nothing to show with the current filters.'}
                        </div>
                    </div>
                ) : (
                    <>
                        {notifications.map((n, i) => {
                            const meta  = TYPE_META[n.type] ?? TYPE_META.system;
                            const sev   = SEVERITY_COLOR[n.severity] ?? SEVERITY_COLOR.info;
                            const Icon  = meta.icon;

                            return (
                                <div
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    style={{
                                        display:         'flex',
                                        alignItems:      'flex-start',
                                        gap:             16,
                                        padding:         '16px 20px',
                                        borderBottom:    i < notifications.length - 1 ? '1px solid #f3f4f6' : 'none',
                                        background:      n.is_read ? '#fff' : '#fafbff',
                                        cursor:          n.action_url ? 'pointer' : 'default',
                                        transition:      'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (n.action_url) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? '#fff' : '#fafbff'; }}
                                >
                                    {/* Icon */}
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                                        background: meta.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Icon size={18} color={meta.color} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div className="d-flex align-items-start justify-content-between gap-2">
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 700, color: '#111' }}>
                                                    {n.title}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#374151', marginTop: 2, lineHeight: 1.5 }}>
                                                    {n.body}
                                                </div>
                                            </div>
                                            {/* Severity badge + unread dot */}
                                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                {n.severity !== 'info' && (
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                                                        color: sev.badge, background: sev.badgeBg,
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {n.severity}
                                                    </span>
                                                )}
                                                {!n.is_read && (
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: 4,
                                                        background: '#2563eb', flexShrink: 0,
                                                    }} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-center gap-3 mt-2">
                                            <span style={{
                                                fontSize: 10, fontWeight: 600, padding: '1px 7px',
                                                borderRadius: 8, color: meta.color, background: meta.bg,
                                            }}>
                                                {meta.label}
                                            </span>
                                            <span className="text-muted" style={{ fontSize: 11 }}>
                                                {n.created_ago}
                                            </span>
                                            {n.read_at && (
                                                <span className="text-muted" style={{ fontSize: 11 }}>
                                                    · Read
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chevron if clickable */}
                                    {n.action_url && (
                                        <ChevronRight size={15} className="text-muted flex-shrink-0 mt-1" />
                                    )}
                                </div>
                            );
                        })}

                        {meta.last_page > 1 && (
                            <div className="card-body border-top py-2">
                                <Pagination meta={meta} onPageChange={setPage} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}