import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { fetchBranches } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

export default function BranchesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '',
        type: '',
        state: '',
        page: 1,
        per_page: 10, // Show 10 per page
    });

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['branches', filters.search, filters.type, filters.state], // Exclude page from query key
        queryFn: () => fetchBranches({
            search: filters.search,
            type: filters.type,
            state: filters.state,
        }),
    });

    // Extract all branches from response
    const allBranches = response?.data?.data || [];
    
    // Apply client-side pagination
    const paginatedBranches = useMemo(() => {
        const start = (filters.page - 1) * filters.per_page;
        const end = start + filters.per_page;
        return allBranches.slice(start, end);
    }, [allBranches, filters.page, filters.per_page]);

    // Calculate pagination meta
    const meta = {
        current_page: filters.page,
        last_page: Math.ceil(allBranches.length / filters.per_page) || 1,
        per_page: filters.per_page,
        total: allBranches.length,
        from: (filters.page - 1) * filters.per_page + 1,
        to: Math.min(filters.page * filters.per_page, allBranches.length),
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handlePageChange = (page) => {
        setFilters(prev => ({ ...prev, page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        <div className="col-md-2">
                            <select
                                className="form-select"
                                name="per_page"
                                value={filters.per_page}
                                onChange={handleFilterChange}
                            >
                                <option value="10">10 per page</option>
                                <option value="20">20 per page</option>
                                <option value="50">50 per page</option>
                                <option value="100">100 per page</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results info */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted">
                    Showing {meta.from} to {meta.to} of {meta.total} branches
                </span>
                {allBranches.length > 0 && (
                    <span className="text-muted">
                        Page {meta.current_page} of {meta.last_page}
                    </span>
                )}
            </div>

            {/* Branches Grid */}
            <div className="row">
                {paginatedBranches.length > 0 ? (
                    paginatedBranches.map((branch) => (
                        <div key={branch.id} className="col-md-6 mb-4">
                            <div className="card h-100">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h5 className="mb-1">{branch.name}</h5>
                                            <p className="text-muted mb-0">Code: {branch.code}</p>
                                        </div>
                                        <StatusBadge status={branch.status} />
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex align-items-center mb-2">
                                            <MapPin size={16} className="text-muted me-2" />
                                            <span>
                                                {[branch.address, branch.state].filter(Boolean).join(', ')}
                                            </span>
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
                                            {branch.type === 'HQ' && (
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
                                            {branch.type !== 'HQ' && (
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this branch?')) {
                                                            console.log('Delete branch:', branch.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="card-footer bg-light">
                                    <small className="text-muted">
                                        {branch.users_count || 0} users •{' '}
                                        {branch.corporates_count || 0} corporates •{' '}
                                        {branch.enrollees_count || 0} enrollees •{' '}
                                        {branch.claims_count || 0} claims
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
                            <p className="text-muted">
                                {filters.search || filters.type || filters.state
                                    ? 'Try adjusting your filters'
                                    : 'Get started by adding your first branch'}
                            </p>
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

            {/* Pagination */}
            {allBranches.length > 0 && (
                <Pagination
                    currentPage={meta.current_page}
                    lastPage={meta.last_page}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
}