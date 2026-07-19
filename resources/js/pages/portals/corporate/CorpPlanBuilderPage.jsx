/**
 * NEW FILE — resources/js/pages/portal/corporate/CorpPlanBuilderPage.jsx
 * "Plan customization + budgeting" self-service builder. Toggle benefits,
 * see a live estimate, submit for HMO review — doesn't create a live plan
 * directly, see PlanRequestController for why.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estimateCorpPlan, submitCorpPlanRequest, fetchCorpPlanRequests } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';

const BENEFITS = [
    { key: 'dental_covered', label: 'Dental' },
    { key: 'optical_covered', label: 'Optical' },
    { key: 'maternity_covered', label: 'Maternity' },
    { key: 'surgery_covered', label: 'Surgery' },
    { key: 'physiotherapy_covered', label: 'Physiotherapy' },
    { key: 'mental_health_covered', label: 'Mental Health' },
];

const STATUS_MAP = {
    submitted: ['Under Review', '#fff3e0', '#e65100'],
    approved: ['Approved', '#e6f4ea', '#137333'],
    rejected: ['Rejected', '#fce8e6', '#c5221f'],
};

export default function CorpPlanBuilderPage() {
    const [planName, setPlanName] = useState('');
    const [tier, setTier] = useState('standard');
    const [employeeCount, setEmployeeCount] = useState(10);
    const [budgetCap, setBudgetCap] = useState('');
    const [benefits, setBenefits] = useState({});
    const [estimate, setEstimate] = useState(null);
    const queryClient = useQueryClient();

    const { data: requestsData } = useQuery({
        queryKey: ['corp-plan-requests'],
        queryFn: fetchCorpPlanRequests,
    });

    const estimateMutation = useMutation({
        mutationFn: () => estimateCorpPlan({ tier, expected_employee_count: employeeCount, selected_benefits: benefits }),
        onSuccess: (res) => setEstimate(res.data),
    });

    // recompute estimate whenever inputs change
    useEffect(() => {
        estimateMutation.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tier, employeeCount, JSON.stringify(benefits)]);

    const submitMutation = useMutation({
        mutationFn: () => submitCorpPlanRequest({
            plan_name: planName, tier, expected_employee_count: employeeCount,
            budget_cap: budgetCap || null, selected_benefits: benefits,
        }),
        onSuccess: () => {
            setPlanName('');
            setBenefits({});
            queryClient.invalidateQueries({ queryKey: ['corp-plan-requests'] });
        },
    });

    const toggleBenefit = (key) => setBenefits({ ...benefits, [key]: !benefits[key] });

    const overBudget = budgetCap && estimate && Number(estimate.estimated_annual_premium) > Number(budgetCap);

    return (
        <div>
            <h1 style={titleStyle}>Build a plan</h1>
            <p style={subtitleStyle}>Adjust benefits and see the estimated cost update live. Submitted for HMO review before it goes active.</p>

            <div style={gridStyle}>
                <div style={formCardStyle}>
                    <label style={labelStyle}>Plan name</label>
                    <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Senior Staff 2026" style={inputStyle} />

                    <label style={labelStyle}>Tier</label>
                    <select value={tier} onChange={e => setTier(e.target.value)} style={inputStyle}>
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="executive">Executive</option>
                    </select>

                    <label style={labelStyle}>Number of employees</label>
                    <input type="number" value={employeeCount} onChange={e => setEmployeeCount(Number(e.target.value))} min={1} style={inputStyle} />

                    <label style={labelStyle}>Your budget cap (optional)</label>
                    <input type="number" value={budgetCap} onChange={e => setBudgetCap(e.target.value)} placeholder="₦ annual budget" style={inputStyle} />

                    <label style={labelStyle}>Benefits</label>
                    <div style={benefitsGridStyle}>
                        {BENEFITS.map(b => (
                            <button
                                key={b.key}
                                onClick={() => toggleBenefit(b.key)}
                                style={{ ...benefitPillStyle, background: benefits[b.key] ? '#0f4c81' : '#f7fafc', color: benefits[b.key] ? '#fff' : '#4a5568', borderColor: benefits[b.key] ? '#0f4c81' : '#e2e8f0' }}
                            >
                                {b.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => submitMutation.mutate()}
                        disabled={!planName.trim() || submitMutation.isPending}
                        style={submitButtonStyle}
                    >
                        {submitMutation.isPending ? 'Submitting…' : 'Submit for review'}
                    </button>
                </div>

                <div style={estimateCardStyle}>
                    <div style={estimateLabelStyle}>Estimated annual premium</div>
                    <div style={estimateValueStyle}>{estimate ? formatCurrency(estimate.estimated_annual_premium) : '—'}</div>
                    <div style={estimatePerEmployeeStyle}>{estimate ? `${formatCurrency(estimate.per_employee_premium)} per employee` : ''}</div>

                    <div style={estimateLabelStyle2}>Benefit ceiling per employee</div>
                    <div style={estimateSecondaryStyle}>{estimate ? formatCurrency(estimate.estimated_max_benefit_value) : '—'}</div>

                    {overBudget && (
                        <div style={overBudgetStyle}>This exceeds your budget cap by {formatCurrency(estimate.estimated_annual_premium - budgetCap)}. Try removing a benefit or lowering the tier.</div>
                    )}

                    <div style={disclaimerStyle}>This is an estimate. The HMO team sets final pricing when reviewing your request.</div>
                </div>
            </div>

            <h2 style={sectionTitleStyle}>Your requests</h2>
            <div style={requestsListStyle}>
                {(requestsData?.data ?? []).map(r => (
                    <div key={r.id} style={requestRowStyle}>
                        <div>
                            <StatusBadge status={r.status} />
                            <span style={requestNameStyle}>{r.plan_name}</span>
                            <div style={requestMetaStyle}>{r.tier} · {r.expected_employee_count} employees · {formatDate(r.created_at)}</div>
                            {r.reviewer_notes && <div style={reviewerNoteStyle}>{r.reviewer_notes}</div>}
                        </div>
                        <div style={requestAmountStyle}>{formatCurrency(r.estimated_annual_premium)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 20px' };
const gridStyle = { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 24 };
const formCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginTop: 12, marginBottom: 4 };
const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', width: '100%', boxSizing: 'border-box' };
const benefitsGridStyle = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const benefitPillStyle = { padding: '7px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const submitButtonStyle = { marginTop: 18, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const estimateCardStyle = { background: '#0f4c81', borderRadius: 12, padding: 20, color: '#fff', height: 'fit-content' };
const estimateLabelStyle = { fontSize: 12, opacity: 0.8 };
const estimateValueStyle = { fontSize: 26, fontWeight: 800, marginTop: 4 };
const estimatePerEmployeeStyle = { fontSize: 12, opacity: 0.8, marginTop: 2 };
const estimateLabelStyle2 = { fontSize: 12, opacity: 0.8, marginTop: 16 };
const estimateSecondaryStyle = { fontSize: 18, fontWeight: 700, marginTop: 4 };
const overBudgetStyle = { marginTop: 14, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 12 };
const disclaimerStyle = { marginTop: 14, fontSize: 11, opacity: 0.7 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 10 };
const requestsListStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const requestRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '12px 16px' };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600, marginRight: 8 };
const requestNameStyle = { fontSize: 13, fontWeight: 600, color: '#2d3748' };
const requestMetaStyle = { fontSize: 12, color: '#718096', marginTop: 4, textTransform: 'capitalize' };
const reviewerNoteStyle = { fontSize: 12, color: '#4a5568', marginTop: 6, fontStyle: 'italic' };
const requestAmountStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
