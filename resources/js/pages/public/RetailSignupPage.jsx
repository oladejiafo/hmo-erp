/**
 * NEW FILE — resources/js/pages/public/RetailSignupPage.jsx
 * Public, no auth. KYC capture is deliberately minimal — NIN + basic
 * identity fields, no live NIN verification (that needs a paid API like
 * Youverify/Prembly, a decision this project hasn't made yet — see the
 * README). Consent checkbox is required and recorded server-side with a
 * timestamp and notice version.
 */
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchRetailPlans, registerRetailEnrollee } from '../../api/index';
import { Plus, Trash2, ShieldCheck, Upload } from 'lucide-react';

export default function RetailSignupPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const preselectedTier = location.state?.tier ?? 'standard';
    const preselectedBenefits = location.state?.benefits ?? {};

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        gender: '', date_of_birth: '', nin: '', plan_id: '', consent_given: false,
    });
    const [idDocument, setIdDocument] = useState(null);
    const [dependents, setDependents] = useState([]);

    const { data: plansData } = useQuery({
        queryKey: ['retail-plans'],
        queryFn: fetchRetailPlans,
    });

    const registerMutation = useMutation({
        mutationFn: () => {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));
            fd.append('id_document', idDocument);
            dependents.forEach((d, i) => {
                Object.entries(d).forEach(([k, v]) => fd.append(`dependents[${i}][${k}]`, v));
            });
            Object.entries(preselectedBenefits).forEach(([k, v]) => {
                if (v) fd.append(`selected_benefits[${k}]`, '1');
            });
            return registerRetailEnrollee(fd);
        },
        onSuccess: (res) => {
            window.location.href = res.data.payment_link;
        },
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const addDependent = () => setDependents([...dependents, { first_name: '', last_name: '', relationship: 'spouse', date_of_birth: '' }]);
    const updateDependent = (i, k, v) => setDependents(dependents.map((d, idx) => idx === i ? { ...d, [k]: v } : d));
    const removeDependent = (i) => setDependents(dependents.filter((_, idx) => idx !== i));

    const plans = plansData?.data ?? [];
    // preselect a plan matching the tier chosen on the calculator, once plans load
    React.useEffect(() => {
        if (plans.length && !form.plan_id) {
            const match = plans.find(p => p.tier === preselectedTier);
            if (match) set('plan_id', match.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plans]);

    const canSubmit = form.first_name && form.last_name && form.email && form.phone
        && form.gender && form.date_of_birth && form.nin.length === 11 && idDocument && form.plan_id && form.consent_given
        && dependents.every(d => d.first_name && d.last_name && d.date_of_birth);

    return (
        <div style={pageStyle}>
            <h1 style={titleStyle}>Sign up</h1>
            <p style={subtitleStyle}>A few details, then payment, then you're covered.</p>

            <Section title="Your details">
                <Row>
                    <Field label="First name" value={form.first_name} onChange={v => set('first_name', v)} />
                    <Field label="Last name" value={form.last_name} onChange={v => set('last_name', v)} />
                </Row>
                <Row>
                    <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} />
                    <Field label="Phone" type="tel" value={form.phone} onChange={v => set('phone', v)} />
                </Row>
                <Row>
                    <div>
                        <label style={labelStyle}>Gender</label>
                        <select value={form.gender} onChange={e => set('gender', e.target.value)} style={inputStyle}>
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} />
                </Row>
                <Field label="NIN (National Identification Number)" value={form.nin} onChange={v => set('nin', v.replace(/\D/g, '').slice(0, 11))} span />
                <p style={helpTextStyle}>Used to confirm your identity. We don't verify this live yet — your HMO may follow up if anything doesn't match.</p>

                <label style={labelStyle}>ID document (National ID, passport, or driver's licence)</label>
                <div onClick={() => document.getElementById('id-doc-input').click()} style={uploadBoxStyle}>
                    <input id="id-doc-input" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => setIdDocument(e.target.files[0])} />
                    <Upload size={20} color="#0f4c81" />
                    <span style={{ fontSize: 12, color: '#4a5568', marginTop: 6 }}>{idDocument ? idDocument.name : 'Click to upload'}</span>
                </div>
            </Section>

            <Section title="Plan">
                <select value={form.plan_id} onChange={e => set('plan_id', e.target.value)} style={inputStyle}>
                    <option value="">Select a plan</option>
                    {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.plan_name} — up to ₦{Number(p.max_benefit_value).toLocaleString()}</option>
                    ))}
                </select>
            </Section>

            <Section title="Dependents (optional)">
                {dependents.map((d, i) => (
                    <div key={i} style={dependentRowStyle}>
                        <input value={d.first_name} onChange={e => updateDependent(i, 'first_name', e.target.value)} placeholder="First name" style={{ ...inputStyle, flex: 1 }} />
                        <input value={d.last_name} onChange={e => updateDependent(i, 'last_name', e.target.value)} placeholder="Last name" style={{ ...inputStyle, flex: 1 }} />
                        <select value={d.relationship} onChange={e => updateDependent(i, 'relationship', e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                            <option value="spouse">Spouse</option>
                            <option value="child">Child</option>
                        </select>
                        <input type="date" value={d.date_of_birth} onChange={e => updateDependent(i, 'date_of_birth', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => removeDependent(i)} style={removeButtonStyle}><Trash2 size={14} /></button>
                    </div>
                ))}
                <button onClick={addDependent} style={addButtonStyle}><Plus size={14} /> Add dependent</button>
            </Section>

            <label style={consentRowStyle}>
                <input type="checkbox" checked={form.consent_given} onChange={e => set('consent_given', e.target.checked)} />
                <span style={{ fontSize: 12, color: '#4a5568' }}>
                    I agree to the <a href="/privacy-policy" target="_blank" rel="noreferrer">privacy notice</a> and consent to my data being used to process this enrolment.
                </span>
            </label>

            <button onClick={() => registerMutation.mutate()} disabled={!canSubmit || registerMutation.isPending} style={submitButtonStyle}>
                <ShieldCheck size={16} /> {registerMutation.isPending ? 'Processing…' : 'Continue to payment'}
            </button>

            {registerMutation.isError && (
                <div style={errorStyle}>{registerMutation.error?.response?.data?.message || 'Something went wrong. Please try again.'}</div>
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={sectionStyle}>
            <div style={sectionTitleStyle}>{title}</div>
            {children}
        </div>
    );
}
function Row({ children }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>;
}
function Field({ label, value, onChange, type = 'text', span }) {
    return (
        <div style={span ? { gridColumn: '1/-1', marginTop: 10 } : { marginTop: 10 }}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
        </div>
    );
}

const pageStyle = { maxWidth: 520, margin: '0 auto', padding: '40px 20px' };
const titleStyle = { fontSize: 22, fontWeight: 800, color: '#1a202c', margin: 0 };
const subtitleStyle = { fontSize: 13, color: '#718096', margin: '4px 0 24px' };
const sectionStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 18, marginBottom: 14 };
const sectionTitleStyle = { fontSize: 13, fontWeight: 700, color: '#0f4c81', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4a5568', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#f7fafc' };
const helpTextStyle = { fontSize: 11, color: '#a0aec0', marginTop: 6 };
const dependentRowStyle = { display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' };
const removeButtonStyle = { background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 6, padding: 8, cursor: 'pointer', color: '#c5221f' };
const addButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px dashed #c5d5e8', background: '#fff', color: '#0f4c81', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const consentRowStyle = { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16 };
const submitButtonStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 10, border: 'none', background: '#137333', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' };
const errorStyle = { marginTop: 12, fontSize: 12, color: '#c5221f', textAlign: 'center' };
const uploadBoxStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #c5d5e8', borderRadius: 10, padding: '16px', cursor: 'pointer', marginTop: 10, background: '#f7fafc' };
