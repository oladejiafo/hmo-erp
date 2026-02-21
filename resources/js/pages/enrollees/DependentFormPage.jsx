import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { createDependent, updateDependent, fetchDependent } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { toast } from 'react-toastify';

export default function DependentFormPage() {
    const { enrolleeId, dependentId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!dependentId;

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        date_of_birth: '',
        gender: '',
        relationship: '',
        blood_group: '',
        genotype: '',
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    // Fetch dependent if editing
    const { data: dependentData, isLoading, error } = useQuery({
        queryKey: ['dependent', enrolleeId, dependentId],
        queryFn: () => fetchDependent(enrolleeId, dependentId),
        enabled: isEditing,
    });

    // Update form when data arrives
    useEffect(() => {
        if (dependentData && isEditing) {
            const dependent = dependentData?.data?.data || dependentData?.data || dependentData;
            setFormData({
                first_name: dependent.first_name || '',
                last_name: dependent.last_name || '',
                middle_name: dependent.middle_name || '',
                date_of_birth: dependent.date_of_birth || '',
                gender: dependent.gender || '',
                relationship: dependent.relationship || '',
                blood_group: dependent.blood_group || '',
                genotype: dependent.genotype || '',
                status: dependent.status || 'active',
            });
        }
    }, [dependentData, isEditing]);

    const createMutation = useMutation({
        mutationFn: (data) => createDependent(enrolleeId, data),
        onSuccess: () => {
            toast.success('Dependent added successfully');
            queryClient.invalidateQueries({ queryKey: ['enrollee', enrolleeId] });
            navigate(`/enrollees/${enrolleeId}`);
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
            toast.error('Failed to add dependent');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data) => updateDependent(enrolleeId, dependentId, data),
        onSuccess: () => {
            toast.success('Dependent updated successfully');
            queryClient.invalidateQueries({ queryKey: ['enrollee', enrolleeId] });
            navigate(`/enrollees/${enrolleeId}`);
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
            toast.error('Failed to update dependent');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Edit Dependent' : 'Add Dependent'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(`/enrollees/${enrolleeId}`)}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Back to Enrollee
                    </button>
                }
            />

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="First Name" error={errors.first_name} required>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Middle Name" error={errors.middle_name}>
                                    <input
                                        type="text"
                                        name="middle_name"
                                        value={formData.middle_name}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Last Name" error={errors.last_name} required>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="Date of Birth" error={errors.date_of_birth} required>
                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Gender" error={errors.gender} required>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Relationship" error={errors.relationship} required>
                                    <select
                                        name="relationship"
                                        value={formData.relationship}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Relationship</option>
                                        <option value="spouse">Spouse</option>
                                        <option value="child">Child</option>
                                        <option value="parent">Parent</option>
                                        <option value="sibling">Sibling</option>
                                        <option value="other">Other</option>
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="Blood Group" error={errors.blood_group}>
                                    <select
                                        name="blood_group"
                                        value={formData.blood_group}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Blood Group</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Genotype" error={errors.genotype}>
                                    <select
                                        name="genotype"
                                        value={formData.genotype}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Genotype</option>
                                        <option value="AA">AA</option>
                                        <option value="AS">AS</option>
                                        <option value="SS">SS</option>
                                        <option value="AC">AC</option>
                                    </select>
                                </FormField>
                            </div>
                            {isEditing && (
                                <div className="col-md-4">
                                    <FormField label="Status" error={errors.status}>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="form-select"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </FormField>
                                </div>
                            )}
                        </div>

                        <hr />
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate(`/enrollees/${enrolleeId}`)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createMutation.isLoading || updateMutation.isLoading}
                            >
                                <Save size={18} className="me-1" />
                                {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (isEditing ? 'Update Dependent' : 'Add Dependent')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
