import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit, Trash2, MapPin, Phone, Mail, MoreVertical } from 'lucide-react';
import { fetchBranches } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

export default function BranchesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        state: '',
        page: 1,
        per_page: 20,
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['branches', filters],
        queryFn: () => fetchBranches(filters),
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title="Branch Management"
                subtitle="Manage organizational branches and offices"
                actions={
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/settings/branches/new')}
                    >
                        <Plus size={18} className="me-1" />
                        Add Branch
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
                                placeholder="Search by name, code, location..."
                            />
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                name="type"
                                value={filters.type}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Types</option>
                                <option value="HQ">Headquarters</option>
                                <option value="REGIONAL">Regional</option>
                                <option value="STATE">State</option>
                                <option value="ZONAL">Zonal</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <input
                                type="text"
                                className="form-control"
                                name="state"
                                value={filters.state}
                                onChange={handleFilterChange}
                                placeholder="Filter by state"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Branches Grid */}
            <div className="row">
                {data?.data?.length > 0 ? (
                    data.data.map((branch) => (
                        <div key={branch.id} className="col-md-6 mb-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h5 className="mb-1">{branch.name}</h5>
                                            <p className="text-muted mb-0">Code: {branch.code}</p>
                                        </div>
                                        <StatusBadge status={branch.status || 'active'} />
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex align-items-center mb-2">
                                            <MapPin size={16} className="text-muted me-2" />
                                            <span>{branch.address}, {branch.city}, {branch.state}</span>
                                        </div>
                                        <div className="d-flex align-items-center mb-2">
                                            <Phone size={16} className="text-muted me-2" />
                                            <span>{branch.phone || 'N/A'}</span>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <Mail size={16} className="text-muted me-2" />
                                            <span>{branch.email || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <span className="badge bg-info me-2">{branch.type}</span>
                                            {branch.is_hq && (
                                                <span className="badge bg-warning">Headquarters</span>
                                            )}
                                        </div>
                                        <div>
                                            <button
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => navigate(`/settings/branches/${branch.id}`)}
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
                                    </div>
                                </div>
                                <div className="card-footer bg-light">
                                    <small className="text-muted">
                                        {branch.offices_count || 0} offices • 
                                        {branch.users_count || 0} users
                                    </small>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-12">
                        <div className="text-center py-5">
                            <MapPin size={48} className="text-muted mb-3" />
                            <h5>No branches found</h5>
                            <p className="text-muted">Get started by adding your first branch</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/settings/branches/new')}
                            >
                                <Plus size={18} className="me-1" />
                                Add Branch
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {data?.meta && (
                <Pagination
                    currentPage={data.meta.current_page}
                    lastPage={data.meta.last_page}
                    onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                />
            )}
        </div>
    );
}
