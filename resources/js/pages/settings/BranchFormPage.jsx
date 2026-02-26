import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchBranch, createBranch, updateBranch } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { toast } from 'react-toastify';

export default function BranchFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'STATE',
        state: '',
        address: '',
        phone: '',
        email: '',
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    // Fetch branch if editing
    const { data: branchData, isLoading, error } = useQuery({
        queryKey: ['branch', id],
        queryFn: () => fetchBranch(id),
        enabled: isEditing,
    });

    // Update form when data arrives
    useEffect(() => {
        if (branchData && isEditing) {
            const branch = branchData?.data?.data || branchData?.data || branchData;
            setFormData({
                name: branch.name || '',
                code: branch.code || '',
                type: branch.type || 'STATE',
                state: branch.state || '',
                address: branch.address || '',
                phone: branch.phone || '',
                email: branch.email || '',
                status: branch.status || 'active',
            });
        }
    }, [branchData, isEditing]);

    const createMutation = useMutation({
        mutationFn: (data) => createBranch(data),
        onSuccess: () => {
            toast.success('Branch created successfully');
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            navigate('/settings/branches');
        },
        onError: (error) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to create branch');
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data) => updateBranch(id, data),
        onSuccess: () => {
            toast.success('Branch updated successfully');
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.invalidateQueries({ queryKey: ['branch', id] });
            navigate('/settings/branches');
        },
        onError: (error) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                toast.error(error.response?.data?.message || 'Failed to update branch');
            }
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Basic validation
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Branch name is required';
        if (!formData.code.trim()) newErrors.code = 'Branch code is required';
        if (!formData.type) newErrors.type = 'Branch type is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fill in all required fields');
            return;
        }

        if (isEditing) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const isHQ = formData.type === 'HQ';

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Edit Branch' : 'Add New Branch'}
                subtitle={isEditing ? 'Update branch information' : 'Create a new branch or office'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/settings/branches')}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Back to Branches
                    </button>
                }
            />

            <div className="row justify-content-center">
                <div className="col-lg-12">
                    <div className="card">
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <div className="col-md-6">
                                        <FormField label="Branch Name" error={errors.name} required>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                disabled={isHQ || isSubmitting}
                                                placeholder="e.g., Lagos State Branch"
                                            />
                                        </FormField>
                                    </div>

                                    <div className="col-md-6">
                                        <FormField label="Branch Code" error={errors.code} required>
                                            <input
                                                type="text"
                                                name="code"
                                                value={formData.code}
                                                onChange={handleChange}
                                                className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                                                disabled={isHQ || isSubmitting}
                                                placeholder="e.g., LAG-001"
                                                style={{ textTransform: 'uppercase' }}
                                            />
                                            <small className="text-muted">
                                                Uppercase letters, numbers, and hyphens only
                                            </small>
                                        </FormField>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6">
                                        <FormField label="Branch Type" error={errors.type} required>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleChange}
                                                className={`form-select ${errors.type ? 'is-invalid' : ''}`}
                                                disabled={isHQ || isSubmitting}
                                            >
                                                <option value="">Select Type</option>
                                                <option value="HQ">Headquarters</option>
                                                <option value="REGIONAL">Regional</option>
                                                <option value="STATE">State</option>
                                            </select>
                                            {isHQ && (
                                                <small className="text-muted">
                                                    Headquarters type cannot be changed
                                                </small>
                                            )}
                                        </FormField>
                                    </div>

                                    <div className="col-md-6">
                                        <FormField label="State" error={errors.state} required>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                                                disabled={isSubmitting}
                                                placeholder="e.g., Lagos"
                                            />
                                        </FormField>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-12">
                                        <FormField label="Address" error={errors.address}>
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="form-control"
                                                disabled={isSubmitting}
                                                placeholder="Street address"
                                            />
                                        </FormField>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6">
                                        <FormField label="Phone Number" error={errors.phone}>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="form-control"
                                                disabled={isSubmitting}
                                                placeholder="e.g., +234-01-2345678"
                                            />
                                        </FormField>
                                    </div>

                                    <div className="col-md-6">
                                        <FormField label="Email Address" error={errors.email}>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                                disabled={isSubmitting}
                                                placeholder="e.g., branch@example.com"
                                            />
                                        </FormField>
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="row">
                                        <div className="col-md-6">
                                            <FormField label="Status" error={errors.status}>
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleChange}
                                                    className="form-select"
                                                    disabled={isHQ || isSubmitting}
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                                {isHQ && (
                                                    <small className="text-muted">
                                                        Headquarters status cannot be changed
                                                    </small>
                                                )}
                                            </FormField>
                                        </div>
                                    </div>
                                )}

                                <hr className="my-4" />
                                
                                <div className="d-flex justify-content-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => navigate('/settings/branches')}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSubmitting}
                                    >
                                        <Save size={18} className="me-1" />
                                        {isSubmitting 
                                            ? (isEditing ? 'Updating...' : 'Creating...') 
                                            : (isEditing ? 'Update Branch' : 'Create Branch')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}