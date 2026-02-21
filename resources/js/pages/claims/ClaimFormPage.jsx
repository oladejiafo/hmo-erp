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
    const { data: enrolleesData } = useQuery({
        queryKey: ['enrollees'],
        queryFn: () => fetchEnrollees({ per_page: 100 }),
    });

    // Fetch HCPs for dropdown
    const { data: hcpsData } = useQuery({
        queryKey: ['hcps'],
        queryFn: () => fetchHCPs({ per_page: 100 }),
    });

    // Fetch claim if editing
    const { isLoading } = useQuery({
        queryKey: ['claim', id],
        queryFn: () => fetchClaim(id),
        enabled: isEditing,
        onSuccess: (data) => {
            const claim = data.data || data;
            setFormData({
                enrollee_id: claim.enrollee_id || '',
                hcp_id: claim.hcp_id || '',
                service_date: claim.service_date || '',
                claim_type: claim.claim_type || 'outpatient',
                diagnosis_codes: claim.diagnosis_codes || [],
                items: claim.items || [{ service_code: '', service_name: '', quantity: 1, unit_price: 0, amount: 0 }],
                notes: claim.notes || '',
            });
        },
    });

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

    const enrollees = enrolleesData?.data || [];
    const hcps = hcpsData?.data || [];

    if (isLoading) return <LoadingSpinner />;

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
                                <FormField
                                    label="Enrollee"
                                    name="enrollee_id"
                                    type="select"
                                    value={formData.enrollee_id}
                                    onChange={handleChange}
                                    error={errors.enrollee_id}
                                    options={enrollees.map(e => ({
                                        value: e.id,
                                        label: `${e.first_name} ${e.last_name} (${e.enrollee_id})`
                                    }))}
                                    required
                                />
                            </div>
                            <div className="col-md-6">
                                <FormField
                                    label="Healthcare Provider"
                                    name="hcp_id"
                                    type="select"
                                    value={formData.hcp_id}
                                    onChange={handleChange}
                                    error={errors.hcp_id}
                                    options={hcps.map(h => ({
                                        value: h.id,
                                        label: h.name
                                    }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <FormField
                                    label="Service Date"
                                    name="service_date"
                                    type="date"
                                    value={formData.service_date}
                                    onChange={handleChange}
                                    error={errors.service_date}
                                    required
                                />
                            </div>
                            <div className="col-md-6">
                                <FormField
                                    label="Claim Type"
                                    name="claim_type"
                                    type="select"
                                    value={formData.claim_type}
                                    onChange={handleChange}
                                    error={errors.claim_type}
                                    options={[
                                        { value: 'outpatient', label: 'Outpatient' },
                                        { value: 'inpatient', label: 'Inpatient' },
                                        { value: 'dental', label: 'Dental' },
                                        { value: 'optical', label: 'Optical' },
                                        { value: 'maternity', label: 'Maternity' },
                                        { value: 'emergency', label: 'Emergency' },
                                        { value: 'surgery', label: 'Surgery' },
                                        { value: 'laboratory', label: 'Laboratory' },
                                        { value: 'radiology', label: 'Radiology' },
                                        { value: 'drug_refill', label: 'Drug Refill' },
                                    ]}
                                    required
                                />
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
                                            <FormField
                                                label="Service Code"
                                                name={`items[${index}].service_code`}
                                                value={item.service_code}
                                                onChange={(e) => handleItemChange(index, 'service_code', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <FormField
                                                label="Service Name"
                                                name={`items[${index}].service_name`}
                                                value={item.service_name}
                                                onChange={(e) => handleItemChange(index, 'service_name', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <FormField
                                                label="Qty"
                                                type="number"
                                                name={`items[${index}].quantity`}
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <FormField
                                                label="Unit Price"
                                                type="number"
                                                name={`items[${index}].unit_price`}
                                                value={item.unit_price}
                                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="col-md-1">
                                            <FormField
                                                label="Amount"
                                                value={item.amount}
                                                disabled
                                            />
                                        </div>
                                        <div className="col-md-1">
                                            {formData.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger mb-3"
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
