import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText,Plus, Search, Filter, AlertTriangle } from 'lucide-react';
import { fetchClaims } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert, EmptyState } from '../../components/ui/index';

import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { fetchDashboardDigest } from '../../api/index';


const STATUS_TABS = [
    { key: '',                  label: 'All' },
    { key: 'submitted',         label: 'Submitted' },
    { key: 'auto_validating',   label: 'Validating' },
    { key: 'flagged',           label: 'Flagged' },
    { key: 'under_review',      label: 'Under Review' },
    { key: 'supervisor_review', label: 'Supervisor' },
    { key: 'approved',          label: 'Approved' },
    { key: 'paid',              label: 'Paid' },
    { key: 'rejected',          label: 'Rejected' },
];

const STATUS_COLOR = {
    submitted:         'secondary',
    auto_validating:   'info',
    auto_validated:    'info',
    flagged:           'danger',
    under_review:      'warning',
    supervisor_review: 'warning',
    approved:          'success',
    paid:              'primary',
    rejected:          'danger',
    reversed:          'dark',
};

export default function ClaimListPage() {
    const { hasPermission } = useAuth();
    const navigate          = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch]   = useState('');
    const [page, setPage]       = useState(1);
    const statusFilter          = searchParams.get('status') ?? '';

    const [digest, setDigest] = useState(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['claims', { status: statusFilter, search, page }],
        queryFn:  () => fetchClaims({ status: statusFilter || undefined, search: search || undefined, page }),
        keepPreviousData: true,
    });

    useEffect(() => {
        fetchDashboardDigest()
            .then(res => {
                if (res.success) setDigest(res.digest);
            })
            .catch(console.error);
    }, []);

    // const claims = data?.data ?? [];
    const claims = data?.data?.data ?? [];
    const meta   = data?.meta;

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    return (
        <div>
            <PageHeader
                title="Claims Management"
                subtitle="Review, process and approve health claims"
                actions={
                    hasPermission('claims.submit') && (
                        <button className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={() => navigate('/claims/new')}>
                            <Plus size={16} /> Submit Claim
                        </button>
                    )
                }
            />

            {digest && (
                <div className="card mb-4 border-purple-200" style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #e8eef9 100%)' }}>
                    <div className="card-body py-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="fs-5">🤖</span>
                            <h6 className="mb-0 fw-semibold text-purple-700">AI Claims Digest</h6>
                        </div>
                        <p className="mb-0 text-gray-700">{digest}</p>
                    </div>
                </div>
            )}

            {/* Status tabs */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-3">
                    <div className="d-flex gap-1 flex-wrap">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.key}
                                className={`btn btn-sm rounded-pill ${
                                    statusFilter === tab.key
                                        ? 'btn-primary'
                                        : 'btn-outline-secondary'
                                }`}
                                style={{ fontSize: 12 }}
                                onClick={() => {
                                    setSearchParams(tab.key ? { status: tab.key } : {});
                                    setPage(1);
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card-body px-3 pb-2 pt-3">
                    {/* Search bar */}
                    <div className="d-flex gap-3 mb-3">
                        <div className="input-group" style={{ maxWidth: 340 }}>
                            <span className="input-group-text bg-white border-end-0">
                                <Search size={15} className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Search claim number, enrollee..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : claims.length === 0 ? (
                        <EmptyState
                            icon={<FileText size={48} />}
                            title="No claims found"
                            description={statusFilter ? `No ${statusFilter.replace('_',' ')} claims.` : 'Submit the first claim to get started.'}
                        />
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Claim No.</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Enrollee</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>HCP</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Type</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Service Date</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Amount</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Risk</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claims.map(claim => (
                                        <tr key={claim.id}
                                            className="cursor-pointer"
                                            onClick={() => navigate(`/claims/${claim.id}`)}>
                                            <td>
                                                <span className="font-monospace" style={{ fontSize: 12 }}>
                                                    {claim.claim_number}
                                                </span>
                                                {claim.is_high_risk && (
                                                    <AlertTriangle size={12} className="text-danger ms-1" />
                                                )}
                                            </td>
                                            <td style={{ fontSize: 13 }}>
                                                <div>{claim.enrollee?.full_name}</div>
                                                <div className="text-muted" style={{ fontSize: 11 }}>
                                                    {claim.enrollee?.enrollee_id}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{claim.hcp?.name}</td>
                                            <td style={{ fontSize: 12 }}>
                                                {claim.claim_type_label ?? claim.claim_type}
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                {formatDate(claim.service_date)}
                                            </td>
                                            <td style={{ fontSize: 13, fontWeight: 600 }}>
                                                {formatCurrency(claim.total_amount_claimed)}
                                            </td>
                                            <td>
                                                <RiskBadge score={claim.risk_score} />
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    status={claim.status}
                                                    color={STATUS_COLOR[claim.status] ?? 'secondary'}
                                                    label={claim.status_label ?? claim.status}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary py-0"
                                                    style={{ fontSize: 11 }}
                                                    onClick={e => { e.stopPropagation(); navigate(`/claims/${claim.id}`); }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination meta={meta} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}

function RiskBadge({ score }) {
    if (score == null || score === 0) return <span className="text-muted" style={{ fontSize: 11 }}>—</span>;
    const color = score >= 70 ? '#c5221f' : score >= 40 ? '#e65100' : '#137333';
    const bg    = score >= 70 ? '#fce8e6' : score >= 40 ? '#fef7e0' : '#e6f4ea';
    return (
        <span className="badge" style={{ background: bg, color, fontSize: 11, fontWeight: 700 }}>
            {score}
        </span>
    );
}