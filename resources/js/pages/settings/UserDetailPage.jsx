import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
    ArrowLeft, Edit, Shield, Mail, Phone, Calendar, Building2, 
    Key, Lock, Eye, ChevronDown, ChevronRight, CheckCircle, XCircle 
} from 'lucide-react';
import { fetchUserById, fetchPermissions } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatDate } from '../../utils/format';

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [showPermissions, setShowPermissions] = useState(false);
    const [expandedModules, setExpandedModules] = useState({});

    // Fetch user details
    const { data, isLoading, error } = useQuery({
        queryKey: ['user', id],
        queryFn: () => fetchUserById(id),
    });

    // Fetch all permissions for context (optional)
    const { data: permissionsData } = useQuery({
        queryKey: ['permissions'],
        queryFn: fetchPermissions,
        enabled: showPermissions, // Only fetch when expanding permissions
    });

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    const user = data?.data?.data || data;
    
    // Group permissions by module for better display
    const userPermissions = user?.permissions || [];
    const allPermissions = permissionsData?.data || [];
    
    // Organize permissions by module (assuming format like "module.action")
    const permissionsByModule = userPermissions.reduce((acc, perm) => {
        const parts = perm.name ? perm.name.split('.') : perm.split('.');
        const module = parts[0] || 'other';
        if (!acc[module]) acc[module] = [];
        acc[module].push(perm.name || perm);
        return acc;
    }, {});

    // If no permissions, show empty state
    const hasPermissions = Object.keys(permissionsByModule).length > 0;

    const toggleModule = (module) => {
        setExpandedModules(prev => ({
            ...prev,
            [module]: !prev[module]
        }));
    };

    const toggleAllPermissions = () => {
        setShowPermissions(!showPermissions);
    };

    return (
        <div>
            <PageHeader
                title={user?.name}
                subtitle={`User Profile · ${user?.email}`}
                actions={
                    <>
                        <button
                            className="btn btn-outline-secondary me-2"
                            onClick={() => navigate('/settings/users')}
                        >
                            <ArrowLeft size={18} className="me-1" />
                            Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/settings/users/${id}/edit`)}
                        >
                            <Edit size={18} className="me-1" />
                            Edit User
                        </button>
                    </>
                }
            />

            <div className="row">
                <div className="col-md-4">
                    {/* User Info Card */}
                    <div className="card mb-4">
                        <div className="card-body text-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-block mb-3">
                                <span className="display-6 fw-bold text-primary">
                                    {user?.name?.charAt(0)}
                                </span>
                            </div>
                            <h5>{user?.name}</h5>
                            <StatusBadge status={user?.status} />
                            
                            {/* Quick Stats */}
                            <div className="mt-3 pt-3 border-top">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Roles</span>
                                    <span className="fw-bold">{user?.roles?.length || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Permissions</span>
                                    <span className="fw-bold">{userPermissions.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Role Summary */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h6 className="mb-0 d-flex align-items-center">
                                <Shield size={16} className="me-2" />
                                Assigned Roles
                            </h6>
                        </div>
                        <div className="card-body">
                            {user?.roles?.length > 0 ? (
                                user.roles.map(role => (
                                    <div key={role.id} className="mb-2 p-2 bg-light rounded">
                                        <strong>{role.display_name || role.name}</strong>
                                        {role.description && (
                                            <small className="d-block text-muted">{role.description}</small>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted mb-0">No roles assigned</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    {/* User Details Card */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">User Details</h5>
                        </div>
                        <div className="card-body">
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        <Mail size={14} className="me-1" /> Email
                                    </small>
                                    <strong>{user?.email}</strong>
                                </div>
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        <Phone size={14} className="me-1" /> Phone
                                    </small>
                                    <strong>{user?.phone || 'N/A'}</strong>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        <Building2 size={14} className="me-1" /> Branch
                                    </small>
                                    <strong>{user?.branch?.name || 'N/A'}</strong>
                                </div>
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        <Calendar size={14} className="me-1" /> Last Login
                                    </small>
                                    <strong>{user?.last_login_at ? formatDate(user.last_login_at) : 'Never'}</strong>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        <Key size={14} className="me-1" /> 2FA Status
                                    </small>
                                    <strong>
                                        {user?.two_factor_enabled ? (
                                            <span className="text-success">Enabled</span>
                                        ) : (
                                            <span className="text-muted">Disabled</span>
                                        )}
                                    </strong>
                                </div>
                                <div className="col-md-6">
                                    <small className="text-muted d-block">
                                        <Calendar size={14} className="me-1" /> Created
                                    </small>
                                    <strong>{user?.created_at ? formatDate(user.created_at) : 'N/A'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Permissions Card - Enhanced View */}
                    <div className="card">
                        <div 
                            className="card-header d-flex justify-content-between align-items-center cursor-pointer"
                            onClick={toggleAllPermissions}
                            style={{ cursor: 'pointer' }}
                        >
                            <h5 className="mb-0 d-flex align-items-center">
                                <Lock size={16} className="me-2" />
                                Permissions & Privileges
                                <span className="badge bg-primary ms-2">{userPermissions.length}</span>
                            </h5>
                            {showPermissions ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                        
                        {showPermissions && (
                            <div className="card-body">
                                {hasPermissions ? (
                                    <>
                                        <p className="text-muted small mb-3">
                                            Permissions inherited from roles or directly assigned.
                                            {userPermissions.length} total permissions.
                                        </p>
                                        
                                        {/* Group by Module */}
                                        <div className="accordion" id="permissionsAccordion">
                                            {Object.entries(permissionsByModule).sort().map(([module, perms], idx) => (
                                                <div key={module} className="accordion-item border-0 mb-2">
                                                    <h6 className="accordion-header" id={`heading-${module}`}>
                                                        <button
                                                            className="accordion-button bg-light p-3 rounded"
                                                            type="button"
                                                            onClick={() => toggleModule(module)}
                                                            style={{ 
                                                                boxShadow: 'none',
                                                                backgroundColor: expandedModules[module] ? '#f8f9fa' : '#f1f3f4'
                                                            }}
                                                        >
                                                            <div className="d-flex w-100 justify-content-between align-items-center">
                                                                <span className="fw-semibold text-capitalize">
                                                                    {module.replace(/_/g, ' ')} Module
                                                                </span>
                                                                <span className="badge bg-primary rounded-pill">
                                                                    {perms.length}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </h6>
                                                    
                                                    {expandedModules[module] && (
                                                        <div className="p-3 border-start border-end border-bottom rounded-bottom">
                                                            <div className="row g-2">
                                                                {perms.sort().map(perm => {
                                                                    const permName = typeof perm === 'string' ? perm : perm.name;
                                                                    const permLabel = permName.split('.').slice(1).join(' ').replace(/_/g, ' ');
                                                                    return (
                                                                        <div key={permName} className="col-md-6">
                                                                            <div className="d-flex align-items-center p-2 bg-light bg-opacity-50 rounded">
                                                                                <CheckCircle size={14} className="text-success me-2 flex-shrink-0" />
                                                                                <span className="small text-capitalize">{permLabel}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        <Shield size={48} className="text-muted mb-3 opacity-25" />
                                        <h6>No Permissions Assigned</h6>
                                        <p className="text-muted small mb-0">
                                            This user has no direct permissions. They may inherit permissions through roles,
                                            or need to be assigned to roles to access system features.
                                        </p>
                                    </div>
                                )}

                                {/* Permission Summary Stats */}
                                {hasPermissions && (
                                    <div className="mt-4 p-3 bg-light rounded">
                                        <h6 className="mb-3">Permission Summary</h6>
                                        <div className="row text-center">
                                            <div className="col-4">
                                                <div className="fw-bold text-primary">{userPermissions.length}</div>
                                                <small className="text-muted">Total Permissions</small>
                                            </div>
                                            <div className="col-4">
                                                <div className="fw-bold text-success">{Object.keys(permissionsByModule).length}</div>
                                                <small className="text-muted">Modules</small>
                                            </div>
                                            <div className="col-4">
                                                <div className="fw-bold text-info">{user?.roles?.length || 0}</div>
                                                <small className="text-muted">Roles</small>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Activity Summary (Optional) */}
                    {user?.last_activity && (
                        <div className="card mt-4">
                            <div className="card-header">
                                <h6 className="mb-0">Recent Activity</h6>
                            </div>
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Last Active</span>
                                    <strong>{formatDate(user.last_activity)}</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}