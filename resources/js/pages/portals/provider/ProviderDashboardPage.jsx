/**
 * NEW FILE - resources/js/pages/portals/provider/ProviderDashboardPage.jsx
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchProviderDashboard, fetchProviderCheckins, acknowledgeProviderCheckin } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { FileText, Clock, Wallet, ShieldCheck, Plus, UserCheck, Bell } from 'lucide-react';

export default function ProviderDashboardPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['provider-dashboard'],
        queryFn: fetchProviderDashboard,
    });

    // [PHASE 2b] - poll every 15s for new check-ins, no websocket needed
    const { data: checkinsData } = useQuery({
        queryKey: ['provider-checkins'],
        queryFn: fetchProviderCheckins,
        refetchInterval: 15000,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: (id) => acknowledgeProviderCheckin(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-checkins'] }),
    });

    const checkins = checkinsData?.data ?? [];

    const d = data?.data;

    if (isLoading) return <div style={loadingStyle}>Loading…</div>;
    if (!d) return <div style={loadingStyle}>No provider record linked to this account.</div>;

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>{d.hcp_name}</h1>
                    <p style={subtitleStyle}>{d.hcp_code} · {d.payment_model} · Status: {d.status}</p>
                </div>
                <button onClick={() => navigate('/provider/claims/new')} style={newClaimButtonStyle}>
                    <Plus size={14} /> Submit claim
                </button>
            </div>

            {/* [PHASE 2b] - check-in alert strip, only shows when someone's waiting */}
            {checkins.length > 0 && (
                <div style={checkinStripStyle}>
                    <div style={checkinHeaderStyle}>
                        <Bell size={16} color="#e65100" />
                        <span style={checkinHeaderTextStyle}>{checkins.length} member{checkins.length > 1 ? 's' : ''} checked in</span>
                    </div>
                    {checkins.map(c => (
                        <div key={c.id} style={checkinRowStyle}>
                            <div>
                                <span style={checkinNameStyle}>{c.member_name}</span>
                                {c.member_number && <span style={checkinNumberStyle}> · {c.member_number}</span>}
                                <div style={checkinTimeStyle}>{c.checked_in_at} · {c.minutes_ago}m ago</div>
                            </div>
                            <button onClick={() => acknowledgeMutation.mutate(c.id)} style={acknowledgeButtonStyle}>
                                <UserCheck size={13} /> Seen
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={statsGridStyle}>
                <StatCard icon={FileText} label="Claims this month" value={d.claims_this_month} />
                <StatCard icon={Clock} label="Pending claims" value={d.pending_claims} accent="#e65100" />
                <StatCard icon={Wallet} label="Paid this month" value={formatCurrency(d.paid_this_month)} accent="#137333" />
                <StatCard icon={ShieldCheck} label="Open pre-auths" value={d.open_pre_auths} accent="#1967d2" />
            </div>

            <h2 style={sectionTitleStyle}>Recent claims</h2>
            {!d.recent_claims?.length ? (
                <div style={emptyStyle}>No claims submitted yet.</div>
            ) : (
                <div style={listStyle}>
                    {d.recent_claims.map(c => (
                        <div key={c.id} style={rowStyle}>
                            <div>
                                <span style={numberStyle}>{c.claim_number}</span>
                                <div style={metaStyle}>{c.enrollee_name} · {formatDate(c.service_date)}</div>
                            </div>
                            <div style={rightStyle}>
                                <div style={amountStyle}>{formatCurrency(c.total_amount_claimed)}</div>
                                <div style={statusStyle}>{c.status}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, accent = '#0f4c81' }) {
    return (
        <div style={cardStyle}>
            <Icon size={18} color={accent} />
            <div style={cardValueStyle}>{value}</div>
            <div style={cardLabelStyle}>{label}</div>
        </div>
    );
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const newClaimButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 };
const cardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 16 };
const cardValueStyle = { fontSize: 22, fontWeight: 700, color: '#2d3748', marginTop: 8 };
const cardLabelStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 10 };
const emptyStyle = { textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', color: '#a0aec0', fontSize: 13 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '12px 16px' };
const numberStyle = { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0f4c81' };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const rightStyle = { textAlign: 'right' };
const amountStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
const statusStyle = { fontSize: 11, color: '#a0aec0', marginTop: 2, textTransform: 'capitalize' };

// [PHASE 2b]
const checkinStripStyle = { background: '#fff8e1', border: '1px solid #f5d76e', borderRadius: 12, padding: 14, marginBottom: 20 };
const checkinHeaderStyle = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 };
const checkinHeaderTextStyle = { fontSize: 13, fontWeight: 700, color: '#7a5c00' };
const checkinRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f0e4b8' };
const checkinNameStyle = { fontSize: 13, fontWeight: 600, color: '#2d3748' };
const checkinNumberStyle = { fontSize: 12, color: '#718096' };
const checkinTimeStyle = { fontSize: 11, color: '#a0aec0', marginTop: 2 };
const acknowledgeButtonStyle = { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#137333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
