/**
 * NEW FILE - resources/js/pages/portals/provider/ProviderTicketsPage.jsx
 * List + submit + inline thread view - digital communication with HMO,
 * no email/paperwork required.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchProviderTickets, submitProviderTicket,
    fetchProviderTicketThread, replyProviderTicket,
} from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { Plus, X, MessageSquare, Send } from 'lucide-react';

const STATUS_MAP = {
    open: ['Open', '#fff3e0', '#e65100'],
    in_progress: ['In Progress', '#e8f0fe', '#1967d2'],
    resolved: ['Resolved', '#e6f4ea', '#137333'],
    closed: ['Closed', '#f0f0f0', '#555'],
};

export default function ProviderTicketsPage() {
    const [showForm, setShowForm] = useState(false);
    const [openTicketId, setOpenTicketId] = useState(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['provider-tickets'],
        queryFn: fetchProviderTickets,
    });

    const tickets = data?.data ?? [];

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Support tickets</h1>
                    <p style={subtitleStyle}>Talk to the HMO directly - no email needed</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} style={newButtonStyle}>
                    {showForm ? <X size={14} /> : <Plus size={14} />}
                    {showForm ? 'Cancel' : 'New ticket'}
                </button>
            </div>

            {showForm && (
                <TicketForm onDone={() => {
                    setShowForm(false);
                    queryClient.invalidateQueries({ queryKey: ['provider-tickets'] });
                }} />
            )}

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !tickets.length ? (
                <div style={emptyStyle}>
                    <MessageSquare size={40} color="#a0aec0" style={emptyIconStyle} />
                    <div style={emptyTextStyle}>No tickets yet</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {tickets.map(t => (
                        <div key={t.id}>
                            <div style={cardStyle} onClick={() => setOpenTicketId(openTicketId === t.id ? null : t.id)}>
                                <div>
                                    <span style={numberStyle}>{t.ticket_number}</span>
                                    <StatusBadge status={t.status} />
                                    <div style={subjectStyle}>{t.subject}</div>
                                    <div style={metaStyle}>{t.category || 'General'} · {formatDate(t.created_at)}</div>
                                </div>
                            </div>
                            {openTicketId === t.id && <TicketThread ticketId={t.id} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TicketForm({ onDone }) {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState('medium');

    const submitMutation = useMutation({
        mutationFn: () => submitProviderTicket({ subject, description, category, priority }),
        onSuccess: onDone,
    });

    const canSubmit = subject.trim() && description.trim().length >= 20;

    return (
        <div style={formCardStyle}>
            <label style={labelStyle}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Claims, Payments, Pre-Auth" style={inputStyle} />

            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
            </select>

            <label style={labelStyle}>What's going on? (min 20 characters)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />

            <button onClick={() => submitMutation.mutate()} disabled={!canSubmit || submitMutation.isPending} style={submitButtonStyle}>
                {submitMutation.isPending ? 'Submitting…' : 'Submit ticket'}
            </button>
        </div>
    );
}

function TicketThread({ ticketId }) {
    const [reply, setReply] = useState('');
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ['provider-ticket-thread', ticketId],
        queryFn: () => fetchProviderTicketThread(ticketId),
    });

    const replyMutation = useMutation({
        mutationFn: () => replyProviderTicket(ticketId, reply),
        onSuccess: () => {
            setReply('');
            queryClient.invalidateQueries({ queryKey: ['provider-ticket-thread', ticketId] });
        },
    });

    const messages = data?.data?.messages ?? [];

    return (
        <div style={threadStyle}>
            {!messages.length ? (
                <div style={noMessagesStyle}>No replies yet - the HMO team will respond here.</div>
            ) : (
                messages.map(m => (
                    <div key={m.id} style={{ ...messageStyle, alignSelf: m.sender_type === 'provider' ? 'flex-end' : 'flex-start', background: m.sender_type === 'provider' ? '#0f4c81' : '#fff', color: m.sender_type === 'provider' ? '#fff' : '#2d3748' }}>
                        <div>{m.message}</div>
                        <div style={{ ...messageTimeStyle, color: m.sender_type === 'provider' ? '#c9dcf0' : '#a0aec0' }}>{m.created_at}</div>
                    </div>
                ))
            )}
            <div style={replyRowStyle}>
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply…" style={inputStyle} />
                <button onClick={() => replyMutation.mutate()} disabled={!reply.trim() || replyMutation.isPending} style={replyButtonStyle}>
                    <Send size={14} />
                </button>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const newButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const formCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, marginBottom: 20 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginTop: 10, marginBottom: 4 };
const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', width: '100%', boxSizing: 'border-box' };
const submitButtonStyle = { marginTop: 14, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '14px 18px', cursor: 'pointer' };
const numberStyle = { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0f4c81', marginRight: 10 };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600 };
const subjectStyle = { fontSize: 14, fontWeight: 600, color: '#2d3748', marginTop: 6 };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const threadStyle = { display: 'flex', flexDirection: 'column', gap: 8, background: '#f7fafc', borderRadius: 10, padding: 14, marginTop: 4 };
const noMessagesStyle = { fontSize: 12, color: '#a0aec0', textAlign: 'center', padding: 10 };
const messageStyle = { maxWidth: '75%', padding: '8px 12px', borderRadius: 10, fontSize: 13, border: '1px solid #e8ecf0' };
const messageTimeStyle = { fontSize: 10, marginTop: 4 };
const replyRowStyle = { display: 'flex', gap: 8, marginTop: 6 };
const replyButtonStyle = { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', cursor: 'pointer' };
