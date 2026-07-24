import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPlanRequests, approvePlanRequest, rejectPlanRequest } from '../../api/index';
import { formatCurrency } from '../../utils/format';
import { FileText } from 'lucide-react';

const STATUS_COLORS = { submitted: '#e65100', approved: '#137333', rejected: '#c5221f' };

export default function PlanRequestsQueuePage() {
    const [openId, setOpenId] = useState(null);
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ 
        queryKey: ['staff-plan-requests'], 
        queryFn: () => fetchPlanRequests({}) 
    });
    const rows = data?.data ?? [];
    const invalidate = () => qc.invalidateQueries({ queryKey: ['staff-plan-requests'] });

    if (isLoading) {
        return (
            <div style={{ padding: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>Corporate Plan Requests</h1>
                <p style={{ color: '#718096', marginTop: 16 }}>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Corporate Plan Requests</h1>
            
            {rows.length === 0 ? (
                <div style={{ 
                    marginTop: 16, 
                    textAlign: 'center', 
                    padding: 60, 
                    background: '#fff', 
                    borderRadius: 14, 
                    border: '1px solid #e8ecf0' 
                }}>
                    <FileText size={40} color="#a0aec0" style={{ display: 'block', margin: '0 auto 12px' }} />
                    <div style={{ color: '#a0aec0', fontSize: 14 }}>No plan requests yet</div>
                    <p style={{ color: '#a0aec0', fontSize: 12, marginTop: 4 }}>
                        Corporate plan requests will appear here once submitted.
                    </p>
                </div>
            ) : (
                <div style={{ marginTop: 16 }}>
                    {rows.map(r => (
                        <div key={r.id}>
                            <div onClick={() => setOpenId(openId === r.id ? null : r.id)} style={rowStyle}>
                                <span style={{ ...badgeStyle, background: STATUS_COLORS[r.status] || '#6c757d' }}>
                                    {r.status || 'unknown'}
                                </span>
                                <span style={{ fontWeight: 600 }}>{r.corporate_name || 'Unknown'}</span>
                                <span>{r.plan_name || 'Unnamed'} ({r.tier || 'N/A'})</span>
                                <span>{r.expected_employee_count || 0} employees</span>
                                <span>{formatCurrency(r.estimated_annual_premium || 0)}</span>
                            </div>
                            {openId === r.id && <RowDetail row={r} onChange={invalidate} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function RowDetail({ row, onChange }) {
    const [premium, setPremium] = useState(row.estimated_annual_premium || '');
    const [maxBenefit, setMaxBenefit] = useState('');
    const [notes, setNotes] = useState('');

    const approveMutation = useMutation({
        mutationFn: () => approvePlanRequest(row.id, { annual_premium: premium, max_benefit_value: maxBenefit, notes }),
        onSuccess: onChange,
    });
    const rejectMutation = useMutation({ mutationFn: () => rejectPlanRequest(row.id, notes), onSuccess: onChange });

    if (row.status !== 'submitted') {
        return <div style={detailStyle}>This request has been {row.status}.</div>;
    }

    return (
        <div style={detailStyle}>
            <input type="number" value={premium} onChange={e => setPremium(e.target.value)} placeholder="Final annual premium" style={inputStyle} />
            <input type="number" value={maxBenefit} onChange={e => setMaxBenefit(e.target.value)} placeholder="Max benefit value" style={inputStyle} />
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" style={inputStyle} />
            <button onClick={() => approveMutation.mutate()} disabled={!premium || !maxBenefit}>Approve and Create Plan</button>
            <button onClick={() => rejectMutation.mutate()} disabled={!notes}>Reject</button>
        </div>
    );
}

const rowStyle = { display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' };
const badgeStyle = { color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 8 };
const detailStyle = { padding: 16, background: '#f7fafc' };
const inputStyle = { padding: 6, marginRight: 8, width: 180 };