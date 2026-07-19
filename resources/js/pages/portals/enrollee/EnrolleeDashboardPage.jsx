/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/EnrolleeDashboardPage.jsx
 * Member self-service home - shows coverage summary, benefit balance, recent claims, quick links.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchEnrolleePortalDashboard } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { CreditCard, Activity, FileText, MapPin, MessageSquare, ChevronRight, Shield } from 'lucide-react';

export default function EnrolleeDashboardPage() {
    const { user }   = useAuth();
    const navigate   = useNavigate();
    const { data, isLoading } = useQuery({ 
        queryKey: ['enrollee-portal-dashboard'], 
        queryFn: fetchEnrolleePortalDashboard 
    });

    const d          = data?.data ?? null;
    const firstName  = user?.name?.split(' ')[0] ?? 'Member';
    const initials   = user?.name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() ?? '?';

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>Loading dashboard...</div>;
    }

    return (
        <div>
            {/* Hero card */}
            <div style={heroStyle}>
                <div style={avatarStyle}>
                    {initials}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={greetingStyle}>
                        Hello, {firstName} 👋
                    </div>
                    <div style={memberInfoStyle}>
                        {d?.member_number && <span>Member #: <strong>{d.member_number}</strong></span>}
                        {d?.plan_name     && <span>Plan: <strong>{d.plan_name}</strong></span>}
                        {d?.corporate_name && <span>Company: <strong>{d.corporate_name}</strong></span>}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={coverageLabelStyle}>COVERAGE VALID UNTIL</div>
                    <div style={coverageDateStyle}>{d?.coverage_end ? formatDate(d.coverage_end) : '-'}</div>
                    {d?.status === 'active' && (
                        <div style={activeBadgeStyle}>✓ Active</div>
                    )}
                    {d?.status === 'suspended' && (
                        <div style={suspendedBadgeStyle}>⚠ Suspended</div>
                    )}
                </div>
            </div>

            {/* Suspension warning */}
            {d?.status === 'suspended' && (
                <div style={suspensionWarningStyle}>
                    <strong>⚠ Your coverage is currently suspended.</strong> Please contact your HR department or call our helpline to resolve any outstanding premium issues.
                </div>
            )}

            {/* Benefit balance */}
            <div style={benefitCardStyle}>
                <div style={benefitTitleStyle}>
                    Annual Benefit Summary
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <BenefitMeter
                        label="Benefit Balance"
                        used={d?.benefit_used ?? 0}
                        total={d?.max_benefit ?? 1}
                        color="#0f4c81"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
                        <BenefitRow label="Annual Limit"   value={formatCurrency(d?.max_benefit ?? 0)} />
                        <BenefitRow label="Used This Year" value={formatCurrency(d?.benefit_used ?? 0)} color="#b45309" />
                        <BenefitRow label="Remaining"      value={formatCurrency(d?.benefit_balance ?? 0)} color="#137333" strong />
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div style={quickActionsGridStyle}>
                {[
                    { icon: CreditCard, label: 'My ID Card',      path: '/enrollee/id-card',    color: '#0f4c81', bg: '#e8f0fe' },
                    { icon: Activity,   label: 'My Benefits',     path: '/enrollee/benefits',   color: '#137333', bg: '#e6f4ea' },
                    { icon: FileText,   label: 'My Claims',       path: '/enrollee/claims',     color: '#b45309', bg: '#fff3e0' },
                    { icon: MapPin,     label: 'Find Hospital',   path: '/enrollee/find-hcp',   color: '#5e35b1', bg: '#f3e5f5' },
                    { icon: MessageSquare, label: 'Complaints', path: '/enrollee/complaints', color: '#0277bd', bg: '#e1f5fe' },
                ].map(item => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={quickActionButtonStyle}
                        onMouseEnter={e => { 
                            e.currentTarget.style.transform = 'translateY(-2px)'; 
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; 
                        }}
                        onMouseLeave={e => { 
                            e.currentTarget.style.transform = 'none'; 
                            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; 
                        }}
                    >
                        <div style={{ ...iconContainerStyle, background: item.bg }}>
                            <item.icon size={20} color={item.color} />
                        </div>
                        <div style={quickActionLabelStyle}>{item.label}</div>
                    </button>
                ))}
            </div>

            {/* Dependants & recent claims */}
            <div style={twoColumnGridStyle}>

                {/* Dependants */}
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>Covered Dependants</div>
                    {!d?.dependants?.length ? (
                        <div style={emptyStateStyle}>No dependants registered</div>
                    ) : d.dependants.map(dep => (
                        <div key={dep.id} style={dependantRowStyle}>
                            <div style={avatarSmallStyle}>
                                {dep.first_name?.[0]}{dep.last_name?.[0]}
                            </div>
                            <div>
                                <div style={dependantNameStyle}>{dep.first_name} {dep.last_name}</div>
                                <div style={dependantRelationStyle}>{dep.relationship}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent claims */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div style={cardTitleStyle}>Recent Claims</div>
                        <button 
                            onClick={()=>navigate('/enrollee/claims')} 
                            style={viewAllButtonStyle}
                        >
                            View all <ChevronRight size={12} />
                        </button>
                    </div>
                    {!d?.recent_claims?.length ? (
                        <div style={emptyStateStyle}>No claims yet</div>
                    ) : d.recent_claims.map(c => (
                        <div key={c.id} style={claimRowStyle}>
                            <div style={claimHeaderStyle}>
                                <div style={claimHcpStyle}>{c.hcp_name}</div>
                                <div style={claimAmountStyle}>{formatCurrency(c.total_amount_claimed, false)}</div>
                            </div>
                            <div style={claimFooterStyle}>
                                <div style={claimDateStyle}>{formatDate(c.service_date)}</div>
                                <StatusPill status={c.status} />
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

function BenefitMeter({ label, used, total, color }) {
    const pct = Math.min(100, (used / total) * 100);
    return (
        <div style={{ minWidth: 180 }}>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f0f4f8" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke={color} strokeWidth="2.5"
                        strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                </svg>
                <div style={meterTextStyle}>
                    <div style={{ fontSize: 24, fontWeight: 700, color }}>{100-Math.round(pct)}%</div>
                    <div style={{ fontSize: 11, color: '#718096' }}>remaining</div>
                </div>
            </div>
        </div>
    );
}

function BenefitRow({ label, value, color, strong }) {
    return (
        <div style={benefitRowStyle}>
            <span style={{ fontSize: 13, color: '#718096' }}>{label}</span>
            <span style={{ 
                fontSize: 14, 
                fontWeight: strong ? 700 : 500, 
                color: color ?? '#2d3748' 
            }}>{value}</span>
        </div>
    );
}

const statusMap = { 
    approved: ['Approved', '#e6f4ea', '#137333'], 
    paid: ['Paid', '#e8f0fe', '#0f4c81'], 
    rejected: ['Rejected', '#fce8e6', '#c5221f'], 
    submitted: ['Submitted', '#fff3e0', '#e65100'], 
    under_review: ['In Review', '#fff8e1', '#f57f17'] 
};

function StatusPill({ status }) {
    const [label, bg, color] = statusMap[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={statusPillStyle(bg, color)}>{label}</span>;
}

// Style constants
const heroStyle = {
    background: 'linear-gradient(135deg, #0f4c81 0%, #1565c0 60%, #0288d1 100%)',
    borderRadius: 18,
    padding: '28px',
    marginBottom: 24,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    boxShadow: '0 8px 28px rgba(15,76,129,0.3)',
};

const avatarStyle = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 700,
    flexShrink: 0,
};

const greetingStyle = {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
};

const memberInfoStyle = {
    opacity: 0.8,
    fontSize: 13,
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
};

const coverageLabelStyle = {
    fontSize: 11,
    opacity: 0.75,
    marginBottom: 4,
};

const coverageDateStyle = {
    fontSize: 18,
    fontWeight: 700,
};

const activeBadgeStyle = {
    fontSize: 11,
    background: 'rgba(255,255,255,0.2)',
    padding: '2px 10px',
    borderRadius: 10,
    marginTop: 4,
    display: 'inline-block',
};

const suspendedBadgeStyle = {
    fontSize: 11,
    background: 'rgba(255,100,100,0.4)',
    padding: '2px 10px',
    borderRadius: 10,
    marginTop: 4,
    display: 'inline-block',
};

const suspensionWarningStyle = {
    background: '#fff5f5',
    border: '1px solid #fca5a5',
    borderRadius: 10,
    padding: '14px 18px',
    marginBottom: 20,
    fontSize: 13,
    color: '#7b0000',
};

const benefitCardStyle = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
    padding: '20px 24px',
    marginBottom: 20,
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
};

const benefitTitleStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: '#718096',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const quickActionsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
};

const quickActionButtonStyle = {
    background: '#fff',
    border: '1px solid #e8ecf0',
    borderRadius: 12,
    padding: '16px',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.15s',
};

const iconContainerStyle = {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px',
};

const quickActionLabelStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: '#2d3748',
};

const twoColumnGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
};

const cardStyle = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
};

const cardTitleStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: 12,
};

const viewAllButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#0f4c81',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
};

const emptyStateStyle = {
    color: '#a0aec0',
    fontSize: 13,
    padding: '8px 0',
};

const dependantRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid #f0f4f8',
};

const avatarSmallStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: '#718096',
};

const dependantNameStyle = {
    fontSize: 13,
    fontWeight: 500,
};

const dependantRelationStyle = {
    fontSize: 11,
    color: '#a0aec0',
    textTransform: 'capitalize',
};

const claimRowStyle = {
    padding: '8px 0',
    borderBottom: '1px solid #f0f4f8',
};

const claimHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
};

const claimHcpStyle = {
    fontSize: 13,
    fontWeight: 500,
};

const claimAmountStyle = {
    fontSize: 13,
    fontWeight: 600,
};

const claimFooterStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 2,
};

const claimDateStyle = {
    fontSize: 11,
    color: '#a0aec0',
};

const benefitRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const meterTextStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
};

const statusPillStyle = (bg, color) => ({
    fontSize: 10,
    background: bg,
    color,
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 600,
});