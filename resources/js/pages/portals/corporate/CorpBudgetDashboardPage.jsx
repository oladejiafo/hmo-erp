/**
 * NEW FILE — resources/js/pages/portal/corporate/CorpBudgetDashboardPage.jsx
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCorpPortalBudget, exportCorpUtilizationReport } from '../../../api/index';
import { formatCurrency } from '../../../utils/format';
import { Wallet, Download } from 'lucide-react';

export default function CorpBudgetDashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['corp-budget'],
        queryFn: fetchCorpPortalBudget,
    });

    const d = data?.data;

    if (isLoading) return <div style={loadingStyle}>Loading…</div>;
    if (!d) return <div style={loadingStyle}>No data available.</div>;

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Budget Dashboard</h1>
                    <p style={subtitleStyle}>Budget vs actual utilization across your active plans</p>
                </div>
                <button onClick={exportCorpUtilizationReport} style={exportButtonStyle}>
                    <Download size={14} /> Export utilization report
                </button>
            </div>

            <div style={topRowStyle}>
                <Stat label="Total budget" value={formatCurrency(d.total_budget)} />
                <Stat label="Utilized" value={formatCurrency(d.total_utilized)} color="#1967d2" />
                <Stat label="Utilization" value={`${d.total_utilization_percent}%`} color={d.total_utilization_percent > 80 ? '#c5221f' : '#137333'} />
            </div>

            <h2 style={sectionTitleStyle}>By plan</h2>
            <div style={listStyle}>
                {d.by_plan.map(p => (
                    <div key={p.plan_id} style={planCardStyle}>
                        <div style={planHeaderStyle}>
                            <div>
                                <div style={planNameStyle}>{p.plan_name}</div>
                                <div style={planMetaStyle}>{p.enrollee_count} employees · {p.tier}</div>
                            </div>
                            <div style={planPercentStyle(p.utilization_percent)}>{p.utilization_percent}%</div>
                        </div>
                        <div style={barTrackStyle}>
                            <div style={{ ...barFillStyle, width: `${Math.min(p.utilization_percent, 100)}%`, background: p.utilization_percent > 90 ? '#c5221f' : p.utilization_percent > 70 ? '#e65100' : '#137333' }} />
                        </div>
                        <div style={planFooterStyle}>
                            <span>{formatCurrency(p.utilized)} used</span>
                            <span>{formatCurrency(p.remaining)} remaining</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Stat({ label, value, color = '#2d3748' }) {
    return (
        <div style={statCardStyle}>
            <Wallet size={16} color={color} />
            <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 8 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{label}</div>
        </div>
    );
}

function planPercentStyle(percent) {
    return { fontSize: 18, fontWeight: 700, color: percent > 90 ? '#c5221f' : percent > 70 ? '#e65100' : '#137333' };
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const exportButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 20px' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const topRowStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 };
const statCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 16 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 10 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 12 };
const planCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 16 };
const planHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 };
const planNameStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
const planMetaStyle = { fontSize: 12, color: '#718096', marginTop: 2, textTransform: 'capitalize' };
const barTrackStyle = { height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' };
const barFillStyle = { height: '100%', borderRadius: 4 };
const planFooterStyle = { display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#718096' };
