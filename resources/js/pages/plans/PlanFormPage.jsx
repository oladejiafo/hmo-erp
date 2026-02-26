import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { createPlan, updatePlan, fetchPlan, fetchCorporates } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';

export default function PlanFormPage() {
    const { corporateId, planId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEditing = !!planId;
    const standalone = !corporateId; // If no corporateId in URL, we're in standalone mode
    
    const [formData, setFormData] = useState({
        corporate_id: searchParams.get('corporate_id') || '',
        plan_name: '',
        plan_code: '',
        description: '',
        tier: 'standard',
        status: 'active',
        max_benefit_value: '',
        max_dependents: '',
        surgery_covered: false,
        maternity_covered: false,
        dental_covered: false,
        optical_covered: false,
        physiotherapy_covered: false,
        mental_health_covered: false,
    });

    const [errors, setErrors] = useState({});

    // Fetch corporates for dropdown (only needed in standalone mode)
    const { data: corporatesData } = useQuery({
        queryKey: ['corporates'],
        queryFn: () => fetchCorporates({ per_page: 100 }),
        enabled: standalone, // Only fetch if in standalone mode
    });

    // Fetch plan if editing
    const { data: planData, isLoading, error } = useQuery({
        queryKey: ['plan', planId],
        queryFn: () => fetchPlan(corporateId, planId),
        enabled: isEditing,
    });

    useEffect(() => {
        if (planData && isEditing) {
            const plan = planData?.data?.data || planData?.data || planData;
            setFormData({
                corporate_id: plan.corporate_id || '',
                plan_name: plan.plan_name || '',
                plan_code: plan.plan_code || '',
                description: plan.description || '',
                tier: plan.tier || 'standard',
                status: plan.status || 'active',
                max_benefit_value: plan.max_benefit_value || '',
                max_dependents: plan.max_dependents || '',
                surgery_covered: plan.surgery_covered || false,
                maternity_covered: plan.maternity_covered || false,
                dental_covered: plan.dental_covered || false,
                optical_covered: plan.optical_covered || false,
                physiotherapy_covered: plan.physiotherapy_covered || false,
                mental_health_covered: plan.mental_health_covered || false,
            });
        }
    }, [planData, isEditing]);

    const corporates = corporatesData?.data?.data ?? corporatesData?.data ?? [];

    const createMutation = useMutation({
        mutationFn: (data) => createPlan(data.corporate_id, data),
        onSuccess: () => {
            navigate(standalone ? '/plans' : `/corporates/${corporateId}`);
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data) => updatePlan(corporateId, planId, data),
        onSuccess: () => {
            navigate(standalone ? '/plans' : `/corporates/${corporateId}`);
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // For standalone mode, we need corporate_id
        if (standalone && !formData.corporate_id) {
            setErrors({ corporate_id: 'Please select a corporate' });
            return;
        }
        
        if (isEditing) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Edit Plan' : 'Create New Plan'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(standalone ? '/plans' : `/corporates/${corporateId}`)}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Back
                    </button>
                }
            />

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {/* Corporate selector - only show in standalone mode */}
                        {standalone && (
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <FormField label="Corporate" error={errors.corporate_id} required>
                                        <select
                                            name="corporate_id"
                                            value={formData.corporate_id}
                                            onChange={handleChange}
                                            className="form-select"
                                        >
                                            <option value="">Select Corporate</option>
                                            {Array.isArray(corporates) && corporates.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>
                            </div>
                        )}

                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Plan Name" error={errors.plan_name} required>
                                    <input
                                        type="text"
                                        name="plan_name"
                                        value={formData.plan_name}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Plan Code" error={errors.plan_code} required>
                                    <input
                                        type="text"
                                        name="plan_code"
                                        value={formData.plan_code}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12">
                                <FormField label="Description" error={errors.description}>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="form-control"
                                        rows={3}
                                    />
                                </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="Tier" error={errors.tier} required>
                                    <select
                                        name="tier"
                                        value={formData.tier}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="basic">Basic</option>
                                        <option value="standard">Standard</option>
                                        <option value="premium">Premium</option>
                                        <option value="executive">Executive</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Max Benefit Value (₦)" error={errors.max_benefit_value} required>
                                    <input
                                        type="number"
                                        name="max_benefit_value"
                                        value={formData.max_benefit_value}
                                        onChange={handleChange}
                                        className="form-control"
                                    />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Max Dependents" error={errors.max_dependents} required>
                                    <input
                                        type="number"
                                        name="max_dependents"
                                        value={formData.max_dependents}
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
                                    </select>
                                </FormField>
                            </div>
                        </div>

                        <hr />
                        <h6 className="fw-semibold mb-3">Coverage Options</h6>
                        
                        <div className="row">
                            {[
                                { name: 'surgery_covered', label: 'Surgery' },
                                { name: 'maternity_covered', label: 'Maternity' },
                                { name: 'dental_covered', label: 'Dental' },
                                { name: 'optical_covered', label: 'Optical' },
                                { name: 'physiotherapy_covered', label: 'Physiotherapy' },
                                { name: 'mental_health_covered', label: 'Mental Health' },
                            ].map(item => (
                                <div key={item.name} className="col-md-4 mb-2">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            name={item.name}
                                            id={item.name}
                                            checked={formData[item.name]}
                                            onChange={handleChange}
                                        />
                                        <label className="form-check-label" htmlFor={item.name}>
                                            {item.label}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <hr />
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate(standalone ? '/plans' : `/corporates/${corporateId}`)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                            >
                                <Save size={18} className="me-1" />
                                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Plan' : 'Create Plan')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}