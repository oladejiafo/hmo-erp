import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { fetchUserById, createUser, updateUser, fetchRoles, assignUserRoles, fetchBranches } from '../../api/index';
import { PageHeader, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

export default function UserFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        branch_id: '',
        status: 'active',
        password: '',
        password_confirmation: '',
    });
    const [selectedRoles, setSelectedRoles] = useState([]);

    // Fetch user data if editing
    const { data: userData, isLoading: userLoading } = useQuery({
        queryKey: ['user', id],
        queryFn: () => fetchUserById(id),
        enabled: isEditMode,
    });

    // Fetch all roles for selection
    const { data: rolesData, isLoading: rolesLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    });

    // Fetch all branches
    const { data: branchesData, isLoading: branchesLoading } = useQuery({
        queryKey: ['branches'],
        queryFn: fetchBranches,
        enabled: true, // Force it to run
    });

    // Load user data into form when available
    useEffect(() => {
        if (userData?.data?.data) {
            const user = userData.data?.data;
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                branch_id: user.branch_id || '',
                status: user.status || 'active',
                password: '',
                password_confirmation: '',
            });
            // Extract role IDs
            if (user.roles) {
                // setSelectedRoles(user.roles.map(r => r.id));
                setSelectedRoles(user.roles.map(r => r.name));
            }
        }
    }, [userData]);

    const roles = rolesData?.data?.data ?? rolesData?.data ?? [];
    // const roles = rolesData?.data?.data || [];
    // const branches = branchesData?.data|| [];
    const branches = branchesData?.data?.data ?? branchesData?.data ?? [];
    const createMutation = useMutation({
        mutationFn: (data) => createUser({ ...data, roles: selectedRoles }),
        onSuccess: () => {
            toast.success('User created successfully');
            queryClient.invalidateQueries(['users']);
            navigate('/settings/users');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create user');
        },
    });
    
    const updateMutation = useMutation({
        mutationFn: (data) => updateUser(id, { ...data, roles: selectedRoles }),
        onSuccess: () => {
            toast.success('User updated successfully');
            queryClient.invalidateQueries(['users']);
            queryClient.invalidateQueries(['user', id]);
            navigate('/settings/users');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update user');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate password match if creating or password changed
        if (!isEditMode || formData.password) {
            if (formData.password !== formData.password_confirmation) {
                toast.error('Passwords do not match');
                return;
            }
        }

        // Remove password fields if empty in edit mode
        const submitData = { ...formData };
        if (isEditMode && !submitData.password) {
            delete submitData.password;
            delete submitData.password_confirmation;
        }

        if (isEditMode) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

// In toggleRole:
const toggleRole = (roleName) => {
    setSelectedRoles(prev =>
        prev.includes(roleName)
            ? prev.filter(r => r !== roleName)
            : [...prev, roleName]
    );
};

    if ((isEditMode && userLoading) || rolesLoading || branchesLoading) return <LoadingSpinner />;

    return (
        <div>
            <PageHeader
                title={isEditMode ? 'Edit User' : 'Add New User'}
                subtitle={isEditMode ? 'Update user information and roles' : 'Create a new system user'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/settings/users')}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Back to Users
                    </button>
                }
            />

            <div className="row">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Full Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Branch</label>
                                        <select
                                            className="form-select"
                                            name="branch_id"
                                            value={formData.branch_id}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Branch</option>
                                            {branches.map(branch => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            {isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required={!isEditMode}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Confirm Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="password_confirmation"
                                            value={formData.password_confirmation}
                                            onChange={handleChange}
                                            required={!isEditMode}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    <Save size={18} className="me-1" />
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Saving...'
                                        : isEditMode ? 'Update User' : 'Create User'
                                    }
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <Shield size={18} className="me-1" />
                                Role Assignment
                            </h5>
                        </div>
                        <div className="card-body">
                            {roles.length > 0 ? (
                                roles.map(role => (
                                    <div key={role.id} className="form-check mb-2">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id={`role-${role.id}`}
                                            // checked={selectedRoles.includes(role.id)}
                                            // onChange={() => toggleRole(role.id)}
                                            onChange={() => toggleRole(role.name)}
                                            checked={selectedRoles.includes(role.name)}
                                        />
                                        <label className="form-check-label" htmlFor={`role-${role.id}`}>
                                            <strong>{role.display_name || role.name}</strong>
                                            {role.description && (
                                                <small className="d-block text-muted">{role.description}</small>
                                            )}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted">No roles available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}