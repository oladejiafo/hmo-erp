/**
 * FILE LOCATION (new file): resources/js/pages/portal/enrollee/MyReimbursementsPage.jsx
 * Modeled directly on the styling/structure of MyClaimsPage.jsx so it feels
 * like the same product, not a bolt-on.
 *
 * ASSUMPTION FLAGGED: needs a route added to the portal sidebar/router — I
 * haven't seen that file (likely resources/js/layouts/portals/EnrolleeLayout.jsx
 * or a routes config). Wire it in wherever MyClaimsPage.jsx is currently linked.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchEnrolleePortalReimbursements as fetchEnrolleeReimbursements,   // [PHASE 1] — matches real api/index.js naming
    submitEnrolleePortalReimbursement as submitReimbursement,
} from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Receipt, Plus, X } from 'lucide-react';

const STATUS_MAP = {
    pending:      ['Pending',      '#fff3e0', '#e65100'],
    under_review: ['In Review',    '#fff8e1', '#f57f17'],
    approved:     ['Approved',     '#e6f4ea', '#137333'],
    rejected:     ['Rejected',     '#fce8e6', '#c5221f'],
    paid:         ['Paid',         '#e8f0fe', '#0f4c81'],
};

export default function MyReimbursementsPage() {
    const [showForm, setShowForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [receipt, setReceipt] = useState(null);

    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-reimbursements'],
        queryFn: fetchEnrolleeReimbursements,
    });

    const submitMutation = useMutation({
        mutationFn: (formData) => submitReimbursement(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['enrollee-reimbursements'] });
            setShowForm(false);
            setAmount('');
            setReason('');
            setReceipt(null);
        },
    });

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append('amount_requested', amount);
        formData.append('reason', reason);
        if (receipt) formData.append('receipt', receipt);
        submitMutation.mutate(formData);
    };

    const requests = data?.data ?? [];
    const canSubmit = amount && Number(amount) > 0 && reason.trim().length >= 10;

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Reimbursement Requests</h1>
                    <p style={subtitleStyle}>Paid out of pocket? Request it back here.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} style={newRequestButtonStyle}>
                    {showForm ? <X size={14} /> : <Plus size={14} />}
                    {showForm ? 'Cancel' : 'New request'}
                </button>
            </div>

            {showForm && (
                <div style={formCardStyle}>
                    <label style={labelStyle}>Amount you paid (₦)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="e.g. 15000"
                        style={inputStyle}
                    />

                    <label style={labelStyle}>What happened?</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Which hospital, what service, why you paid directly…"
                        style={textareaStyle}
                        rows={3}
                    />

                    <label style={labelStyle}>Receipt (optional, PDF or photo)</label>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setReceipt(e.target.files?.[0] ?? null)}
                        style={fileInputStyle}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitMutation.isPending}
                        style={submitButtonStyle}
                    >
                        {submitMutation.isPending ? 'Submitting…' : 'Submit request'}
                    </button>
                </div>
            )}

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !requests.length ? (
                <div style={emptyStateStyle}>
                    <Receipt size={40} color="#a0aec0" style={emptyStateIconStyle} />
                    <div style={emptyStateTextStyle}>No reimbursement requests yet</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {requests.map(r => (
                        <div key={r.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <div>
                                    <span style={numberStyle}>{r.reimbursement_number}</span>
                                    <StatusBadge status={r.status} />
                                    {r.claim_number && (
                                        <div style={claimRefStyle}>Linked to claim {r.claim_number}</div>
                                    )}
                                </div>
                                <div style={amountBlockStyle}>
                                    <div style={amountLabelStyle}>Requested</div>
                                    <div style={amountStyle}>{formatCurrency(r.amount_requested)}</div>
                                    {r.amount_approved && (
                                        <>
                                            <div style={amountLabelStyle}>Approved</div>
                                            <div style={approvedAmountStyle}>{formatCurrency(r.amount_approved)}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={reasonStyle}>{r.reason}</div>
                            {r.reviewer_notes && (
                                <div style={reviewerNoteStyle}><strong>HMO note:</strong> {r.reviewer_notes}</div>
                            )}
                            <div style={dateStyle}>Submitted {formatDate(r.created_at)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 14, margin: '4px 0 0' };
const newRequestButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const formCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#4a5568', marginTop: 10 };
const inputStyle = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc' };
const textareaStyle = { padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' };
const fileInputStyle = { fontSize: 12 };
const submitButtonStyle = { marginTop: 14, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStateStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyStateIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyStateTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 };
const numberStyle = { fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0f4c81', marginRight: 10 };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600 };
const claimRefStyle = { fontSize: 12, color: '#718096', marginTop: 4 };
const amountBlockStyle = { textAlign: 'right' };
const amountLabelStyle = { fontSize: 11, color: '#718096' };
const amountStyle = { fontSize: 16, fontWeight: 700, color: '#2d3748' };
const approvedAmountStyle = { fontSize: 14, fontWeight: 600, color: '#137333' };
const reasonStyle = { fontSize: 13, color: '#4a5568', marginTop: 10 };
const reviewerNoteStyle = { marginTop: 8, background: '#f7fafc', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#4a5568' };
const dateStyle = { fontSize: 11, color: '#a0aec0', marginTop: 8 };
