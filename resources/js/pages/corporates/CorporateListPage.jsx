/**
 * CorporateListPage
 *
 * Route:   /corporates
 * Permission required: corporates.view
 *
 * What this page does:
 *   - Lists all corporates for the user's branch (HQ sees all)
 *   - Search by name, code, RC number
 *   - Filter by status (active/suspended/expired)
 *   - Badge for contracts expiring within 30 days
 *   - Navigate to detail or create form
 *
 * Data flow:
 *   useQuery(['corporates', filters]) → fetchCorporates() → GET /corporates
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Building2, AlertTriangle } from 'lucide-react';
import { fetchCorporates } from '../../api/index';
import {
    PageHeader, StatusBadge, Pagination, LoadingSpinner,
    ErrorAlert, EmptyState
} from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/format';

const STATUS_COLOR = {
    active:     'success',
    suspended:  'warning',
    expired:    'danger',
    terminated: 'dark',
};

export default function CorporateListPage() {
    const { hasPermission } = useAuth();
    const navigate          = useNavigate();

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage]     = useState(1);

    // Every time search/status/page changes, the query refetches automatically
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['corporates', { search, status, page }],
        queryFn:  () => fetchCorporates({
            search:   search  || undefined,
            status:   status  || undefined,
            page,
            per_page: 20,
        }),
        keepPreviousData: true, // keeps old data visible while new page loads
    });

    const corporates = data?.data?.data ?? [];
    const meta       = data?.data?.meta;

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    return (
        <div>
            <PageHeader
                title="Corporates/Clients"
                subtitle="Manage company clients, their plans and invoices"
                breadcrumbs={['Home', 'Corporates']}
                actions={
                    hasPermission('corporates.create') && (
                        <button
                            className="btn btn-primary d-flex align-items-center gap-2"
                            onClick={() => navigate('/corporates/new')}
                        >
                            <Plus size={16} /> New Corporate
                        </button>
                    )
                }
            />

            <div className="card border-0 shadow-sm">
                {/* ── Filters ── */}
                <div className="card-body border-bottom pb-3">
                    <div className="d-flex gap-3 flex-wrap align-items-center">
                        <div className="input-group" style={{ maxWidth: 320 }}>
                            <span className="input-group-text bg-white border-end-0">
                                <Search size={15} className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Search by name, code, RC number..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>

                        <select
                            className="form-select"
                            style={{ width: 160 }}
                            value={status}
                            onChange={e => { setStatus(e.target.value); setPage(1); }}
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="expired">Expired</option>
                            <option value="terminated">Terminated</option>
                        </select>

                        {(search || status) && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
                            >
                                Clear Filters
                            </button>
                        )}

                        <div className="ms-auto text-muted" style={{ fontSize: 13 }}>
                            {meta?.total != null && `${meta.total} records`}
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="card-body p-0">
                    {isLoading ? (
                        <div className="py-5 text-center">
                            <LoadingSpinner text="Loading corporates..." />
                        </div>
                    ) : corporates.length === 0 ? (
                        <EmptyState
                            icon={Building2}
                            title="No corporates found"
                            description={search || status
                                ? 'Try clearing the filters.'
                                : 'Add your first corporate client to get started.'}
                            action={
                                hasPermission('corporates.create') && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => navigate('/corporates/new')}
                                    >
                                        Add Corporate
                                    </button>
                                )
                            }
                        />
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Corporate</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Code</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>RC Number</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Enrollees</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Contract Ends</th>
                                        <th style={{ fontSize: 12, fontWeight: 600 }}>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {corporates.map(corp => (
                                        <tr
                                            key={corp.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/corporates/${corp.id}`)}
                                        >
                                            <td>
                                                <div className="fw-semibold" style={{ fontSize: 13 }}>
                                                    {corp.name}
                                                </div>
                                                {corp.industry && (
                                                    <div className="text-muted" style={{ fontSize: 11 }}>
                                                        {corp.industry}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="font-monospace badge bg-secondary-subtle text-secondary">
                                                    {corp.code}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{corp.rc_number ?? '—'}</td>
                                            <td>
                                                <span className="fw-semibold">
                                                    {corp.active_enrollees_count ?? 0}
                                                </span>
                                                {corp.enrollees_count > 0 && (
                                                    <span className="text-muted" style={{ fontSize: 11 }}>
                                                        /{corp.enrollees_count}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12 }}>
                                                {formatDate(corp.contract_end_date)}
                                                {corp.days_until_renewal != null && corp.days_until_renewal <= 30 && corp.days_until_renewal >= 0 && (
                                                    <span className="badge bg-warning-subtle text-warning ms-1" style={{ fontSize: 10 }}>
                                                        <AlertTriangle size={10} /> {corp.days_until_renewal}d
                                                    </span>
                                                )}
                                                {corp.is_contract_expired && (
                                                    <span className="badge bg-danger-subtle text-danger ms-1" style={{ fontSize: 10 }}>
                                                        Expired
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    status={corp.status}
                                                    color={STATUS_COLOR[corp.status] ?? 'secondary'}
                                                    label={corp.status}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary py-0"
                                                    style={{ fontSize: 11 }}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        navigate(`/corporates/${corp.id}`);
                                                    }}
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
                </div>

                {/* ── Pagination ── */}
                {meta && (
                    <div className="card-body border-top pt-2 pb-3">
                        <Pagination meta={meta} onPageChange={setPage} />
                    </div>
                )}
            </div>
        </div>
    );
}