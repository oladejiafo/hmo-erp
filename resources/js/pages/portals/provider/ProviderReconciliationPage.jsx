/**
 * NEW FILE - resources/js/pages/portals/provider/ProviderReconciliationPage.jsx
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProviderReconciliation } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Scale } from 'lucide-react';

export default function ProviderReconciliationPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['provider-reconciliation'],
        queryFn: fetchProviderReconciliation,
    });

    const d = data?.data;

    if (isLoading) return <div style={loadingStyle}>Loading…</div>;
    if (!d) return <div style={loadingStyle}>No data available.</div>;

    return (
        <div>
            <h1 style={titleStyle}>Reconciliation</h1>
            <p style={subtitleStyle}>Claimed vs approved vs paid, and exactly where the gap is</p>

            <div style={statsGridStyle}>
                <Stat label="Total claimed" value={formatCurrency(d.total_claimed)} />
                <Stat label="Total approved" value={formatCurrency(d.total_approved)} color="#1967d2" />
                <Stat label="Total paid" value={formatCurrency(d.total_paid)} color="#137333" />
            </div>

            <div style={varianceRowStyle}>
                <VarianceCard label="Claimed vs Approved (write-downs)" value={d.variance_claimed_vs_approved} />
                <VarianceCard label="Approved vs Paid (in the pipeline)" value={d.variance_approved_vs_paid} />
            </div>

            <h2 style={sectionTitleStyle}>Breakdown by status</h2>
            <div style={breakdownStyle}>
                {d.by_status.map(row => (
                    <div key={row.status} style={breakdownRowStyle}>
                        <span style={breakdownStatusStyle}>{row.status.replace('_', ' ')}</span>
                        <span style={breakdownCountStyle}>{row.count} claims</span>
                        <span style={breakdownAmountStyle}>{formatCurrency(row.amount)}</span>
                    </div>
                ))}
            </div>

            <h2 style={sectionTitleStyle}>Approved, awaiting payment</h2>
            {!d.awaiting_payment.length ? (
                <div style={emptyStyle}>Nothing waiting on payment right now.</div>
            ) : (
                <div style={listStyle}>
                    {d.awaiting_payment.map(c => (
                        <div key={c.id} style={rowStyle}>
                            <div>
                                <span style={numberStyle}>{c.claim_number}</span>
                                <div style={metaStyle}>{c.enrollee_name} · Approved {formatDate(c.approved_at)}</div>
                            </div>
                            <div style={amountStyle}>{formatCurrency(c.total_amount_approved)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, color = '#2d3748' }) {
    return (
        <div style={statCardStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>{label}</div>
        </div>
    );
}

function VarianceCard({ label, value }) {
    const isZero = Math.abs(value) < 1;
    return (
        <div style={varianceCardStyle}>
            <Scale size={16} color={isZero ? '#137333' : '#e65100'} />
            <div style={{ fontSize: 18, fontWeight: 700, color: isZero ? '#137333' : '#e65100' }}>
                {value < 0 ? '-' : ''}{new Intl.NumberFormat().format(Math.abs(value))}
            </div>
            <div style={{ fontSize: 11, color: '#718096' }}>{label}</div>
        </div>
    );
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 20px' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 };
const statCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 16 };
const varianceRowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 };
const varianceCardStyle = { background: '#fff8e1', border: '1px solid #f5d76e', borderRadius: 12, padding: 14 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 10, marginTop: 20 };
const breakdownStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 };
const breakdownRowStyle = { display: 'flex', justifyContent: 'space-between', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 8, padding: '8px 14px', fontSize: 13 };
const breakdownStatusStyle = { textTransform: 'capitalize', fontWeight: 600, color: '#2d3748', flex: 1 };
const breakdownCountStyle = { color: '#718096', flex: 1, textAlign: 'center' };
const breakdownAmountStyle = { fontWeight: 700, color: '#2d3748', flex: 1, textAlign: 'right' };
const emptyStyle = { textAlign: 'center', padding: 30, background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', color: '#a0aec0', fontSize: 13 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '12px 16px' };
const numberStyle = { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0f4c81' };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const amountStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
