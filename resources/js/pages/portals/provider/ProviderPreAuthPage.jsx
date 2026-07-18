/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderPreAuthPage.jsx
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchProviderPreAuths,
    verifyProviderEnrollee,
    submitProviderPreAuth,
} from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Plus, X, Search, CheckCircle, ShieldCheck } from 'lucide-react';

const STATUS_MAP = {
    pending:                  ['Pending',           '#fff3e0', '#e65100'],
    awaiting_md:              ['Awaiting MD',        '#fff8e1', '#f57f17'],
    awaiting_ceo:             ['Awaiting CEO',        '#fff8e1', '#f57f17'],
    approved:                 ['Approved',           '#e6f4ea', '#137333'],
    declined:                 ['Declined',           '#fce8e6', '#c5221f'],
    emergency_retrospective:  ['Emergency (Retro)',  '#fce4d6', '#bf5b00'],
    revoked:                  ['Revoked',            '#f0f0f0', '#555'],
};

export default function ProviderPreAuthPage() {
    const [showForm, setShowForm] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['provider-pre-auths'],
        queryFn: () => fetchProviderPreAuths({}),
    });

    const pas = data?.data ?? [];

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Pre-Authorisations</h1>
                    <p style={subtitleStyle}>Request approval before a procedure or admission</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} style={newButtonStyle}>
                    {showForm ? <X size={14} /> : <Plus size={14} />}
                    {showForm ? 'Cancel' : 'New request'}
                </button>
            </div>

            {showForm && (
                <PreAuthForm
                    onDone={() => {
                        setShowForm(false);
                        queryClient.invalidateQueries({ queryKey: ['provider-pre-auths'] });
                    }}
                />
            )}

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !pas.length ? (
                <div style={emptyStyle}>
                    <ShieldCheck size={40} color="#a0aec0" style={emptyIconStyle} />
                    <div style={emptyTextStyle}>No pre-authorisation requests yet</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {pas.map(pa => (
                        <div key={pa.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <div>
                                    <span style={numberStyle}>{pa.pa_number}</span>
                                    <StatusBadge status={pa.status} />
                                    {pa.pa_code && <span style={codeStyle}>Code: {pa.pa_code}</span>}
                                </div>
                                <div style={amountStyle}>{pa.estimated_amount ? formatCurrency(pa.estimated_amount) : '—'}</div>
                            </div>
                            <div style={metaStyle}>{pa.enrollee_name} · {pa.service_type} · {pa.urgency}</div>
                            <div style={dateStyle}>Submitted {formatDate(pa.created_at)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PreAuthForm({ onDone }) {
    const [memberNumber, setMemberNumber] = useState('');
    const [member, setMember] = useState(null);
    const [serviceType, setServiceType] = useState('');
    const [urgency, setUrgency] = useState('standard');
    const [diagnosis, setDiagnosis] = useState('');
    const [estimatedAmount, setEstimatedAmount] = useState('');

    const verifyMutation = useMutation({
        mutationFn: (num) => verifyProviderEnrollee(num),
        onSuccess: (res) => setMember(res.data),
        onError: () => setMember(null),
    });

    const submitMutation = useMutation({
        mutationFn: (payload) => submitProviderPreAuth(payload),
        onSuccess: onDone,
    });

    const canSubmit = member && serviceType.trim() && diagnosis.trim().length >= 5;

    const handleSubmit = () => {
        submitMutation.mutate({
            enrollee_id: member.type === 'principal' ? member.id : member.enrollee_id,
            dependent_id: member.type === 'dependent' ? member.id : null,
            service_type: serviceType,
            urgency,
            diagnosis_description: diagnosis,
            estimated_amount: estimatedAmount ? Number(estimatedAmount) : null,
        });
    };

    return (
        <div style={formCardStyle}>
            <label style={labelStyle}>Member number</label>
            <div style={verifyRowStyle}>
                <input value={memberNumber} onChange={e => setMemberNumber(e.target.value)} placeholder="e.g. HMO-000123" style={inputStyle} />
                <button onClick={() => verifyMutation.mutate(memberNumber)} disabled={!memberNumber} style={verifyButtonStyle}>
                    <Search size={14} /> Verify
                </button>
            </div>

            {verifyMutation.isError && <div style={errorStyle}>No member found with that number.</div>}

            {member && (
                <div style={memberCardStyle}>
                    <CheckCircle size={16} color="#137333" />
                    <div style={memberNameStyle}>{member.full_name} · {member.plan_name}</div>
                </div>
            )}

            {member && (
                <>
                    <label style={labelStyle}>Service type</label>
                    <input value={serviceType} onChange={e => setServiceType(e.target.value)} placeholder="e.g. Appendectomy" style={inputStyle} />

                    <label style={labelStyle}>Urgency</label>
                    <select value={urgency} onChange={e => setUrgency(e.target.value)} style={inputStyle}>
                        <option value="standard">Standard</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                    </select>

                    <label style={labelStyle}>Diagnosis / clinical reason</label>
                    <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />

                    <label style={labelStyle}>Estimated cost (optional)</label>
                    <input type="number" value={estimatedAmount} onChange={e => setEstimatedAmount(e.target.value)} placeholder="₦" style={inputStyle} />

                    <button onClick={handleSubmit} disabled={!canSubmit || submitMutation.isPending} style={submitButtonStyle}>
                        {submitMutation.isPending ? 'Submitting…' : 'Submit request'}
                    </button>

                    {submitMutation.isError && (
                        <div style={errorStyle}>
                            {submitMutation.error?.response?.data?.message || 'Something went wrong submitting this request.'}
                        </div>
                    )}
                    {submitMutation.data?.warning && (
                        <div style={warningStyle}>{submitMutation.data.warning}</div>
                    )}
                </>
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
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const newButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const formCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#4a5568', marginTop: 10, marginBottom: 4 };
const verifyRowStyle = { display: 'flex', gap: 8 };
const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', width: '100%', boxSizing: 'border-box' };
const verifyButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const errorStyle = { marginTop: 8, fontSize: 12, color: '#c5221f' };
const warningStyle = { marginTop: 8, fontSize: 12, color: '#bf5b00', background: '#fce4d6', padding: '8px 12px', borderRadius: 8 };
const memberCardStyle = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, background: '#e6f4ea', borderRadius: 8, padding: '8px 14px' };
const memberNameStyle = { fontSize: 13, fontWeight: 600, color: '#137333' };
const submitButtonStyle = { marginTop: 14, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '14px 20px' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 };
const numberStyle = { fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0f4c81', marginRight: 10 };
const codeStyle = { fontSize: 11, color: '#718096', marginLeft: 10 };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600 };
const amountStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748' };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 6 };
const dateStyle = { fontSize: 11, color: '#a0aec0', marginTop: 4 };
