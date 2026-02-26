import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Save } from 'lucide-react';
import { fetchRoles, fetchPermissions, syncRolePermissions } from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { toast } from 'react-toastify';

export default function RolesPage() {
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState({});
    const [saving, setSaving] = useState(false);

    // Fetch roles
    const { data: rolesData, isLoading: rolesLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    });

    // Fetch all permissions
    const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
        queryKey: ['permissions'],
        queryFn: fetchPermissions,
    });

    console.log('Roles Data:', rolesData);
    console.log('Permissions Data:', permissionsData);

    // Extract roles - handle different response structures
    const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData ?? [];
    
    // Extract permissions - handle the nested structure
    // permissionsData.data contains the grouped permission strings
    const groupedPermissions = permissionsData?.data?.data ?? permissionsData?.data ?? permissionsData ?? {};
    
    console.log('Grouped Permissions:', groupedPermissions);

    const handleRoleSelect = (role) => {
        console.log('Selected Role:', role);
        console.log('Role Permissions:', role.permissions);
        
        setSelectedRole(role);
        
        // Initialize selected permissions from role's current permissions
        const perms = {};
        if (role.permissions && Array.isArray(role.permissions)) {
            role.permissions.forEach(p => {
                // Handle both string permissions and object permissions
                const permName = typeof p === 'string' ? p : p.name;
                perms[permName] = true;
            });
        }
        console.log('Initialized Permissions:', perms);
        setSelectedPermissions(perms);
    };

    const handlePermissionToggle = (permissionName) => {
        setSelectedPermissions(prev => ({
            ...prev,
            [permissionName]: !prev[permissionName]
        }));
    };

    const handleSelectAll = (groupPermissions) => {
        const newState = { ...selectedPermissions };
        groupPermissions.forEach(permName => {
            newState[permName] = true;
        });
        setSelectedPermissions(newState);
    };

    const handleSelectAllGroups = () => {
        const newState = {};
        Object.values(groupedPermissions).flat().forEach(permName => {
            newState[permName] = true;
        });
        setSelectedPermissions(newState);
    };

    const handleDeselectAll = () => {
        setSelectedPermissions({});
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        
        setSaving(true);
        try {
            const permissionList = Object.entries(selectedPermissions)
                .filter(([_, selected]) => selected)
                .map(([name]) => name);
            
            console.log('Saving permissions:', permissionList);
            
            await syncRolePermissions(selectedRole.id, { permissions: permissionList });
            toast.success('Permissions updated successfully');
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.message || 'Failed to update permissions');
        } finally {
            setSaving(false);
        }
    };

    if (rolesLoading || permissionsLoading) return <LoadingSpinner />;

    return (
        <div>
            <PageHeader
                title="Role Management"
                subtitle="Manage roles and their permissions"
            />

            <div className="row">
                {/* Roles List */}
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">Roles</h5>
                        </div>
                        <div className="list-group list-group-flush">
                            {roles.length > 0 ? (
                                roles.map((role) => (
                                    <button
                                        key={role.id}
                                        className={`list-group-item list-group-item-action d-flex align-items-center ${selectedRole?.id === role.id ? 'active' : ''}`}
                                        onClick={() => handleRoleSelect(role)}
                                    >
                                        <Shield size={18} className="me-2" />
                                        <span className="flex-grow-1">{role.display_name || role.name}</span>
                                        <span className="badge bg-secondary rounded-pill">
                                            {role.permissions?.length || 0}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="list-group-item text-center text-muted py-4">
                                    No roles found
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="col-md-8">
                    {selectedRole ? (
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">
                                    {selectedRole.display_name || selectedRole.name} - Permissions
                                </h5>
                                <div>
                                    <button
                                        className="btn btn-sm btn-outline-secondary me-2"
                                        onClick={handleSelectAllGroups}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-secondary me-2"
                                        onClick={handleDeselectAll}
                                    >
                                        Deselect All
                                    </button>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        <Save size={16} className="me-1" />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                            <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {Object.keys(groupedPermissions).length > 0 ? (
                                    Object.entries(groupedPermissions).map(([group, perms]) => (
                                        <div key={group} className="mb-4">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <h6 className="text-primary text-uppercase mb-0">
                                                    {group.replace('_', ' ')}
                                                </h6>
                                                <button
                                                    className="btn btn-sm btn-link"
                                                    onClick={() => handleSelectAll(perms)}
                                                >
                                                    Select All in {group}
                                                </button>
                                            </div>
                                            <div className="row">
                                                {perms.map((permName) => {
                                                    // Generate a unique ID for each permission
                                                    const permId = `${group}-${permName}`;
                                                    return (
                                                        <div key={permId} className="col-md-6 mb-2">
                                                            <div className="form-check">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    id={permId}
                                                                    checked={selectedPermissions[permName] || false}
                                                                    onChange={() => handlePermissionToggle(permName)}
                                                                />
                                                                <label
                                                                    className="form-check-label"
                                                                    htmlFor={permId}
                                                                >
                                                                    {permName.split('.').pop().replace(/_/g, ' ')}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-muted">No permissions found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <Shield size={48} className="text-muted mb-3" />
                                <h5>Select a role to manage permissions</h5>
                                <p className="text-muted">
                                    Choose a role from the list to view and edit its permissions
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}