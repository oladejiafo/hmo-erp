/**
 * FILE LOCATION: resources/js/pages/portals/corporate/CorpDashboardPage.jsx
 *
 * Corporate self-service dashboard - landing page after login for corporate users.
 * Shows: enrollee count, invoice status, recent claims, quick actions.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchCorpPortalDashboard } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import {
    Users, FileText, CreditCard, AlertTriangle,
    CheckCircle, Clock, TrendingUp, ArrowRight, Plus,
} from 'lucide-react';


export default function CorpDashboardPage() {
    const { user }   = useAuth();
    const navigate   = useNavigate();
    const { data, isLoading } = useQuery({
        queryKey: ['corp-portal-dashboard'],
        queryFn:  fetchCorpPortalDashboard,
    });

    const d = data?.data ?? null;
    const firstName = user?.name?.split(' ')[0] ?? 'there';
    const greeting  = getGreeting();

    return (
        <div>
            {/* Welcome banner */}
            <div style={{
                background:   'linear-gradient(135deg, #0f4c81 0%, #1565c0 50%, #1a6fad 100%)',
                borderRadius: 16, padding: '28px 32px',
                marginBottom: 28, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(15,76,129,0.25)',
            }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                        {greeting}, {firstName} 👋
                    </div>
                    <div style={{ opacity: 0.8, fontSize: 14 }}>
                        {d?.corporate_name ?? user?.corporate?.name ?? 'Your Company'} ·{' '}
                        {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {d?.plan_expiry && (
                        <div style={{
                            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(255,255,255,0.15)', padding: '4px 12px',
                            borderRadius: 20, fontSize: 12,
                        }}>
                            <Clock size={12} />
                            Policy expires: {formatDate(d.plan_expiry)}
                        </div>
                    )}
                </div>
                <div style={{ textAlign: 'right', display: 'none' }} className="d-md-block">
                    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Current Plan</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{d?.plan_name ?? 'Standard Plan'}</div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                <StatCard
                    icon={Users} iconColor="#0f4c81" iconBg="#e8f0fe"
                    label="Active Enrollees"
                    value={isLoading ? '…' : (d?.active_enrollees ?? 0).toLocaleString()}
                    sub={`of ${(d?.total_enrollees ?? 0).toLocaleString()} total`}
                    onClick={() => navigate('/corporate/enrollees')}
                />
                <StatCard
                    icon={CreditCard} iconColor="#137333" iconBg="#e6f4ea"
                    label="Outstanding Invoices"
                    value={isLoading ? '…' : formatCurrency(d?.outstanding_invoices_amount ?? 0, false)}
                    sub={`${d?.outstanding_invoices_count ?? 0} unpaid`}
                    onClick={() => navigate('/corporate/invoices')}
                    alert={d?.overdue_invoices_count > 0}
                />
                <StatCard
                    icon={FileText} iconColor="#c55a11" iconBg="#fff3e0"
                    label="Claims (This Month)"
                    value={isLoading ? '…' : (d?.claims_this_month ?? 0).toLocaleString()}
                    sub={`₦${compactNum(d?.claims_amount_this_month ?? 0)} total value`}
                    onClick={() => navigate('/corporate/claims')}
                />
                <StatCard
                    icon={TrendingUp} iconColor="#5e35b1" iconBg="#f3e5f5"
                    label="Annual Premium"
                    value={isLoading ? '…' : formatCurrency(d?.annual_premium ?? 0, false)}
                    sub="Total plan premium"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="row-cols-1 row-cols-md-2">

                {/* Recent Claims */}
                <Card title="Recent Claims" action={{ label: 'View All', onClick: () => navigate('/corporate/claims') }}>
                    {isLoading ? <Loader /> : !d?.recent_claims?.length ? (
                        <Empty message="No recent claims" />
                    ) : d.recent_claims.map(c => (
                        <div key={c.id} style={rowStyle}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#2d3748' }}>{c.enrollee_name}</div>
                                <div style={{ fontSize: 11, color: '#718096' }}>{c.claim_number} · {formatDate(c.service_date)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(c.amount, false)}</div>
                                <StatusPill status={c.status} />
                            </div>
                        </div>
                    ))}
                </Card>

                {/* Invoices */}
                <Card title="Invoice Status" action={{ label: 'View All', onClick: () => navigate('/corporate/invoices') }}>
                    {isLoading ? <Loader /> : !d?.recent_invoices?.length ? (
                        <Empty message="No invoices found" />
                    ) : d.recent_invoices.map(inv => (
                        <div key={inv.id} style={rowStyle}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#2d3748' }}>
                                    Invoice #{inv.invoice_number}
                                </div>
                                <div style={{ fontSize: 11, color: '#718096' }}>Due: {formatDate(inv.due_date)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(inv.total_amount, false)}</div>
                                <InvoicePill status={inv.status} overdue={inv.is_overdue} />
                            </div>
                        </div>
                    ))}
                </Card>

            </div>

            {/* Quick actions */}
            <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 12 }}>
                    QUICK ACTIONS
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <QuickAction icon={Plus} label="Add Staff Member" onClick={() => navigate('/corporate/enrollees?action=add')} />
                    <QuickAction icon={FileText} label="View Claims" onClick={() => navigate('/corporate/claims')} />
                    <QuickAction icon={CreditCard} label="Pay Invoice" onClick={() => navigate('/corporate/invoices')} />
                    <QuickAction icon={Users} label="Download ID Cards" onClick={() => navigate('/corporate/enrollees')} />
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub, onClick, alert }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: '#fff', borderRadius: 12, padding: '20px 22px',
                border: `1px solid ${alert ? '#fca5a5' : '#e8ecf0'}`,
                cursor: onClick ? 'pointer' : 'default',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                position: 'relative',
            }}
            onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; }}
        >
            {alert && (
                <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={20} color={iconColor} />
                </div>
                <div style={{ fontSize: 12, color: '#718096', fontWeight: 500 }}>{label}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1a202c', marginBottom: 2 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: '#a0aec0' }}>{sub}</div>}
        </div>
    );
}

