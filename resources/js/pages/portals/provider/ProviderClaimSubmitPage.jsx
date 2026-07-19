/**
 * NEW FILE - resources/js/pages/portals/provider/ProviderClaimSubmitPage.jsx
 * Two-step flow: verify member -> build claim with line items.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { verifyProviderEnrollee, submitProviderClaim } from '../../../api/index';
import { Search, Plus, Trash2, CheckCircle } from 'lucide-react';

const CLAIM_TYPES = [
    'outpatient', 'inpatient', 'dental', 'optical', 'maternity',
    'emergency', 'surgery', 'laboratory', 'radiology', 'drug_refill',
];

const ITEM_CATEGORIES = [
    'consultation', 'procedure', 'laboratory', 'radiology',
    'drug', 'surgery', 'dental', 'optical', 'physiotherapy',
    'maternity', 'emergency',
];

const emptyItem = () => ({ service_name: '', category: 'consultation', quantity: 1, unit_price: '' });

export default function ProviderClaimSubmitPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [memberNumber, setMemberNumber] = useState('');
    const [member, setMember] = useState(null); // verified enrollee/dependent
    const [serviceDate, setServiceDate] = useState('');
    const [claimType, setClaimType] = useState('outpatient');
    const [diagnosis, setDiagnosis] = useState('');
    const [items, setItems] = useState([emptyItem()]);

    const verifyMutation = useMutation({
        mutationFn: (num) => verifyProviderEnrollee(num),
        onSuccess: (res) => setMember(res.data),
        onError: () => setMember(null),
    });

    const submitMutation = useMutation({
        mutationFn: (payload) => submitProviderClaim(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['provider-claims'] });
            queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
            navigate('/provider/claims');
        },
    });

    const updateItem = (idx, field, value) => {
        setItems(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));
    };

    const addItem = () => setItems([...items, emptyItem()]);
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    const total = items.reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);

    const canSubmit = member && serviceDate && diagnosis.trim().length > 0 &&
        items.every(it => it.service_name.trim() && Number(it.unit_price) > 0);

    const handleSubmit = () => {
        submitMutation.mutate({
            enrollee_id: member.type === 'principal' ? member.id : member.enrollee_id,
            dependent_id: member.type === 'dependent' ? member.id : null,
            service_date: serviceDate,
            claim_type: claimType,
            diagnosis_description: diagnosis,
            items: items.map(it => ({
                service_name: it.service_name,
                category: it.category,
                quantity: Number(it.quantity) || 1,
                unit_price: Number(it.unit_price),
            })),
        });
    };

    return (
        <div>
            <h1 style={titleStyle}>Submit a claim</h1>

            {/* Step 1: verify member */}
            <div style={sectionStyle}>
                <label style={labelStyle}>Member number</label>
                <div style={verifyRowStyle}>
                    <input
                        value={memberNumber}
                        onChange={e => setMemberNumber(e.target.value)}
                        placeholder="e.g. HMO-000123"
                        style={inputStyle}
                    />
                    <button
                        onClick={() => verifyMutation.mutate(memberNumber)}
                        disabled={!memberNumber || verifyMutation.isPending}
                        style={verifyButtonStyle}
                    >
                        <Search size={14} /> Verify
                    </button>
                </div>

                {verifyMutation.isError && (
                    <div style={errorStyle}>No member found with that number.</div>
                )}

                {member && (
                    <div style={memberCardStyle}>
                        <CheckCircle size={16} color="#137333" />
                        <div>
                            <div style={memberNameStyle}>{member.full_name}</div>
                            <div style={memberMetaStyle}>
                                {member.plan_name} · Status: {member.status}
                                {member.type === 'principal' && member.benefit_balance != null && (
                                    <> · Balance: ₦{Number(member.benefit_balance).toLocaleString()}</>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2: claim details - only once verified */}
            {member && (
                <>
                    <div style={sectionStyle}>
                        <div style={twoColStyle}>
                            <div>
                                <label style={labelStyle}>Service date</label>
                                <input
                                    type="date"
                                    value={serviceDate}
                                    onChange={e => setServiceDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Claim type</label>
                                <select value={claimType} onChange={e => setClaimType(e.target.value)} style={inputStyle}>
                                    {CLAIM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                        </div>

                        <label style={labelStyle}>Diagnosis / reason for visit</label>
                        <textarea
                            value={diagnosis}
                            onChange={e => setDiagnosis(e.target.value)}
                            rows={2}
                            style={textareaStyle}
                        />
                    </div>

                    <div style={sectionStyle}>
                        <div style={itemsHeaderStyle}>
                            <label style={labelStyle}>Services / items</label>
                            <button onClick={addItem} style={addItemButtonStyle}>
                                <Plus size={13} /> Add item
                            </button>
                        </div>

                        {items.map((it, idx) => (
                            <div key={idx} style={itemRowStyle}>
                                <input
                                    value={it.service_name}
                                    onChange={e => updateItem(idx, 'service_name', e.target.value)}
                                    placeholder="Service name"
                                    style={{ ...inputStyle, flex: 2 }}
                                />
                                <select
                                    value={it.category}
                                    onChange={e => updateItem(idx, 'category', e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                >
                                    {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input
                                    type="number"
                                    value={it.quantity}
                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                    min={1}
                                    style={{ ...inputStyle, width: 70 }}
                                />
                                <input
                                    type="number"
                                    value={it.unit_price}
                                    onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                                    placeholder="Unit price"
                                    style={{ ...inputStyle, width: 110 }}
                                />
                                {items.length > 1 && (
                                    <button onClick={() => removeItem(idx)} style={removeButtonStyle}>
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}

                        <div style={totalRowStyle}>Total: <strong>₦{total.toLocaleString()}</strong></div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitMutation.isPending}
                        style={submitButtonStyle}
                    >
                        {submitMutation.isPending ? 'Submitting…' : 'Submit claim'}
                    </button>

                    {submitMutation.isError && (
                        <div style={errorStyle}>
                            {submitMutation.error?.response?.data?.message || 'Something went wrong submitting this claim.'}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 20 };
const sectionStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, marginBottom: 16 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6, marginTop: 10 };
const verifyRowStyle = { display: 'flex', gap: 8 };
const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', width: '100%', boxSizing: 'border-box' };
const verifyButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const errorStyle = { marginTop: 10, fontSize: 12, color: '#c5221f' };
const memberCardStyle = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, background: '#e6f4ea', borderRadius: 8, padding: '10px 14px' };
const memberNameStyle = { fontSize: 14, fontWeight: 700, color: '#137333' };
const memberMetaStyle = { fontSize: 12, color: '#2d3748', marginTop: 2 };
const twoColStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
const textareaStyle = { ...inputStyle, resize: 'vertical' };
const itemsHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const addItemButtonStyle = { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const itemRowStyle = { display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' };
const removeButtonStyle = { background: 'none', border: 'none', color: '#c5221f', cursor: 'pointer', padding: 6 };
const totalRowStyle = { textAlign: 'right', marginTop: 14, fontSize: 14, color: '#2d3748' };
const submitButtonStyle = { padding: '11px 24px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
