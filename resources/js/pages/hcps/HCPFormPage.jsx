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
                                <FormField
                                    label="Provider Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    error={errors.name}
                                    required
                                />
                            </div>
                            <div className="col-md-3">
                                <FormField
                                    label="Type"
                                    name="type"
                                    type="select"
                                    value={formData.type}
                                    onChange={handleChange}
                                    error={errors.type}
                                    options={[
                                        { value: 'hospital', label: 'Hospital' },
                                        { value: 'clinic', label: 'Clinic' },
                                        { value: 'pharmacy', label: 'Pharmacy' },
                                        { value: 'lab', label: 'Laboratory' },
                                        { value: 'specialist', label: 'Specialist' },
                                    ]}
                                    required
                                />
                            </div>
                            <div className="col-md-3">
                                <FormField
                                    label="Tier"
                                    name="tier"
                                    type="select"
                                    value={formData.tier}
                                    onChange={handleChange}
                                    error={errors.tier}
                                    options={[
                                        { value: 'primary', label: 'Primary' },
                                        { value: 'secondary', label: 'Secondary' },
                                        { value: 'tertiary', label: 'Tertiary' },
                                    ]}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField
                                    label="HCP Code"
                                    name="hcp_code"
                                    value={formData.hcp_code}
                                    onChange={handleChange}
                                    error={errors.hcp_code}
                                    disabled={isEditing}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <FormField
                                    label="Registration Number"
                                    name="registration_number"
                                    value={formData.registration_number}
                                    onChange={handleChange}
                                    error={errors.registration_number}
                                />
                            </div>
                            <div className="col-md-4">
                                <FormField
                                    label="NHIS Accreditation No"
                                    name="nhis_accreditation_no"
                                    value={formData.nhis_accreditation_no}
                                    onChange={handleChange}
                                    error={errors.nhis_accreditation_no}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <FormField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={errors.email}
                                    required
                                />
                            </div>
                            <div className="col-md-6">
                                <FormField
                                    label="Phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    error={errors.phone}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12">
                                <FormField
                                    label="Address"
                                    name="address"
                                    type="textarea"
                                    value={formData.address}
                                    onChange={handleChange}
                                    error={errors.address}
                                    rows={2}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField
                                    label="City"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    error={errors.city}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <FormField
                                    label="State"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    error={errors.state}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <FormField
                                    label="LGA"
                                    name="lga"
                                    value={formData.lga}
                                    onChange={handleChange}
                                    error={errors.lga}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3">
                                <FormField
                                    label="Latitude"
                                    name="latitude"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    error={errors.latitude}
                                />
                            </div>
                            <div className="col-md-3">
                                <FormField
                                    label="Longitude"
                                    name="longitude"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    error={errors.longitude}
                                />
                            </div>
                            {isEditing && (
                                <div className="col-md-6">
                                    <FormField
                                        label="Status"
                                        name="status"
                                        type="select"
                                        value={formData.status}
                                        onChange={handleChange}
                                        error={errors.status}
                                        options={[
                                            { value: 'pending', label: 'Pending' },
                                            { value: 'active', label: 'Active' },
                                            { value: 'suspended', label: 'Suspended' },
                                            { value: 'blacklisted', label: 'Blacklisted' },
                                        ]}
                                    />
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
