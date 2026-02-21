/**
 * FILE LOCATION: resources/js/pages/dashboard/DashboardPage.jsx
 *
 * Main dashboard page — shown at GET /
 * Fetches aggregate stats via GET /api/v1/reports/dashboard
 *
 * IMPORTANT — icon prop usage:
 *   CORRECT:   icon={FileText}     ← pass the component reference
 *   WRONG:     icon={<FileText />} ← this passes a JSX element object, causes React error
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Users, Building2, CreditCard,
    AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import {
    BarChart, Bar,Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line
} from 'recharts';
import { fetchDashboard } from '../../api/index';
import { StatCard, StatusBadge, ErrorAlert, LoadingSpinner, PageHeader } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

export default function DashboardPage() {
    const { user, isHQ } = useAuth();
    const navigate = useNavigate();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['dashboard'],
        queryFn:  fetchDashboard,
        refetchInterval: 60_000,
    });

    console.log('Raw dashboard data from API:', data);
    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const d = data?.data?.data ?? null;

    const getIntelligentGreeting = () => {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 12) {
            return '🌅 Good morning';
        } else if (hour >= 12 && hour < 17) {
            return '☀️ Good afternoon';
        } else if (hour >= 17 && hour < 21) {
            return '🌆 Good evening';
        } else {
            return '🌙 Good night';
        }
    };
    return (
        <div>
            <PageHeader
                title={`${getIntelligentGreeting()}, ${user?.name?.split(' ')[0] ?? ''}`}
                subtitle={`${isHQ() ? 'HQ Overview' : (user?.branch?.name ?? '')} · ${new Date().toLocaleDateString('en-NG', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}`}
            />

            {/* ── Key Stats ─────────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-xl-3">
                    <StatCard
                        title="Total Claims"
                        value={d?.claims_summary?.total?.toLocaleString()}
                        subtitle={`${d?.claims_summary?.pending ?? 0} pending`}
                        icon={FileText}
                        color="primary"
                        loading={isLoading}
                    />
                </div>
                <div className="col-sm-6 col-xl-3">
                    <StatCard
                        title="Active Enrollees"
                        value={d?.enrollee_summary?.active?.toLocaleString()}
                        subtitle={`${d?.enrollee_summary?.expired ?? 0} expired plans`}
                        icon={Users}
                        color="success"
                        loading={isLoading}
                    />
                </div>
                <div className="col-sm-6 col-xl-3">
                    <StatCard
                        title="Active HCPs"
                        value={d?.hcp_summary?.active?.toLocaleString()}
                        subtitle={`${d?.hcp_summary?.pending ?? 0} pending accreditation`}
                        icon={Building2}
                        color="info"
                        loading={isLoading}
                    />
                </div>
                <div className="col-sm-6 col-xl-3">
                    <StatCard
                        title="Pending Payout"
                        value={formatCurrency(d?.finance_summary?.total_pending_payout)}
                        subtitle={`${d?.finance_summary?.pending_batches ?? 0} batches awaiting approval`}
                        icon={CreditCard}
                        color="warning"
                        loading={isLoading}
                    />
                </div>
            </div>

            <div className="row g-4">
                {/* ── Claims This Month Chart ──────────────────────────── */}
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                            <h6 className="fw-bold mb-0">Claims This Month</h6>
                            <p className="text-muted mb-0" style={{ fontSize: 12 }}>Weekly volume and average risk score</p>
                        </div>
                        <div className="card-body">
                        {!d?.claims_this_month || d.claims_this_month.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                No claims data available for this month
                            </div>
                        ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={d?.claims_this_month ?? []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                        <Tooltip 
                                            formatter={(val, name) =>
                                                name === 'count' ? [val, 'Claims'] : [`${val?.toFixed(1)}/100`, 'Avg Risk']
                                            } 
                                        />
                                        <Bar yAxisId="left" dataKey="count" radius={[4, 4, 0, 0]}>
                                            {d?.claims_this_month?.map((entry, index) => {
                                                // Color bars based on avg_risk_score
                                                let barColor = 'rgb(30, 58, 95)'; // default primary
                                                if (entry?.avg_risk_score > 70) {
                                                    barColor = '#e53e3e'; // red - high risk
                                                } else if (entry?.avg_risk_score > 40) {
                                                    barColor = '#f59e0b'; // orange - medium risk
                                                } else {
                                                    barColor = 'rgb(30, 58, 95)'; // blue - low risk
                                                }
                                                return <Cell key={`cell-${index}`} fill={barColor} />;
                                            })}
                                        </Bar>
                                        <Line 
                                            yAxisId="right" 
                                            type="monotone" 
                                            dataKey="avg_risk_score" 
                                            stroke="#e53e3e" 
                                            dot={false} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Pending Actions ──────────────────────────────────── */}
                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                            <h6 className="fw-bold mb-0">Pending Actions</h6>
                        </div>
                        <div className="card-body">
                            {isLoading ? <LoadingSpinner /> : (
                                <div className="vstack gap-3">
                                    <PendingItem
                                        icon={Clock}
                                        iconClass="text-info"
                                        label="Awaiting Review"
                                        count={d?.pending_actions?.claims_awaiting_review ?? 0}
                                        onClick={() => navigate('/claims?status=auto_validated')}
                                    />
                                    <PendingItem
                                        icon={FileText}
                                        iconClass="text-warning"
                                        label="Under Review"
                                        count={d?.pending_actions?.claims_under_review ?? 0}
                                        onClick={() => navigate('/claims?status=under_review')}
                                    />
                                    <PendingItem
                                        icon={AlertTriangle}
                                        iconClass="text-danger"
                                        label="Supervisor Review"
                                        count={d?.pending_actions?.claims_supervisor ?? 0}
                                        onClick={() => navigate('/claims?status=supervisor_review')}
                                    />
                                    <PendingItem
                                        icon={CheckCircle}
                                        iconClass="text-success"
                                        label="Approved — Not Batched"
                                        count={d?.pending_actions?.claims_approved_not_batched ?? 0}
                                        onClick={() => navigate('/finance')}
                                        highlight={(d?.pending_actions?.claims_approved_not_batched ?? 0) > 0}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Fraud Alerts ─────────────────────────────────────── */}
                {(isLoading || (d?.fraud_alerts?.length ?? 0) > 0) && (
                    <div className="col-12">
                        <div className="card border-0 shadow-sm border-start border-danger border-4">
                            <div className="card-header bg-white border-0 pt-3 px-4 pb-0 d-flex justify-content-between align-items-center">
                                <h6 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                                    <AlertTriangle size={16} /> High-Risk Claims Requiring Attention
                                </h6>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => navigate('/claims?high_risk=1')}>
                                    View All
                                </button>
                            </div>
                            <div className="card-body">
                                {isLoading ? <LoadingSpinner /> : (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ fontSize: 12 }}>Claim No.</th>
                                                    <th style={{ fontSize: 12 }}>HCP</th>
                                                    <th style={{ fontSize: 12 }}>Amount</th>
                                                    <th style={{ fontSize: 12 }}>Risk Score</th>
                                                    <th style={{ fontSize: 12 }}>Status</th>
                                                    <th />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(d?.fraud_alerts ?? []).map(claim => (
                                                    <tr key={claim.id}>
                                                        <td className="font-monospace" style={{ fontSize: 12 }}>{claim.claim_number}</td>
                                                        <td style={{ fontSize: 12 }}>{claim.hcp?.name}</td>
                                                        <td style={{ fontSize: 12 }}>{formatCurrency(claim.total_amount_claimed)}</td>
                                                        <td><RiskScoreBadge score={claim.risk_score} /></td>
                                                        <td>
                                                            <StatusBadge
                                                                status={claim.status}
                                                                color="warning"
                                                                label={claim.status?.replace(/_/g, ' ')}
                                                            />
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline-primary py-0"
                                                                style={{ fontSize: 11 }}
                                                                onClick={() => navigate(`/claims/${claim.id}`)}
                                                            >
                                                                Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PendingItem({ icon: Icon, iconClass, label, count, onClick, highlight }) {
    return (
        <button
            className={`btn text-start d-flex align-items-center justify-content-between p-3 rounded-3 border ${
                highlight ? 'border-success bg-success-subtle' : 'border-light'
            }`}
            onClick={onClick}
        >
            <div className="d-flex align-items-center gap-2">
                <Icon size={16} className={iconClass} />
                <span style={{ fontSize: 13 }}>{label}</span>
            </div>
            <span className={`badge rounded-pill ${count > 0 ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: 12 }}>
                {count}
            </span>
        </button>
    );
}

function RiskScoreBadge({ score }) {
    const color = score >= 90 ? '#c5221f' : score >= 70 ? '#e65100' : '#137333';
    return (
        <span className="badge" style={{ background: `${color}20`, color, fontWeight: 700, fontSize: 11 }}>
            {score}/100
        </span>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}