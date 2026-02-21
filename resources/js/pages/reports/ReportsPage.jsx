import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    BarChart3, TrendingUp, Users, Building2, DollarSign, 
    FileText, Download, Calendar, Filter 
} from 'lucide-react';
import { 
    fetchClaimsAging, fetchClaimsByHCP, fetchClaimsByType, 
    fetchCostByCorporate, fetchHighCostEnrollees, fetchHCPPerformance,
    fetchDashboard 
} from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert, StatCard } from '../../components/ui/index';
import { formatCurrency, formatDate } from '../../utils/format';

export default function ReportsPage() {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });

    // Fetch dashboard summary
    const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useQuery({
        queryKey: ['dashboard'],
        queryFn: fetchDashboard,
    });

    // Fetch claims aging
    const { data: claimsAging, isLoading: agingLoading, error: agingError } = useQuery({
        queryKey: ['claimsAging', dateRange],
        queryFn: () => fetchClaimsAging(dateRange),
    });

    console.log('Dashboard data:', dashboard);
    console.log('Dashboard error:', dashboardError);

    if (dashboardLoading) return <LoadingSpinner />;
    if (dashboardError) return <ErrorAlert message={dashboardError.message} onRetry={() => window.location.reload()} />;

    // Safely access nested data
    const dashboardData = dashboard?.data || dashboard || {};

    const reports = [
        {
            title: 'Claims Aging',
            description: 'Analysis of claims by age buckets',
            icon: <BarChart3 size={24} />,
            path: '/reports/claims-aging',
            color: 'primary',
        },
        {
            title: 'Claims by HCP',
            description: 'Claims volume and value per healthcare provider',
            icon: <Building2 size={24} />,
            path: '/reports/claims-by-hcp',
            color: 'success',
        },
        {
            title: 'Claims by Type',
            description: 'Distribution of claims by service type',
            icon: <FileText size={24} />,
            path: '/reports/claims-by-type',
            color: 'info',
        },
        {
            title: 'Cost by Corporate',
            description: 'Healthcare costs per corporate client',
            icon: <DollarSign size={24} />,
            path: '/reports/cost-by-corporate',
            color: 'warning',
        },
        {
            title: 'High Cost Enrollees',
            description: 'Enrollees with above-threshold claims',
            icon: <TrendingUp size={24} />,
            path: '/reports/high-cost-enrollees',
            color: 'danger',
        },
        {
            title: 'HCP Performance',
            description: 'Provider performance metrics and scores',
            icon: <Users size={24} />,
            path: '/reports/hcp-performance',
            color: 'secondary',
        },
        {
            title: 'Audit Logs',
            description: 'System activity and audit trail',
            icon: <FileText size={24} />,
            path: '/reports/audit-logs',
            color: 'dark',
        },
    ];

    return (
        <div>
            <PageHeader 
                title="Reports & Analytics" 
                subtitle="View and export system reports"
                actions={
                    <button className="btn btn-outline-primary">
                        <Download size={18} className="me-1" />
                        Export All
                    </button>
                }
            />

            {/* Date Range Filter */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-auto">
                            <Calendar size={20} className="text-muted" />
                        </div>
                        <div className="col-auto">
                            <label className="form-label mb-0">From</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateRange.from}
                                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            />
                        </div>
                        <div className="col-auto">
                            <label className="form-label mb-0">To</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateRange.to}
                                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            />
                        </div>
                        <div className="col-auto">
                            <button className="btn btn-outline-secondary mt-4">
                                <Filter size={18} className="me-1" />
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <StatCard
                        title="Total Claims"
                        value={dashboardData.total_claims?.toLocaleString() || '0'}
                        subtitle="All time claims"
                        icon={FileText}
                        color="primary"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Total Paid"
                        value={formatCurrency(dashboardData.total_paid || 0)}
                        subtitle="Amount disbursed"
                        icon={DollarSign}
                        color="success"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Pending Claims"
                        value={dashboardData.pending_claims?.toLocaleString() || '0'}
                        subtitle="Awaiting processing"
                        icon={FileText}
                        color="warning"
                        loading={dashboardLoading}
                    />
                </div>
                <div className="col-md-3">
                    <StatCard
                        title="Active HCPs"
                        value={dashboardData.active_hcps?.toLocaleString() || '0'}
                        subtitle="Healthcare providers"
                        icon={Building2}
                        color="info"
                        loading={dashboardLoading}
                    />
                </div>
            </div>

            {/* Reports Grid */}
            <div className="row">
                {reports.map((report, index) => (
                    <div key={index} className="col-md-4 mb-4">
                        <div 
                            className="card h-100 cursor-pointer hover-shadow"
                            onClick={() => navigate(report.path)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="card-body">
                                <div className={`text-${report.color} mb-3`}>
                                    {report.icon}
                                </div>
                                <h5 className="card-title">{report.title}</h5>
                                <p className="card-text text-muted">{report.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Aging Summary Preview */}
            {claimsAging && claimsAging.aging && (
                <div className="card mt-4">
                    <div className="card-header">
                        <h5 className="mb-0">Claims Aging Summary</h5>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Aging Bucket</th>
                                        <th>Claim Count</th>
                                        <th>Total Claimed</th>
                                        <th>Total Approved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claimsAging.aging.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.aging_bucket}</td>
                                            <td>{item.claim_count}</td>
                                            <td>{formatCurrency(item.total_claimed)}</td>
                                            <td>{formatCurrency(item.total_approved)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}