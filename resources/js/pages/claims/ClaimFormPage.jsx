import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { createClaim, fetchClaim, fetchEnrollees, fetchHCPs } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

export default function ClaimFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        enrollee_id: '',
        hcp_id: '',
        service_date: new Date().toISOString().split('T')[0],
        claim_type: 'outpatient',
        diagnosis_codes: [],
        items: [{ service_code: '', service_name: '', quantity: 1, unit_price: 0, amount: 0 }],
        notes: '',
    });

    const [errors, setErrors] = useState({});

    // Fetch enrollees for dropdown
    const { data: enrolleesData, isLoading: enrolleesLoading } = useQuery({
        queryKey: ['enrollees'],
        queryFn: () => fetchEnrollees({ per_page: 100 }),
    });

    // Fetch HCPs for dropdown
    const { data: hcpsData, isLoading: hcpsLoading } = useQuery({
        queryKey: ['hcps'],
        queryFn: () => fetchHCPs({ per_page: 100 }),
    });

    // Fetch claim if editing
    const { data: claimData, isLoading, error } = useQuery({
        queryKey: ['claim', id],
        queryFn: () => fetchClaim(id),
        enabled: isEditing,
    });

    // Update form when claim data arrives
    useEffect(() => {
        if (claimData && isEditing) {
            const claim = claimData?.data?.data || claimData?.data || claimData;
            setFormData({
                enrollee_id: claim.enrollee_id || '',
                hcp_id: claim.hcp_id || '',
                service_date: claim.service_date || '',
                claim_type: claim.claim_type || 'outpatient',
                diagnosis_codes: claim.diagnosis_codes || [],
                items: claim.items?.length ? claim.items : [{ service_code: '', service_name: '', quantity: 1, unit_price: 0, amount: 0 }],
                notes: claim.notes || '',
            });
        }
    }, [claimData, isEditing]);

    // FIXED: Extract arrays with proper nested structure
    const enrollees = enrolleesData?.data?.data ?? enrolleesData?.data ?? enrolleesData ?? [];
    const hcps = hcpsData?.data?.data ?? hcpsData?.data ?? hcpsData ?? [];

    const createMutation = useMutation({
        mutationFn: createClaim,
        onSuccess: () => {
            navigate('/claims');
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        
        // Recalculate amount
        if (field === 'quantity' || field === 'unit_price') {
            updatedItems[index].amount = 
                (updatedItems[index].quantity || 0) * (updatedItems[index].unit_price || 0);
        }
        
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { service_code: '', service_name: '', quantity: 1, unit_price: 0, amount: 0 }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length > 1) {
            const updatedItems = formData.items.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, items: updatedItems }));
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Edit Claim' : 'New Claim'}
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/claims')}
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
                            <FormField label="Enrollee" error={errors.enrollee_id} required>
        <select
            name="enrollee_id"
            value={formData.enrollee_id}
            onChange={handleChange}
            className="form-control"
        >
            <option value="">Select Enrollee</option>
            {Array.isArray(enrollees) && enrollees.map(e => (
                <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.enrollee_id})
                </option>
            ))}
        </select>
    </FormField>
                            </div>
                            <div className="col-md-6">
                            <FormField label="Healthcare Provider" error={errors.hcp_id} required>
        <select
            name="hcp_id"
            value={formData.hcp_id}
            onChange={handleChange}
            className="form-control"
        >
            <option value="">Select HCP</option>
            {Array.isArray(hcps) && hcps.map(h => (
                <option key={h.id} value={h.id}>
                    {h.name} ({h.hcp_code})
                </option>
            ))}
        </select>
    </FormField>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                            <div className="mb-3">
        <label className="form-label fw-semibold">
            Service Date {errors.service_date && <span className="text-danger">*</span>}
        </label>
        <input
            type="date"
            name="service_date"
            value={formData.service_date}
            onChange={handleChange}
            className={`form-control ${errors.service_date ? 'is-invalid' : ''}`}
        />
        {errors.service_date && (
            <div className="invalid-feedback">{errors.service_date}</div>
        )}
    </div>
                            </div>
                            <div className="col-md-6">
                            <FormField label="Claim Type" error={errors.claim_type} required>
        <select
            name="claim_type"
            value={formData.claim_type}
            onChange={handleChange}
            className="form-control"
        >
            <option value="outpatient">Outpatient</option>
            <option value="inpatient">Inpatient</option>
            <option value="dental">Dental</option>
            <option value="optical">Optical</option>
            <option value="maternity">Maternity</option>
            <option value="emergency">Emergency</option>
            <option value="surgery">Surgery</option>
            <option value="laboratory">Laboratory</option>
            <option value="radiology">Radiology</option>
            <option value="drug_refill">Drug Refill</option>
        </select>
    </FormField>
                            </div>
                        </div>

                        <div className="card mb-3">
    <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Claim Items</h6>
        <button type="button" className="btn btn-sm btn-primary" onClick={addItem}>
            <Plus size={16} className="me-1" /> Add Item
        </button>
    </div>
    <div className="card-body">
        {formData.items.map((item, index) => (
            <div key={index} className="row mb-3 align-items-end">
                <div className="col-md-3">
                    <div className="mb-2">
                        <label className="form-label fw-semibold">Service Code</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.service_code}
                            onChange={(e) => handleItemChange(index, 'service_code', e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="mb-2">
                        <label className="form-label fw-semibold">Service Name</label>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.service_name}
                            onChange={(e) => handleItemChange(index, 'service_name', e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="mb-2">
                        <label className="form-label fw-semibold">Qty</label>
                        <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                        />
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="mb-2">
                        <label className="form-label fw-semibold">Unit Price</label>
                        <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
                <div className="col-md-1">
                    <div className="mb-2">
                        <label className="form-label fw-semibold">Amount</label>
                        <input
                            type="text"
                            className="form-control form-control-sm bg-light"
                            value={item.amount.toFixed(2)}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-md-1">
                    {formData.items.length > 1 && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger mb-2"
                            onClick={() => removeItem(index)}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        ))}
    </div>
</div>

                        <FormField
                            label="Notes"
                            name="notes"
                            type="textarea"
                            value={formData.notes}
                            onChange={handleChange}
                            error={errors.notes}
                            rows={3}
                        />

                        <hr />
                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/claims')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createMutation.isLoading}
                            >
                                <Save size={18} className="me-1" />
                                {createMutation.isLoading ? 'Saving...' : 'Submit Claim'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}