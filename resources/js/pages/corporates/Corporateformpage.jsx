/**
 * CorporateFormPage
 *
 * Routes:
 *   /corporates/new        → Create mode  (id = undefined)
 *   /corporates/:id/edit   → Edit mode    (id = the corporate's ID)
 *
 * The same component handles both. `isEdit` flag controls:
 *   - Which API call to make (createCorporate vs updateCorporate)
 *   - Whether to pre-fill form with existing data
 *   - Page title and submit button label
 *
 * Data flow:
 *   Edit mode: useQuery(['corporate', id]) pre-fills form via reset()
 *   Submit: useMutation → createCorporate() or updateCorporate()
 *   On success: navigate to /corporates/:id (detail page)
 */
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft, Save } from 'lucide-react';
import { fetchCorporate, createCorporate, updateCorporate } from '../../api/index';
import { PageHeader, FormField, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

// ── Validation schema ──────────────────────────────────────────────────────
const schema = z.object({
    name:                z.string().min(2, 'Company name is required'),
    industry:            z.string().optional(),
    rc_number:           z.string().optional(),
    email:               z.string().email('Enter a valid email').optional().or(z.literal('')),
    phone:               z.string().optional(),
    address:             z.string().optional(),
    state:               z.string().optional(),
    city:                z.string().optional(),
    contract_start_date: z.string().min(1, 'Contract start date is required'),
    contract_end_date:   z.string().min(1, 'Contract end date is required'),
    total_employees:     z.coerce.number().int().positive().optional().or(z.literal('')),
    notes:               z.string().optional(),
});

export default function CorporateFormPage() {
    const { id }         = useParams();
    const isEdit         = Boolean(id);
    const navigate       = useNavigate();
    const queryClient    = useQueryClient();

    // ── Load existing data when editing ───────────────────────────────────
    const { data: existingData, isLoading: loadingExisting } = useQuery({
        queryKey: ['corporate', id],
        queryFn:  () => fetchCorporate(id),
        enabled:  isEdit,
    });

    // ── Form setup ────────────────────────────────────────────────────────
    const {
        register, handleSubmit, reset, setError,
        formState: { errors, isSubmitting }
    } = useForm({ resolver: zodResolver(schema) });

    // Pre-fill form when editing and data arrives
    useEffect(() => {
        if (isEdit && existingData) {
            const corporateData = existingData?.data || {};
            reset({
                name:                corporateData.name || '',
                industry:            corporateData.industry || '',
                rc_number:           corporateData.rc_number || '',
                email:               corporateData.email || '',
                phone:               corporateData.phone || '',
                address:             corporateData.address || '',
                state:               corporateData.state || '',
                city:                corporateData.city || '',
                contract_start_date: corporateData.contract_start_date || '',
                contract_end_date:   corporateData.contract_end_date || '',
                total_employees:     corporateData.total_employees || '',
                notes:               corporateData.notes || '',
            });
        }
    }, [existingData, reset, isEdit]);

    // ── Mutation ──────────────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: (formData) => isEdit
            ? updateCorporate(id, formData)
            : createCorporate(formData),

        onSuccess: (res) => {
            toast.success(isEdit ? 'Corporate updated.' : 'Corporate created.');
            queryClient.invalidateQueries({ queryKey: ['corporates'] });
            if (isEdit) queryClient.invalidateQueries({ queryKey: ['corporate', id] });
            const savedId = res.data?.data?.id ?? id;
            navigate(`/corporates/${savedId}`);
        },

        onError: (err) => {
            const validationErrors = err.validationErrors ?? {};
            Object.entries(validationErrors).forEach(([field, msgs]) => {
                setError(field, { message: msgs[0] });
            });
            if (!Object.keys(validationErrors).length) {
                toast.error(err.response?.data?.message ?? 'Save failed.');
            }
        },
    });

    if (isEdit && loadingExisting) {
        return <div className="py-5 text-center"><LoadingSpinner text="Loading corporate..." /></div>;
    }

    return (
        <div>
            <div className="d-flex align-items-start gap-3 mb-4">
                <button className="btn btn-light btn-sm mt-1" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                </button>
                <PageHeader
                    title={isEdit ? 'Edit Corporate' : 'New Corporate'}
                    subtitle={isEdit
                        ? `Editing: ${existingData?.data?.name}`
                        : 'Register a new company as a corporate client'}
                    breadcrumbs={['Home', 'Corporates', isEdit ? 'Edit' : 'New']}
                />
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body" style={{ maxWidth: 720 }}>
                    <form onSubmit={handleSubmit(data => mutation.mutate(data))} noValidate>

                        {/* ── Company Info ── */}
                        <h6 className="fw-bold text-muted text-uppercase mb-3 border-bottom pb-2"
                            style={{ fontSize: 11, letterSpacing: 1 }}>
                            Company Information
                        </h6>

                        <FormField label="Company Name" required error={errors.name?.message}>
                            <input
                                type="text"
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                placeholder="e.g. Dangote Industries Ltd"
                                {...register('name')}
                            />
                        </FormField>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <FormField label="RC Number" error={errors.rc_number?.message}>
                                    <input type="text" className="form-control"
                                           placeholder="e.g. RC123456" {...register('rc_number')} />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Industry" error={errors.industry?.message}>
                                    <input type="text" className="form-control"
                                           placeholder="e.g. Manufacturing" {...register('industry')} />
                                </FormField>
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <FormField label="Email" error={errors.email?.message}>
                                    <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                           placeholder="hr@company.ng" {...register('email')} />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Phone" error={errors.phone?.message}>
                                    <input type="text" className="form-control"
                                           placeholder="+234..." {...register('phone')} />
                                </FormField>
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <FormField label="State" error={errors.state?.message}>
                                    <input type="text" className="form-control"
                                           placeholder="e.g. Lagos" {...register('state')} />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="City / LGA" error={errors.city?.message}>
                                    <input type="text" className="form-control"
                                           placeholder="e.g. Ikeja" {...register('city')} />
                                </FormField>
                            </div>
                        </div>

                        <FormField label="Address" error={errors.address?.message}>
                            <textarea className="form-control" rows={2}
                                      placeholder="Full office address" {...register('address')} />
                        </FormField>

                        {/* ── Contract Details ── */}
                        <h6 className="fw-bold text-muted text-uppercase mb-3 border-bottom pb-2 mt-4"
                            style={{ fontSize: 11, letterSpacing: 1 }}>
                            Contract Details
                        </h6>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <FormField label="Contract Start Date" required error={errors.contract_start_date?.message}>
                                    <input type="date"
                                           className={`form-control ${errors.contract_start_date ? 'is-invalid' : ''}`}
                                           {...register('contract_start_date')} />
                                </FormField>
                            </div>
                            <div className="col-md-6">
                                <FormField label="Contract End Date" required error={errors.contract_end_date?.message}>
                                    <input type="date"
                                           className={`form-control ${errors.contract_end_date ? 'is-invalid' : ''}`}
                                           {...register('contract_end_date')} />
                                </FormField>
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <FormField label="Total Employees" error={errors.total_employees?.message}
                                           hint="Approximate number of employees to be covered">
                                    <input type="number" min="1" className="form-control"
                                           placeholder="e.g. 500" {...register('total_employees')} />
                                </FormField>
                            </div>
                        </div>

                        <FormField label="Notes" error={errors.notes?.message}>
                            <textarea className="form-control" rows={2}
                                      placeholder="Any additional notes..." {...register('notes')} />
                        </FormField>

                        {/* ── Submit ── */}
                        <div className="d-flex gap-3 mt-4 pt-3 border-top">
                            <button
                                type="submit"
                                className="btn btn-primary d-flex align-items-center gap-2"
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending
                                    ? <><span className="spinner-border spinner-border-sm" /> Saving...</>
                                    : <><Save size={16} /> {isEdit ? 'Save Changes' : 'Create Corporate'}</>
                                }
                            </button>
                            <button type="button" className="btn btn-light"
                                    onClick={() => navigate(-1)}>
                                Cancel
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}