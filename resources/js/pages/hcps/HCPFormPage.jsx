import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchHCP, createHCP, updateHCP } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

export default function HCPFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        tier: '',
        hcp_code: '',
        registration_number: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        lga: '',
        latitude: '',
        longitude: '',
        nhis_accreditation_no: '',
        status: 'pending',
    });

    const [errors, setErrors] = useState({});

    // Fetch HCP if editing
    const { isLoading, error, data } = useQuery({
        queryKey: ['hcp', id],
        queryFn: async () => {
            console.log('Fetching HCP with ID:', id);
            const result = await fetchHCP(id);
            console.log('Fetch result:', result);
            return result;
        },
        enabled: isEditing,
    });
    
    // Use useEffect to update form when data arrives
    useEffect(() => {
        if (data) {
            console.log('Setting form data from:', data);
            const hcpData = data?.data?.data || data?.data || data || {};
            setFormData({
                name: hcpData.name || '',
                type: hcpData.type || '',
                tier: hcpData.tier || '',
                hcp_code: hcpData.hcp_code || '',
                registration_number: hcpData.registration_number || '',
                email: hcpData.email || '',
                phone: hcpData.phone || '',
                address: hcpData.address || '',
                city: hcpData.city || '',
                state: hcpData.state || '',
                lga: hcpData.lga || '',
                latitude: hcpData.latitude || '',
                longitude: hcpData.longitude || '',
                nhis_accreditation_no: hcpData.nhis_accreditation_no || '',
                status: hcpData.status || 'pending',
            });
        }
    }, [data]);

    const createMutation = useMutation({
        mutationFn: createHCP,
        onSuccess: () => {
            navigate('/hcps');
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data) => updateHCP(id, data),
        onSuccess: () => {
            navigate('/hcps');
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
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
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Edit Healthcare Provider' : 'New Healthcare Provider'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/hcps')}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Back
                    </button>
                }
            />
            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Provider Name" error={errors.name} required>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-3">
                                <FormField label="Type" error={errors.type} required>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Type</option>
                                        <option value="hospital">Hospital</option>
                                        <option value="clinic">Clinic</option>
                                        <option value="pharmacy">Pharmacy</option>
                                        <option value="lab">Laboratory</option>
                                        <option value="specialist">Specialist</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-md-3">
                                <FormField label="Tier" error={errors.tier} required>
                                    <select
                                        name="tier"
                                        value={formData.tier}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Tier</option>
                                        <option value="primary">Primary</option>
                                        <option value="secondary">Secondary</option>
                                        <option value="tertiary">Tertiary</option>
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="HCP Code" error={errors.hcp_code} required>
                                    <input
                                        type="text"
                                        name="hcp_code"
                                        value={formData.hcp_code}
                                        onChange={handleChange}
                                        disabled={isEditing}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Registration Number" error={errors.registration_number}>
                                    <input
                                        type="text"
                                        name="registration_number"
                                        value={formData.registration_number}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="NHIS Accreditation No" error={errors.nhis_accreditation_no}>
                                    <input
                                        type="text"
                                        name="nhis_accreditation_no"
                                        value={formData.nhis_accreditation_no}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Email" error={errors.email} required>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Phone" error={errors.phone} required>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12">
                                <FormField label="Address" error={errors.address} required>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="form-control"
                                        rows={2}
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="City" error={errors.city} required>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="State" error={errors.state} required>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="LGA" error={errors.lga} required>
                                    <input
                                        type="text"
                                        name="lga"
                                        value={formData.lga}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3">
                                <FormField label="Latitude" error={errors.latitude}>
                                    <input
                                        type="text"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-3">
                                <FormField label="Longitude" error={errors.longitude}>
                                    <input
                                        type="text"
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            {isEditing && (
                                <div className="col-md-6">
                                    <FormField label="Status" error={errors.status}>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="form-select"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="blacklisted">Blacklisted</option>
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
                                onClick={() => navigate('/hcps')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createMutation.isLoading || updateMutation.isLoading}
                            >
                                <Save size={18} className="me-1" />
                                {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Save Provider'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