function Card({ title, action, children }) {
    return (
        <div style={{
            background: '#fff', borderRadius: 12, padding: '20px',
            border: '1px solid #e8ecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>{title}</div>
                {action && (
                    <button
                        onClick={action.onClick}
                        style={{ background: 'none', border: 'none', color: '#0f4c81', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                        {action.label} <ArrowRight size={12} />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function QuickAction({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 10,
                background: '#fff', border: '1px solid #e2e8f0',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                color: '#2d3748', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#f0f4f8'; e.currentTarget.style.borderColor='#0f4c81'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#e2e8f0'; }}
        >
            <Icon size={15} color="#0f4c81" />
            {label}
        </button>
    );
}

const statusMap = {
    approved: { label: 'Approved', bg: '#e6f4ea', color: '#137333' },
    paid:     { label: 'Paid',     bg: '#e8f0fe', color: '#1967d2' },
    rejected: { label: 'Rejected', bg: '#fce8e6', color: '#c5221f' },
    submitted:{ label: 'Submitted',bg: '#fff3e0', color: '#e65100' },
    under_review:{ label:'In Review',bg:'#fff8e1',color:'#f57f17' },
};
function StatusPill({ status }) {
    const s = statusMap[status] ?? { label: status, bg: '#f0f0f0', color: '#555' };
    return <span style={{ fontSize: 10, background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{s.label}</span>;
}
function InvoicePill({ status, overdue }) {
    if (overdue) return <span style={{ fontSize: 10, background: '#fce8e6', color: '#c5221f', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>OVERDUE</span>;
    if (status === 'paid') return <span style={{ fontSize: 10, background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>PAID</span>;
    return <span style={{ fontSize: 10, background: '#fff8e1', color: '#f57f17', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>UNPAID</span>;
}
function Loader() { return <div style={{ textAlign:'center', padding:'20px', color:'#a0aec0', fontSize:13 }}>Loading…</div>; }
function Empty({ message }) { return <div style={{ textAlign:'center', padding:'20px', color:'#a0aec0', fontSize:13 }}>{message}</div>; }
const rowStyle = { display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f0f4f8' };

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}
function compactNum(n) {
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
    return n;
}
