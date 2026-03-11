import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, Calendar, User, MapPin } from 'lucide-react';
import { fetchAuditLogs } from '../../api/index';
import { PageHeader, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatDateTime } from '../../utils/format';

export default function AuditLogPage() {
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        date_from: '',
        date_to: '',
        search: '',
        page: 1,
        per_page: 50,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['auditLogs', filters],
        queryFn: () => fetchAuditLogs(filters),
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            user_id: '',
            action: '',
            date_from: '',
            date_to: '',
            search: '',
            page: 1,
            per_page: 20,
        });
    };

    const exportLogs = () => {
        // Build export URL with filters
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        window.open(`/api/v1/reports/audit-logs/export?${params.toString()}`, '_blank');
    };

    const getActionBadgeClass = (action) => {
        const classes = {
            'created': 'bg-success',
            'updated': 'bg-info',
            'deleted': 'bg-danger',
            'restored': 'bg-warning',
            'login': 'bg-primary',
            'logout': 'bg-secondary',
            'failed_login': 'bg-danger',
            'export': 'bg-dark',
            'import': 'bg-dark',
        };
        return classes[action] || 'bg-secondary';
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title="Audit Logs"
                subtitle="System activity and change history"
                actions={
                    <button className="btn btn-outline-primary" onClick={exportLogs}>
                        <Download size={18} className="me-1" />
                        Export
                    </button>
                }
            />

            {/* Filters */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">User</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <User size={16} />
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="user_id"
                                    value={filters.user_id}
                                    onChange={handleFilterChange}
                                    placeholder="User ID"
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Action</label>
                            <select
                                className="form-select"
                                name="action"
                                value={filters.action}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Actions</option>
                                <option value="created">Created</option>
                                <option value="updated">Updated</option>
                                <option value="deleted">Deleted</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                                <option value="failed_login">Failed Login</option>
                                <option value="export">Export</option>
                                <option value="import">Import</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">From</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <Calendar size={16} />
                                </span>
                                <input
                                    type="date"
                                    className="form-control"
                                    name="date_from"
                                    value={filters.date_from}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">To</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <Calendar size={16} />
                                </span>
                                <input
                                    type="date"
                                    className="form-control"
                                    name="date_to"
                                    value={filters.date_to}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                        <div className="col-md-2 d-flex align-items-end">
                            <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                                Clear Filters
                            </button>
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <Filter size={16} />
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="search"
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                    placeholder="Search in description, values..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Date/Time</th>
                                    <th>User</th>
                                    <th>Branch</th>
                                    <th>Action</th>
                                    <th>Module</th>
                                    <th>Description</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.data?.data?.length > 0 ? (
                                    data.data.data.map((log) => (
                                        <tr key={log.id}>
                                            <td>{formatDateTime(log.created_at)}</td>
                                            <td>{log.user?.name || 'System'}</td>
                                            <td>{log.branch?.name || 'N/A'}</td>
                                            <td>
                                                <span className={`badge ${getActionBadgeClass(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>{log.model_name || log.model_type?.split('\\').pop() || '-'}</td>
                                            <td>
                                                <span title={log.description}>
                                                    {log.description?.length > 50 
                                                        ? log.description.substring(0, 50) + '...' 
                                                        : log.description}
                                                </span>
                                            </td>
                                            <td>{log.ip_address}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            No audit logs found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* {data?.data?.data?.meta && (
                        <Pagination
                            currentPage={data.data.data.meta.current_page}
                            lastPage={data.data.data.meta.last_page}
                            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                        />
                    )} */}
                    {data?.data?.meta && (
                        <Pagination
                            currentPage={data.data.meta.current_page}
                            lastPage={data.data.meta.last_page}
                            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
