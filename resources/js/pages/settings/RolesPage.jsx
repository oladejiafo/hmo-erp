import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Edit, Save } from 'lucide-react';
import { fetchRoles, fetchPermissions, syncRolePermissions } from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

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

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        // Initialize selected permissions from role's current permissions
        const perms = {};
        role.permissions?.forEach(p => {
            perms[p.name] = true;
        });
        setSelectedPermissions(perms);
    };

    const handlePermissionToggle = (permission) => {
        setSelectedPermissions(prev => ({
            ...prev,
            [permission]: !prev[permission]
        }));
    };

    const handleSelectAll = (permissions) => {
        const newState = {};
        permissions.forEach(p => {
            newState[p.name] = true;
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
            
            await syncRolePermissions(selectedRole.id, { permissions: permissionList });
            alert('Permissions updated successfully');
        } catch (error) {
            alert('Failed to update permissions');
        } finally {
            setSaving(false);
        }
    };

    if (rolesLoading || permissionsLoading) return <LoadingSpinner />;

    const roles = rolesData?.data?.data ?? [];  //data?.data?.data ?? [];
    const permissions = permissionsData?.data?.data|| {};

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
                            {roles.map((role) => (
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
                            ))}
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
                                        onClick={() => handleSelectAll(Object.values(permissions).flat())}
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
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                            <div className="card-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {Object.entries(permissions).map(([group, perms]) => (
                                    <div key={group} className="mb-4">
                                        <h6 className="text-primary text-uppercase mb-3">
                                            {group.replace('_', ' ')}
                                        </h6>
                                        <div className="row">
                                            {perms.map((perm) => (
                                                <div key={perm.id} className="col-md-6 mb-2">
                                                    <div className="form-check">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id={`perm-${perm.id}`}
                                                            checked={selectedPermissions[perm.name] || false}
                                                            onChange={() => handlePermissionToggle(perm.name)}
                                                        />
                                                        <label
                                                            className="form-check-label"
                                                            htmlFor={`perm-${perm.id}`}
                                                        >
                                                            {perm.display_name || perm.name}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
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
