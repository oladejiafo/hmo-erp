/**
 * FILE: resources/js/pages/hcps/HCPFormPage.jsx
 *
 * Changes from original:
 *  - Added Payment Model section (payment_model, ffs_tariff_enforced,
 *    ffs_contract_ref, ffs_contract_start, ffs_contract_end)
 *  - FFS contract fields shown/hidden based on payment_model selection
 *  - All new fields included in formData, handleChange, and validation display
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { fetchHCP, createHCP, updateHCP } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

const PAYMENT_MODEL_DESCRIPTIONS = {
    capitation:      'Paid a fixed monthly amount per enrolled member regardless of claims. Included in monthly capitation runs.',
    fee_for_service: 'Paid per service rendered via itemised claims. Excluded from capitation runs. All payments go through claim batches.',
    hybrid:          'Receives both capitation (for enrolled primary members) AND FFS payments for specialist/tertiary services billed separately.',
};

export default function HCPFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name:                  '',
        type:                  '',
        tier:                  '',
        hcp_code:              '',
        registration_number:   '',
        email:                 '',
        phone:                 '',
        address:               '',
        city:                  '',
        state:                 '',
        lga:                   '',
        latitude:              '',
        longitude:             '',
        nhis_accreditation_no: '',
        status:                'pending',
        // ── FFS / Payment Model ──────────────────────────────────────
        payment_model:         'capitation',
        ffs_tariff_enforced:   true,
        ffs_contract_ref:      '',
        ffs_contract_start:    '',
        ffs_contract_end:      '',
    });

    const [errors, setErrors] = useState({});

    const { isLoading, error, data } = useQuery({
        queryKey: ['hcp', id],
        queryFn:  () => fetchHCP(id),
        enabled:  isEditing,
    });

    useEffect(() => {
        if (data) {
            const d = data?.data?.data || data?.data || data || {};
            setFormData({
                name:                  d.name                  || '',
                type:                  d.type                  || '',
                tier:                  d.tier                  || '',
                hcp_code:              d.hcp_code              || '',
                registration_number:   d.registration_number   || '',
                email:                 d.email                 || '',
                phone:                 d.phone                 || '',
                address:               d.address               || '',
                city:                  d.city                  || '',
                state:                 d.state                 || '',
                lga:                   d.lga                   || '',
                latitude:              d.latitude              || '',
                longitude:             d.longitude             || '',
                nhis_accreditation_no: d.nhis_accreditation_no || '',
                status:                d.status                || 'pending',
                payment_model:         d.payment_model         || 'capitation',
                ffs_tariff_enforced:   d.ffs_tariff_enforced !== undefined ? d.ffs_tariff_enforced : true,
                ffs_contract_ref:      d.ffs_contract_ref      || '',
                ffs_contract_start:    d.ffs_contract_start    || '',
                ffs_contract_end:      d.ffs_contract_end      || '',
            });
        }
    }, [data]);

    const createMutation = useMutation({
        mutationFn: createHCP,
        onSuccess:  () => navigate('/hcps'),
        onError:    (err) => setErrors(err.response?.data?.errors || {}),
    });

    const updateMutation = useMutation({
        mutationFn: (payload) => updateHCP(id, payload),
        onSuccess:  () => navigate('/hcps'),
        onError:    (err) => setErrors(err.response?.data?.errors || {}),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        isEditing ? updateMutation.mutate(formData) : createMutation.mutate(formData);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const isFFS = formData.payment_model === 'fee_for_service' || formData.payment_model === 'hybrid';
    const isMutating = createMutation.isPending || updateMutation.isPending;

    if (isLoading) return <LoadingSpinner />;
    if (error)     return <ErrorAlert message={error.message} />;

    return (
        <div>
            <PageHeader
                title={isEditing ? 'Edit Healthcare Provider' : 'New Healthcare Provider'}
                actions={
                    <button className="btn btn-outline-secondary" onClick={() => navigate('/hcps')}>
                        <ArrowLeft size={18} className="me-1" /> Back
                    </button>
                }
            />

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>

                        {/* ── Section 1: Identity ─────────────────────────────── */}
                        <SectionHeader>Provider Identity</SectionHeader>
                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Provider Name" error={errors.name} required>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-3">
                                <FormField label="Type" error={errors.type} required>
                                    <select name="type" value={formData.type} onChange={handleChange} className="form-select">
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
                                    <select name="tier" value={formData.tier} onChange={handleChange} className="form-select">
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
                                    <input type="text" name="hcp_code" value={formData.hcp_code} onChange={handleChange} disabled={isEditing} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="Registration Number" error={errors.registration_number}>
                                    <input type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="NHIS Accreditation No" error={errors.nhis_accreditation_no}>
                                    <input type="text" name="nhis_accreditation_no" value={formData.nhis_accreditation_no} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                        </div>

                        {/* ── Section 2: Contact ──────────────────────────────── */}
                        <SectionHeader>Contact & Location</SectionHeader>
                        <div className="row">
                            <div className="col-md-6">
                                <FormField label="Email" error={errors.email} required>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Phone" error={errors.phone} required>
                                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-12">
                                <FormField label="Address" error={errors.address} required>
                                    <textarea name="address" value={formData.address} onChange={handleChange} className="form-control" rows={2} />
                                </FormField>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-4">
                                <FormField label="City" error={errors.city} required>
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="State" error={errors.state} required>
                                    <input type="text" name="state" value={formData.state} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-4">
                                <FormField label="LGA" error={errors.lga} required>
                                    <input type="text" name="lga" value={formData.lga} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-3">
                                <FormField label="Latitude" error={errors.latitude}>
                                    <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            <div className="col-md-3">
                                <FormField label="Longitude" error={errors.longitude}>
                                    <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} className="form-control" />
                                </FormField>
                            </div>
                            {isEditing && (
                                <div className="col-md-6">
                                    <FormField label="Status" error={errors.status}>
                                        <select name="status" value={formData.status} onChange={handleChange} className="form-select">
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="blacklisted">Blacklisted</option>
                                        </select>
                                    </FormField>
                                </div>
                            )}
                        </div>

                        {/* ── Section 3: Payment Model ────────────────────────── */}
                        <SectionHeader>Payment Model</SectionHeader>

                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Payment Model <span className="text-danger">*</span>
                                </label>
                                <select
                                    name="payment_model"
                                    value={formData.payment_model}
                                    onChange={handleChange}
                                    className={`form-select ${errors.payment_model ? 'is-invalid' : ''}`}
                                >
                                    <option value="capitation">Capitation — Monthly headcount-based</option>
                                    <option value="fee_for_service">Fee for Service — Claim-based only</option>
                                    <option value="hybrid">Hybrid — Capitation + FFS</option>
                                </select>
                                {errors.payment_model && <div className="invalid-feedback">{errors.payment_model}</div>}
                            </div>

                            <div className="col-md-6 d-flex align-items-end pb-1">
                                <div
                                    className="rounded-3 p-3 w-100 d-flex align-items-start gap-2"
                                    style={{ background: '#f8fafc', border: '1px solid #e5e7eb', fontSize: 12, color: '#374151' }}
                                >
                                    <Info size={14} className="flex-shrink-0 mt-1 text-muted" />
                                    <span>{PAYMENT_MODEL_DESCRIPTIONS[formData.payment_model]}</span>
                                </div>
                            </div>
                        </div>

                        {/* FFS-specific fields — only shown for FFS and Hybrid */}
                        {isFFS && (
                            <div
                                className="rounded-3 p-4 mb-4"
                                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                            >
                                <div className="fw-semibold mb-3" style={{ fontSize: 13, color: '#166534' }}>
                                    Fee for Service Contract Details
                                </div>

                                {/* Tariff enforcement toggle */}
                                <div className="form-check form-switch mb-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        id="ffs_tariff_enforced"
                                        name="ffs_tariff_enforced"
                                        checked={formData.ffs_tariff_enforced}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label fw-semibold" htmlFor="ffs_tariff_enforced" style={{ fontSize: 13 }}>
                                        Strict Tariff Enforcement
                                        <span className="text-muted fw-normal ms-2" style={{ fontSize: 12 }}>
                                            — claims validated exactly against agreed rates, zero tolerance buffer
                                        </span>
                                    </label>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                            Contract Reference
                                        </label>
                                        <input
                                            type="text"
                                            name="ffs_contract_ref"
                                            value={formData.ffs_contract_ref}
                                            onChange={handleChange}
                                            className={`form-control form-control-sm ${errors.ffs_contract_ref ? 'is-invalid' : ''}`}
                                            placeholder="e.g. FFS-LUTH-2025-001"
                                        />
                                        {errors.ffs_contract_ref && <div className="invalid-feedback">{errors.ffs_contract_ref}</div>}
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                            Contract Start Date
                                        </label>
                                        <input
                                            type="date"
                                            name="ffs_contract_start"
                                            value={formData.ffs_contract_start}
                                            onChange={handleChange}
                                            className={`form-control form-control-sm ${errors.ffs_contract_start ? 'is-invalid' : ''}`}
                                        />
                                        {errors.ffs_contract_start && <div className="invalid-feedback">{errors.ffs_contract_start}</div>}
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                            Contract End Date
                                            <span className="text-muted fw-normal ms-1" style={{ fontSize: 11 }}>(blank = open)</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="ffs_contract_end"
                                            value={formData.ffs_contract_end}
                                            onChange={handleChange}
                                            className={`form-control form-control-sm ${errors.ffs_contract_end ? 'is-invalid' : ''}`}
                                        />
                                        {errors.ffs_contract_end && <div className="invalid-feedback">{errors.ffs_contract_end}</div>}
                                        {formData.ffs_contract_end && (() => {
                                            const daysLeft = Math.ceil((new Date(formData.ffs_contract_end) - new Date()) / 86400000);
                                            if (daysLeft < 30 && daysLeft >= 0) {
                                                return (
                                                    <div className="form-text text-warning fw-semibold">
                                                        ⚠️ Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                                    </div>
                                                );
                                            }
                                            if (daysLeft < 0) {
                                                return <div className="form-text text-danger fw-semibold">⚠️ Contract has expired</div>;
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        <hr />

                        <div className="d-flex justify-content-end gap-2">
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/hcps')}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isMutating}>
                                <Save size={18} className="me-1" />
                                {isMutating ? 'Saving...' : 'Save Provider'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ children }) {
    return (
        <div className="border-bottom pb-1 mb-3 mt-4" style={{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {children}
        </div>
    );
}
