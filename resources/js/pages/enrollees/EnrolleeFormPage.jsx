import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchEnrollee, createEnrollee, updateEnrollee, fetchCorporates, fetchPlans } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

export default function EnrolleeFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        corporate_id: '',
        plan_id: '',
        enrollee_number: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    // Fetch corporates for dropdown
    const { data: corporates, isLoading: corporatesLoading } = useQuery({
        queryKey: ['corporates'],
        queryFn: () => fetchCorporates({ per_page: 100 }),
    });

    // Fetch plans based on selected corporate
    const { data: plans, isLoading: plansLoading } = useQuery({
        queryKey: ['plans', formData.corporate_id],
        queryFn: () => fetchPlans(formData.corporate_id),
        enabled: !!formData.corporate_id,
    });

    // Fetch enrollee if editing
// Fetch enrollee if editing
const { data: enrolleeData, isLoading, error } = useQuery({
    queryKey: ['enrollee', id],
    queryFn: () => fetchEnrollee(id),
    enabled: isEditing,
});

// Use useEffect to update form when data arrives
useEffect(() => {
    if (enrolleeData) {
        // Extract the actual enrollee data (handle nested structure)
        const enrollee = enrolleeData?.data?.data || enrolleeData?.data || enrolleeData;
        
        setFormData({
            first_name: enrollee.first_name || '',
            last_name: enrollee.last_name || '',
            middle_name: enrollee.middle_name || '',
            email: enrollee.email || '',
            phone: enrollee.phone || '',
            date_of_birth: enrollee.date_of_birth || '',
            gender: enrollee.gender || '',
            corporate_id: enrollee.corporate_id || '',
            plan_id: enrollee.plan_id || '',
            enrollee_number: enrollee.enrollee_number || '',
            enrollment_date: enrollee.enrollment_date || '',
            expiry_date: enrollee.expiry_date || '',
            status: enrollee.status || 'active',
        });
    }
}, [enrolleeData]);

    const createMutation = useMutation({
        mutationFn: createEnrollee,
        onSuccess: () => {
            navigate('/enrollees');
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data) => updateEnrollee(id, data),
        onSuccess: () => {
            navigate('/enrollees');
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
                title={isEditing ? 'Edit Enrollee' : 'New Enrollee'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/enrollees')}
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
                                <FormField label="Enrollee Number" error={errors.enrollee_number} required>
                                    <input
                                        type="text"
                                        name="enrollee_number"
                                        value={formData.enrollee_number}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>
    
                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Corporate" error={errors.corporate_id} required>
                                    <select
                                        name="corporate_id"
                                        value={formData.corporate_id}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Corporate</option>
                                        {corporates?.map ? corporates.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        )) : null}
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Plan" error={errors.plan_id} required>
                                    <select
                                        name="plan_id"
                                        value={formData.plan_id}
                                        onChange={handleChange}
                                        className="form-select"
                                        disabled={!formData.corporate_id || plansLoading}
                                    >
                                        <option value="">Select Plan</option>
                                        {plans?.data?.map ? plans.data.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        )) : null}
                                    </select>
                                </FormField>
                            </div>
                        </div>
    
                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Enrollment Date" error={errors.enrollment_date} required>
                                    <input
                                        type="date"
                                        name="enrollment_date"
                                        value={formData.enrollment_date}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Expiry Date" error={errors.expiry_date} required>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>
    
                        <div className="row">
                            <div className="col-md-6">
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
                        </div>
    
                        <hr />
    
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/enrollees')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createMutation.isLoading || updateMutation.isLoading}
                            >
                                <Save size={18} className="me-1" />
                                {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Save Enrollee'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
