/**
 * NEW FILE — resources/js/pages/public/PremiumCalculatorPage.jsx
 * Public, no auth — wire into AppRouterX.jsx's public route block.
 */
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { estimateRetailPremium } from '../../api/index';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const TIERS = [
    { key: 'basic', label: 'Basic', blurb: 'Essential cover, outpatient + emergency' },
    { key: 'standard', label: 'Standard', blurb: 'Adds dental, optical, and higher limits' },
    { key: 'premium', label: 'Premium', blurb: 'Full cover including surgery and specialist care' },
];

const BENEFITS = [
    { key: 'dental_covered', label: 'Dental' },
    { key: 'optical_covered', label: 'Optical' },
    { key: 'maternity_covered', label: 'Maternity' },
];

export default function PremiumCalculatorPage() {
    const navigate = useNavigate();
    const [tier, setTier] = useState('standard');
    const [dependents, setDependents] = useState(0);
    const [benefits, setBenefits] = useState({});
    const [estimate, setEstimate] = useState(null);

    const estimateMutation = useMutation({
        mutationFn: () => estimateRetailPremium({ tier, dependents_count: dependents, selected_benefits: benefits }),
        onSuccess: (res) => setEstimate(res.data),
    });

    useEffect(() => {
        estimateMutation.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tier, dependents, benefits]);

    const toggleBenefit = (key) => setBenefits(b => ({ ...b, [key]: !b[key] }));

    return (
        <div style={pageStyle}>
            <div style={headerStyle}>
                <ShieldCheck size={32} color="#0f4c81" />
                <h1 style={titleStyle}>Find your plan</h1>
                <p style={subtitleStyle}>See an estimated price before you sign up — no commitment.</p>
            </div>

            <div style={tiersRowStyle}>
                {TIERS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTier(t.key)}
                        style={{ ...tierCardStyle, borderColor: tier === t.key ? '#0f4c81' : '#e2e8f0', background: tier === t.key ? '#f0f7ff' : '#fff' }}
                    >
                        <div style={tierLabelStyle}>{t.label}</div>
                        <div style={tierBlurbStyle}>{t.blurb}</div>
                    </button>
                ))}
            </div>

            <div style={dependentsRowStyle}>
                <label style={labelStyle}>Dependents (spouse, children)</label>
                <div style={stepperStyle}>
                    <button onClick={() => setDependents(Math.max(0, dependents - 1))} style={stepperButtonStyle}>−</button>
                    <span style={stepperValueStyle}>{dependents}</span>
                    <button onClick={() => setDependents(Math.min(6, dependents + 1))} style={stepperButtonStyle}>+</button>
                </div>
            </div>

            <div style={benefitsRowStyle}>
                <label style={labelStyle}>Optional benefits</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    {BENEFITS.map(b => (
                        <button key={b.key} onClick={() => toggleBenefit(b.key)} style={{ ...benefitPillStyle, background: benefits[b.key] ? '#0f4c81' : '#fff', color: benefits[b.key] ? '#fff' : '#4a5568' }}>
                            {b.label}
                        </button>
                    ))}
                </div>
            </div>

            {estimate && (
                <div style={estimateCardStyle}>
                    <div style={estimateLabelStyle}>Estimated annual premium</div>
                    <div style={estimateValueStyle}>₦{estimate.estimated_annual_total.toLocaleString()}</div>
                    <div style={estimateBreakdownStyle}>
                        ₦{estimate.principal_premium.toLocaleString()} for you
                        {dependents > 0 && ` + ₦${estimate.per_dependent_premium.toLocaleString()} × ${dependents} dependent${dependents > 1 ? 's' : ''}`}
                    </div>
                </div>
            )}

            <button onClick={() => navigate('/join/signup', { state: { tier, dependents, benefits } })} style={ctaButtonStyle}>
                Continue to sign up <ArrowRight size={16} />
            </button>

            <p style={disclaimerStyle}>This is an estimate. The exact amount is confirmed before you pay.</p>
        </div>
    );
}

const pageStyle = { maxWidth: 480, margin: '0 auto', padding: '40px 20px' };
const headerStyle = { textAlign: 'center', marginBottom: 30 };
const titleStyle = { fontSize: 24, fontWeight: 800, color: '#1a202c', margin: '10px 0 4px' };
const subtitleStyle = { fontSize: 13, color: '#718096' };
const tiersRowStyle = { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 };
const tierCardStyle = { textAlign: 'left', padding: '14px 16px', borderRadius: 12, border: '2px solid', cursor: 'pointer' };
const tierLabelStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748' };
const tierBlurbStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const dependentsRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 };
const labelStyle = { fontSize: 13, fontWeight: 600, color: '#4a5568' };
const stepperStyle = { display: 'flex', alignItems: 'center', gap: 14 };
const stepperButtonStyle = { width: 32, height: 32, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', fontSize: 16, cursor: 'pointer' };
const stepperValueStyle = { fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: 'center' };
const estimateCardStyle = { background: '#0f4c81', borderRadius: 14, padding: 20, textAlign: 'center', color: '#fff', marginBottom: 20 };
const estimateLabelStyle = { fontSize: 12, opacity: 0.8 };
const estimateValueStyle = { fontSize: 28, fontWeight: 800, marginTop: 4 };
const estimateBreakdownStyle = { fontSize: 12, opacity: 0.85, marginTop: 6 };
const ctaButtonStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 10, border: 'none', background: '#137333', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' };
const disclaimerStyle = { textAlign: 'center', fontSize: 11, color: '#a0aec0', marginTop: 12 };
const benefitsRowStyle = { marginBottom: 20 };
const benefitPillStyle = { padding: '7px 14px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
