import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTickets, fetchTicket, replyTicket, resolveTicket, closeTicket } from '../../api/index';
import { formatDate } from '../../utils/format';
import { MessageSquare, Filter } from 'lucide-react';

const STATUS_COLORS = { open: '#e65100', in_progress: '#1967d2', resolved: '#137333', closed: '#555' };

export default function TicketsQueuePage() {
    const [statusFilter, setStatusFilter] = useState('');
    const [openId, setOpenId] = useState(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({ 
        queryKey: ['staff-tickets', statusFilter], 
        queryFn: () => fetchTickets({ status: statusFilter || undefined }) 
    });
    const tickets = data?.data ?? [];

    if (isLoading) {
        return (
            <div style={{ padding: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>Support Tickets</h1>
                <p style={{ color: '#718096', marginTop: 16 }}>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Support Tickets</h1>
            </div>

            {/* Status Filter */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Filter size={14} color="#718096" />
                <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)} 
                    style={selectStyle}
                >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
                <span style={{ color: '#718096', fontSize: 12, marginLeft: 'auto' }}>
                    {tickets.length} ticket(s)
                </span>
            </div>

            {/* Content */}
            {tickets.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: 60, 
                    background: '#fff', 
                    borderRadius: 14, 
                    border: '1px solid #e8ecf0' 
                }}>
                    <MessageSquare size={40} color="#a0aec0" style={{ display: 'block', margin: '0 auto 12px' }} />
                    <div style={{ color: '#a0aec0', fontSize: 14 }}>No tickets found</div>
                    <p style={{ color: '#a0aec0', fontSize: 12, marginTop: 4 }}>
                        {statusFilter ? `No ${statusFilter} tickets at the moment.` : 'All support tickets will appear here.'}
                    </p>
                </div>
            ) : (
                <div>
                    {tickets.map(t => (
                        <div key={t.id}>
                            <div onClick={() => setOpenId(openId === t.id ? null : t.id)} style={rowStyle}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0f4c81' }}>{t.ticket_number}</span>
                                <span style={{ ...badgeStyle, background: STATUS_COLORS[t.status] || '#6c757d' }}>
                                    {t.status || 'unknown'}
                                </span>
                                <span style={{ fontWeight: 600 }}>{t.subject}</span>
                                <span style={{ color: '#718096', fontSize: 12 }}>
                                    {t.source} - {t.raised_by || 'Unknown'} - {t.context || 'N/A'}
                                </span>
                                <span style={{ 
                                    color: t.sla_status === 'danger' ? '#c5221f' : '#718096', 
                                    fontSize: 11,
                                    fontWeight: t.sla_status === 'danger' ? 600 : 400
                                }}>
                                    {t.sla_status || 'OK'}
                                </span>
                            </div>
                            {openId === t.id && (
                                <TicketDetail 
                                    id={t.id} 
                                    onChange={() => qc.invalidateQueries({ queryKey: ['staff-tickets'] })} 
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TicketDetail({ id, onChange }) {
    const [message, setMessage] = useState('');
    const [resolution, setResolution] = useState('');
    const { data, refetch } = useQuery({ 
        queryKey: ['staff-ticket', id], 
        queryFn: () => fetchTicket(id) 
    });
    const t = data?.data;

    const replyMutation = useMutation({ 
        mutationFn: () => replyTicket(id, message), 
        onSuccess: () => { setMessage(''); refetch(); } 
    });
    const resolveMutation = useMutation({ 
        mutationFn: () => resolveTicket(id, resolution), 
        onSuccess: () => { onChange(); refetch(); } 
    });
    const closeMutation = useMutation({ 
        mutationFn: () => closeTicket(id), 
        onSuccess: onChange 
    });

    if (!t) return <div style={{ padding: 16, color: '#718096' }}>Loading ticket details…</div>;

    return (
        <div style={detailStyle}>
            <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 13 }}>#{t.ticket_number}</strong>
                <span style={{ color: '#718096', fontSize: 12, marginLeft: 10 }}>
                    {t.status} · Created {formatDate(t.created_at)}
                </span>
                {t.resolved_at && (
                    <span style={{ color: '#718096', fontSize: 12, marginLeft: 10 }}>
                        Resolved {formatDate(t.resolved_at)}
                    </span>
                )}
            </div>

            {/* Messages */}
            {t.messages?.map(m => (
                <div key={m.id} style={{ 
                    fontSize: 12, 
                    marginBottom: 6, 
                    padding: '6px 10px',
                    background: m.sender_type === 'staff' ? '#e8f0fe' : '#f7fafc',
                    borderRadius: 6
                }}>
                    <strong>{m.sender_type}:</strong> {m.message} 
                    <span style={{ color: '#a0aec0', marginLeft: 8 }}>({formatDate(m.created_at)})</span>
                </div>
            ))}

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                    value={message} 
                    onChange={e => setMessage(e.target.value)} 
                    placeholder="Reply…" 
                    style={inputStyle} 
                />
                <button 
                    onClick={() => replyMutation.mutate()} 
                    disabled={!message || replyMutation.isPending}
                    style={buttonStyle('primary')}
                >
                    {replyMutation.isPending ? 'Sending...' : 'Send'}
                </button>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                    value={resolution} 
                    onChange={e => setResolution(e.target.value)} 
                    placeholder="Resolution note…" 
                    style={inputStyle} 
                />
                <button 
                    onClick={() => resolveMutation.mutate()} 
                    disabled={!resolution || resolveMutation.isPending}
                    style={buttonStyle('success')}
                >
                    {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
                </button>
                <button 
                    onClick={() => closeMutation.mutate()} 
                    disabled={closeMutation.isPending}
                    style={buttonStyle('secondary')}
                >
                    {closeMutation.isPending ? 'Closing...' : 'Close'}
                </button>
            </div>
        </div>
    );
}

function buttonStyle(type) {
    const colors = {
        primary: { bg: '#0f4c81', hover: '#1a6fad' },
        success: { bg: '#137333', hover: '#1a8a3f' },
        secondary: { bg: '#6c757d', hover: '#5a6268' },
    };
    const c = colors[type] || colors.primary;
    return {
        padding: '6px 14px',
        borderRadius: 6,
        border: 'none',
        background: c.bg,
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        opacity: 1,
        transition: 'background 0.15s',
    };
}

const selectStyle = { 
    padding: '6px 10px', 
    border: '1px solid #e2e8f0', 
    borderRadius: 8, 
    fontSize: 13,
    background: '#fff',
    minWidth: 140,
};
const rowStyle = { 
    display: 'flex', 
    gap: 12, 
    alignItems: 'center', 
    padding: '10px 12px', 
    borderBottom: '1px solid #eee', 
    cursor: 'pointer',
    transition: 'background 0.1s',
};
const badgeStyle = { 
    color: '#fff', 
    fontSize: 10, 
    padding: '2px 8px', 
    borderRadius: 8,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
};
const detailStyle = { 
    padding: 16, 
    background: '#f7fafc',
    borderTop: '1px solid #e8ecf0',
};
const inputStyle = { 
    padding: '6px 10px', 
    border: '1px solid #e2e8f0', 
    borderRadius: 6, 
    fontSize: 13,
    flex: 1,
    minWidth: 150,
};