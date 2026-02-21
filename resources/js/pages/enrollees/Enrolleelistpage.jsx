// ============================================================
// FILE: EnrolleeListPage.jsx
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, UserCheck, UserX } from 'lucide-react';
import { fetchEnrollees } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert, EmptyState } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/format';

export default function EnrolleeListPage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch]     = useState('');
    const [status, setStatus]     = useState('');
    const [corporate, setCorporate] = useState('');
    const [page, setPage]         = useState(1);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['enrollees', { search, status, corporate, page }],
        queryFn:  () => fetchEnrollees({ search: search || undefined, status: status || undefined, corporate_id: corporate || undefined, page }),
        keepPreviousData: true,
    });

    // const enrollees = data?.data ?? [];
    // const meta      = data?.meta;

    const enrollees = data?.data?.data ?? [];
    const meta      = data?.meta;
    
    // Add this debug line temporarily
    console.log('data structure:', data);

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const STATUS_COLOR = {
        active: 'success', inactive: 'secondary', suspended: 'warning', deceased: 'dark',
    };

    return (
        <div>
            <PageHeader
                title="Enrollees"
                subtitle="Manage all enrolled members and their dependents"
                actions={
                    hasPermission('enrollees.create') && (
                        <button className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={() => navigate('/enrollees/new')}>
                            <Plus size={16} /> New Enrollee
                        </button>
                    )
                }
            />

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    <div className="d-flex flex-wrap gap-3 mb-4">
                        <div className="input-group" style={{ maxWidth: 340 }}>
                            <span className="input-group-text bg-white"><Search size={15} className="text-muted" /></span>
                            <input
                                className="form-control border-start-0"
                                placeholder="Name, ID, phone, email..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <select className="form-select" style={{ maxWidth: 160 }}
                                value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : enrollees.length === 0 ? (
                        <EmptyState icon={UserCheck} title="No enrollees found" />
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12 }}>Enrollee</th>
                                        <th style={{ fontSize: 12 }}>ID</th>
                                        <th style={{ fontSize: 12 }}>Corporate</th>
                                        <th style={{ fontSize: 12 }}>Plan</th>
                                        <th style={{ fontSize: 12 }}>Expiry</th>
                                        <th style={{ fontSize: 12 }}>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrollees.map(e => (
                                        <tr key={e.id} className="cursor-pointer"
                                            onClick={() => navigate(`/enrollees/${e.id}`)}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center text-primary fw-bold"
                                                         style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                                                        {e.first_name?.charAt(0)}{e.last_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 13 }}>{e.full_name}</div>
                                                        <div className="text-muted" style={{ fontSize: 11 }}>
                                                            {e.gender === 'M' ? 'Male' : 'Female'} · Age {e.age}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="font-monospace" style={{ fontSize: 12 }}>{e.enrollee_id}</td>
                                            <td style={{ fontSize: 12 }}>{e.corporate?.name ?? '—'}</td>
                                            <td style={{ fontSize: 12 }}>{e.plan?.plan_name ?? '—'}</td>
                                            <td style={{ fontSize: 12 }}>
                                                <span className={e.is_expired ? 'text-danger' : ''}>
                                                    {formatDate(e.expiry_date)}
                                                </span>
                                                {e.is_expired && (
                                                    <span className="badge bg-danger-subtle text-danger ms-1" style={{ fontSize: 10 }}>
                                                        Expired
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    status={e.status}
                                                    color={STATUS_COLOR[e.status] ?? 'secondary'}
                                                    label={e.status}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-primary py-0"
                                                    style={{ fontSize: 11 }}
                                                    onClick={ev => { ev.stopPropagation(); navigate(`/enrollees/${e.id}`); }}
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