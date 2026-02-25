import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit, Trash2, UserPlus, MoreVertical } from 'lucide-react';
import { fetchUsers } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatDate } from '../../utils/format';

export default function UsersPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: '',
        page: 1,
        per_page: 20,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['users', filters],
        queryFn: () => fetchUsers(filters),
    });

    console.log('API Response:', data); // Debug: see what structure you're getting

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    // SAFELY extract users array - try different possible structures
    const users = data?.data || data?.users || data || [];
    const usersArray = Array.isArray(users) ? users : 
                       (users.data && Array.isArray(users.data)) ? users.data : 
                       [];

    // SAFELY extract meta for pagination
    const meta = data?.meta || data?.pagination || null;

    return (
        <div>
            <PageHeader
                title="User Management"
                subtitle="Manage system users and their roles"
                actions={
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/settings/users/new')}
                    >
                        <UserPlus size={18} className="me-1" />
                        Add User
                    </button>
                }
            />

            {/* Filters */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Search by name, email, phone..."
                            />
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                name="role"
                                value={filters.role}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Roles</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="hq_admin">HQ Admin</option>
                                <option value="state_manager">State Manager</option>
                                <option value="claims_officer">Claims Officer</option>
                                <option value="claims_supervisor">Claims Supervisor</option>
                                <option value="finance_officer">Finance Officer</option>
                                <option value="enrollment_officer">Enrollment Officer</option>
                                <option value="auditor">Auditor</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="card">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Branch</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersArray.length > 0 ? (
                                    usersArray.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="fw-bold">{user.name}</div>
                                                <small className="text-muted">{user.phone}</small>
                                            </td>
                                            <td>{user.email}</td>
                                            <td>{user.branch?.name || user.branch_name || 'N/A'}</td>
                                            <td>
                                                {user.roles?.map(role => (
                                                    <span key={role.id || role} className="badge bg-info me-1">
                                                        {role.display_name || role.name || role}
                                                    </span>
                                                ))}
                                                {!user.roles?.length && user.role && (
                                                    <span className="badge bg-info me-1">{user.role}</span>
                                                )}
                                            </td>
                                            <td>
                                                <StatusBadge status={user.status} />
                                            </td>
                                            <td>
                                                {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                                            </td>
                                            <td>
                                                <div className="btn-group">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => navigate(`/settings/users/${user.id}`)}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => {/* Handle delete */}}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            No users found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {meta && (
                        <Pagination
                            currentPage={meta.current_page || meta.page}
                            lastPage={meta.last_page || meta.total_pages}
                            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}