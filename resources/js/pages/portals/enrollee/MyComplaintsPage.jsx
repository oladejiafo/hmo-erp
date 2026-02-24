/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/MyComplaintsPage.jsx
 * Member self-service: submit a complaint and view complaint history.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchEnrolleePortalComplaints, submitEnrolleeComplaint } from '../../../api/index';
import { formatDate, formatDateTime } from '../../../utils/format';
import { MessageSquare, Plus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function MyComplaintsPage() {
    const qc = useQueryClient();
    const [newModal, setNewModal] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-complaints'],
        queryFn:  fetchEnrolleePortalComplaints,
    });

    const complaints = data?.data ?? [];

    return (
        <div>
            <div style={headerContainerStyle}>
                <div>
                    <h1 style={titleStyle}>Complaints</h1>
                    <p style={subtitleStyle}>
                        Submit and track your service complaints
                    </p>
                </div>
                <button
                    onClick={() => setNewModal(true)}
                    style={newButtonStyle}
                >
                    <Plus size={15} /> New Complaint
                </button>
            </div>

            {/* SLA notice */}
            <div style={slaNoticeStyle}>
                <strong>📋 Response Commitment:</strong> Your complaint will receive a first response within 5 working days. Unresolved complaints can be escalated to NHIA.
            </div>

            {/* Complaint list */}
            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !complaints.length ? (
                <div style={emptyStateStyle}>
                    <MessageSquare size={40} color="#a0aec0" style={emptyStateIconStyle} />
                    <div style={emptyStateTextStyle}>No complaints submitted yet</div>
                </div>
            ) : (
                <div style={complaintsListStyle}>
                    {complaints.map(c => (
                        <div key={c.id} style={complaintCardStyle}>
                            <div style={complaintHeaderStyle}>
                                <div>
                                    <div style={complaintMetaStyle}>
                                        <span style={ticketNumberStyle}>#{c.ticket_number}</span>
                                        <ComplaintStatusBadge status={c.status} />
                                    </div>
                                    <div style={complaintSubjectStyle}>{c.subject}</div>
                                    <div style={complaintDateStyle}>
                                        Submitted: {formatDateTime(c.created_at)}
                                        {c.hcp_name && <span> · Against: {c.hcp_name}</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={complaintDescriptionStyle}>{c.description}</div>
                            {c.resolution_note && (
                                <div style={resolutionStyle}>
                                    <strong>Resolution:</strong> {c.resolution_note}
                                    {c.resolved_at && <span style={resolvedDateStyle}>({formatDate(c.resolved_at)})</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* New complaint modal */}
            {newModal && (
                <NewComplaintModal 
                    onClose={() => setNewModal(false)} 
                    onSuccess={() => { 
                        setNewModal(false); 
                        qc.invalidateQueries({ queryKey: ['enrollee-complaints'] }); 
                    }} 
                />
            )}
        </div>
    );
}

function NewComplaintModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({ 
        subject: '', 
        category: '', 
        hcp_name: '', 
        description: '' 
    });
    
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const mutation = useMutation({
        mutationFn: () => submitEnrolleeComplaint(form),
        onSuccess:  () => { 
            toast.success('Complaint submitted. You will receive a response within 5 working days.'); 
            onSuccess(); 
        },
        onError:    (e) => toast.error(e.response?.data?.message ?? 'Submission failed.'),
    });

    const valid = form.subject.trim() && form.description.trim().length >= 20;

    return (
        <>
            <div style={modalOverlayStyle} onClick={onClose} />
            <div style={modalContainerStyle}>
                <div style={modalHeaderStyle}>
                    <h3 style={modalTitleStyle}>Submit a Complaint</h3>
                    <button onClick={onClose} style={modalCloseButtonStyle}>
                        <X size={18} color="#718096" />
                    </button>
                </div>

                <div style={modalBodyStyle}>
                    <div style={formFieldStyle}>
                        <label style={labelStyle}>Subject *</label>
                        <input 
                            value={form.subject} 
                            onChange={e => set('subject', e.target.value)} 
                            placeholder="Brief summary of the complaint" 
                            style={inputStyle} 
                        />
                    </div>
                    
                    <div style={formFieldStyle}>
                        <label style={labelStyle}>Category</label>
                        <select 
                            value={form.category} 
                            onChange={e => set('category', e.target.value)} 
                            style={inputStyle}
                        >
                            <option value="">Select category</option>
                            <option value="poor_service">Poor Quality of Care</option>
                            <option value="balance_billing">Charged more than co-pay</option>
                            <option value="claim_rejection">Disputed Claim Rejection</option>
                            <option value="pa_denial">Pre-Auth Denial</option>
                            <option value="id_card">ID Card Issue</option>
                            <option value="hmo_service">HMO Customer Service</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div style={formFieldStyle}>
                        <label style={labelStyle}>Healthcare Provider (if applicable)</label>
                        <input 
                            value={form.hcp_name} 
                            onChange={e => set('hcp_name', e.target.value)} 
                            placeholder="Hospital or clinic name" 
                            style={inputStyle} 
                        />
                    </div>
                    
                    <div style={formFieldStyle}>
                        <label style={labelStyle}>
                            Detailed Description * <span style={minCharsStyle}>(min 20 characters)</span>
                        </label>
                        <textarea
                            value={form.description} 
                            onChange={e => set('description', e.target.value)}
                            rows={5} 
                            placeholder="Please describe your complaint in detail, including dates, what happened, and what you expect…"
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div style={charCountStyle(form.description.length)}>
                            {form.description.length} characters
                        </div>
                    </div>

                    <div style={infoNoticeStyle}>
                        Your complaint will be acknowledged within 24 hours and resolved within 5 working days. 
                        If unresolved, you may escalate to the NHIA Dispute Resolution Desk.
                    </div>

                    <div style={modalFooterStyle}>
                        <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
                        <button 
                            onClick={() => mutation.mutate()} 
                            disabled={!valid || mutation.isPending} 
                            style={submitButtonStyle(valid)}
                        >
                            {mutation.isPending ? 'Submitting…' : 'Submit Complaint'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function ComplaintStatusBadge({ status }) {
    const map = {
        open:       ['Open',       '#fff3e0', '#b45309', Clock],
        in_progress:['In Progress','#e8f0fe', '#0f4c81', AlertCircle],
        resolved:   ['Resolved',   '#e6f4ea', '#137333', CheckCircle],
        closed:     ['Closed',     '#f1f5f9', '#64748b', CheckCircle],
    };
    const [label, bg, color, Icon] = map[status] ?? [status, '#f0f0f0', '#555', Clock];
    
    return (
        <span style={{ ...statusBadgeStyle, background: bg, color }}>
            <Icon size={10} /> {label}
        </span>
    );
}

// Style constants
const headerContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
};

const titleStyle = {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
};

const subtitleStyle = {
    color: '#718096',
    fontSize: 14,
    margin: '4px 0 0',
};

const newButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '10px 18px',
    background: '#0f4c81',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
};

const slaNoticeStyle = {
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 20,
    fontSize: 12,
    color: '#78350f',
};

const loadingStyle = {
    textAlign: 'center',
    padding: 60,
    color: '#a0aec0',
};

const emptyStateStyle = {
    textAlign: 'center',
    padding: 60,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
};

const emptyStateIconStyle = {
    display: 'block',
    margin: '0 auto 12px',
};

const emptyStateTextStyle = {
    color: '#a0aec0',
    fontSize: 14,
};

const complaintsListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const complaintCardStyle = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const complaintHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
};

const complaintMetaStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
};

const ticketNumberStyle = {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#718096',
};

const complaintSubjectStyle = {
    fontSize: 15,
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: 4,
};

const complaintDateStyle = {
    fontSize: 12,
    color: '#718096',
};

const complaintDescriptionStyle = {
    marginTop: 10,
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 1.6,
};

const resolutionStyle = {
    marginTop: 12,
    background: '#f0fdf4',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 12,
    color: '#166534',
};

const resolvedDateStyle = {
    marginLeft: 8,
    color: '#4ade80',
};

// Modal styles
const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 1000,
};

const modalContainerStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    background: '#fff',
    borderRadius: 16,
    padding: '24px 28px',
    width: 500,
    maxWidth: '95vw',
    zIndex: 1001,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    maxHeight: '90vh',
    overflowY: 'auto',
};

const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
};

const modalTitleStyle = {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1a202c',
};

const modalCloseButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
};

const modalBodyStyle = {
    // No specific styles needed
};

const formFieldStyle = {
    marginBottom: 14,
};

const minCharsStyle = {
    color: '#a0aec0',
    fontWeight: 400,
};

const charCountStyle = (length) => ({
    textAlign: 'right',
    fontSize: 11,
    color: length < 20 ? '#ef4444' : '#a0aec0',
    marginTop: 3,
});

const infoNoticeStyle = {
    background: '#fffbeb',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 16,
    fontSize: 12,
    color: '#78350f',
};

const modalFooterStyle = {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
};

const cancelButtonStyle = {
    padding: '9px 18px',
    background: '#fff',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
};

const submitButtonStyle = (valid) => ({
    padding: '9px 20px',
    background: valid ? '#0f4c81' : '#94a3b8',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: valid ? 'pointer' : 'not-allowed',
    fontSize: 13,
    fontWeight: 500,
});

// Common form styles
const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 5,
};

const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: '#f7fafc',
    boxSizing: 'border-box',
};

const statusBadgeStyle = {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 10,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
};