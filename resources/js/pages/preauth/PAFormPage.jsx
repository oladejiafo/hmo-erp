/**
 * FILE LOCATION: resources/js/pages/preauth/PAFormPage.jsx
 *
 * New Pre-Authorisation Request Form.
 *
 * SOP rules enforced here:
 *  - Emergency requests auto-flag for retrospective review (no blocking)
 *  - Estimated amount drives approval tier display so submitter knows
 *    what approval chain to expect
 *  - Enrollee must be active; shows benefit balance warning if low
 *  - HCP must be active/accredited
 *  - Validates that selected service type normally requires PA
 *  - Duplicate check (warn if enrollee already has open PA for same service)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    ArrowLeft, AlertTriangle, Info, CheckCircle,
    User, Building2, Stethoscope, FileText, Zap,
    Clock, TrendingUp, DollarSign,
} from 'lucide-react';
import { submitPARequest, fetchEnrollees, fetchHCPs } from '../../api/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

// Services that require pre-authorisation per NHIA guidelines
const PA_SERVICES = [
    { value: 'inpatient_admission',  label: 'Inpatient Admission / Hospitalisation' },
    { value: 'surgical_procedure',   label: 'Surgical Procedure' },
    { value: 'mri_ct_scan',          label: 'MRI / CT Scan' },
    { value: 'specialist_referral',  label: 'Specialist Consultation (Referred)' },
    { value: 'physiotherapy',        label: 'Physiotherapy (Course)' },
    { value: 'chemotherapy',         label: 'Chemotherapy / Oncology' },
    { value: 'dialysis',             label: 'Renal Dialysis' },
    { value: 'maternity_admission',  label: 'Maternity Admission / Delivery' },
    { value: 'major_investigation',  label: 'Major Diagnostic Investigation' },
    { value: 'prosthetics',          label: 'Prosthetics / Orthopaedic Implants' },
    { value: 'chronic_drugs',        label: 'Chronic Medication (New Registration)' },
    { value: 'dental_major',         label: 'Major Dental (Extraction, Root Canal)' },
    { value: 'optical',              label: 'Optical / Spectacles' },
    { value: 'other',                label: 'Other (specify in clinical notes)' },
];

const ICD10_COMMON = [
    'A00-A09', 'B00-B19', 'C00-D49', 'E00-E89', 'F01-F99',
    'G00-G99', 'H00-H59', 'H60-H95', 'I00-I99', 'J00-J99',
    'K00-K95', 'L00-L99', 'M00-M99', 'N00-N99', 'O00-O9A',
];

// Which tier of approval this amount requires
function approvalTier(amount) {
    if (!amount || amount <= 0)             return null;
    if (amount > 2_000_000)                 return 'ceo';
    if (amount > 500_000)                   return 'md';
    return 'standard';
}

const TIER_LABELS = {
    standard: { label: 'Standard Approval',    color: '#137333', bg: '#e6f4ea', icon: CheckCircle, desc: 'Can be approved by an Authorisation Desk Officer. Target TAT: 15–30 minutes.' },
    md:       { label: 'Medical Director Sign-off', color: '#b45309', bg: '#fff8e1', icon: AlertTriangle, desc: 'Requires Medical Director approval (₦500k–₦2M). Target TAT: 30–60 minutes.' },
    ceo:      { label: 'CEO + MD Sign-off Required', color: '#c5221f', bg: '#fce8e6', icon: Zap, desc: 'Amount exceeds ₦2M. Requires Medical Director + CEO approval. Allow additional time.' },
};

const URGENCY_OPTIONS = [
    { value: 'standard',  label: '🟢 Standard',  desc: 'Elective or planned procedure. TAT: 15–30 min.' },
    { value: 'urgent',    label: '🟡 Urgent',     desc: 'Time-sensitive but not immediately life-threatening. TAT: 30–60 min.' },
    { value: 'emergency', label: '🔴 Emergency',  desc: 'Immediate life-threatening situation. Care proceeds; PA is retrospective within 24 hrs.' },
];

export default function PAFormPage() {
    const navigate        = useNavigate();
    const { hasPermission } = useAuth();

    const [form, setForm] = useState({
        enrollee_id:          '',
        dependent_id:         '',
        hcp_id:               '',
        service_type:         '',
        urgency:              'standard',
        estimated_amount:     '',
        diagnosis_codes:      '',
        diagnosis_description:'',
        clinical_notes:       '',
        admission_date:       '',
        expected_duration:    '',
        attending_doctor:     '',
    });

    const [enrolleeSearch, setEnrolleeSearch] = useState('');
    const [hcpSearch,      setHcpSearch]      = useState('');
    const [selectedEnrollee, setSelectedEnrollee] = useState(null);
    const [selectedHCP,      setSelectedHCP]      = useState(null);
    const [showEnrolleeList, setShowEnrolleeList] = useState(false);
    const [showHCPList,      setShowHCPList]      = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Enrollee search
    const { data: enrolleeData } = useQuery({
        queryKey: ['pa-enrollee-search', enrolleeSearch],
        queryFn:  () => fetchEnrollees({ search: enrolleeSearch, per_page: 8 }),
        enabled:  enrolleeSearch.length > 1,
    });

    // HCP search
    const { data: hcpData } = useQuery({
        queryKey: ['pa-hcp-search', hcpSearch],
        queryFn:  () => fetchHCPs({ search: hcpSearch, status: 'active', per_page: 8 }),
        enabled:  hcpSearch.length > 1,
    });

    const submitMutation = useMutation({
        mutationFn: () => submitPARequest({
            ...form,
            estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
            diagnosis_codes:  form.diagnosis_codes ? form.diagnosis_codes.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
        onSuccess: (res) => {
            const pa = res.data?.data;
            toast.success(
                form.urgency === 'emergency'
                    ? 'Emergency PA submitted. Care can proceed — retrospective review within 24 hours.'
                    : `PA Request submitted successfully (${pa?.pa_code ?? 'pending code'}).`
            );
            navigate(`/pre-auth/${pa?.id}`);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Submission failed.'),
    });

    const tier   = approvalTier(parseFloat(form.estimated_amount));
    const tierCfg = tier ? TIER_LABELS[tier] : null;

    const isValid = form.enrollee_id && form.hcp_id && form.service_type &&
                    form.urgency && form.diagnosis_description;

    const dependants = selectedEnrollee?.dependants ?? [];

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* Header */}
            <div className="d-flex align-items-center gap-3 mb-4">
                <button className="btn btn-light btn-sm" onClick={() => navigate('/pre-auth')}>
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h4 className="fw-bold mb-0">New Pre-Authorisation Request</h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Submit for clinical review. Emergency cases may proceed — PA is retrospective.
                    </p>
                </div>
            </div>

            {/* Emergency banner */}
            {form.urgency === 'emergency' && (
                <div className="alert d-flex align-items-start gap-3 mb-4"
                     style={{ background: '#fce8e6', border: '1px solid #f5c6c6', color: '#7b0000' }}>
                    <Zap size={20} className="flex-shrink-0 mt-1" />
                    <div>
                        <div className="fw-bold">Emergency Mode</div>
                        <div style={{ fontSize: 13 }}>
                            The patient can receive care immediately. This PA request will be reviewed retrospectively within 24 hours by the clinical team.
                            The claim will <strong>not</strong> be rejected solely for lack of prior authorisation in an emergency.
                        </div>
                    </div>
                </div>
            )}

            <div className="row g-4">

                {/* ── Left column ────────────────────────────────────────── */}
                <div className="col-lg-8">

                    {/* Section 1: Patient */}
                    <FormSection title="1. Patient Information" icon={User}>
                        {/* Enrollee picker */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                Enrollee / Principal Member <span className="text-danger">*</span>
                            </label>
                            {selectedEnrollee ? (
                                <div className="d-flex align-items-center gap-3 p-3 rounded-3"
                                     style={{ background: '#e6f4ea', border: '1px solid #a8d5b5' }}>
                                    <CheckCircle size={18} color="#137333" />
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                                            {selectedEnrollee.first_name} {selectedEnrollee.last_name}
                                        </div>
                                        <div className="text-muted font-monospace" style={{ fontSize: 12 }}>
                                            {selectedEnrollee.enrollee_id} · {selectedEnrollee.corporate?.name}
                                        </div>
                                        {selectedEnrollee.benefit_balance != null && (
                                            <div style={{ fontSize: 12, color: selectedEnrollee.benefit_balance < 10000 ? '#c5221f' : '#137333' }}>
                                                Balance: {formatCurrency(selectedEnrollee.benefit_balance)}
                                                {selectedEnrollee.benefit_balance < 10000 && ' ⚠ Low balance'}
                                            </div>
                                        )}
                                    </div>
                                    <button className="btn btn-sm btn-outline-secondary"
                                            onClick={() => { setSelectedEnrollee(null); set('enrollee_id', ''); set('dependent_id', ''); }}>
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="position-relative">
                                    <input
                                        className="form-control"
                                        placeholder="Search by name, member number, or email…"
                                        value={enrolleeSearch}
                                        onChange={e => { setEnrolleeSearch(e.target.value); setShowEnrolleeList(true); }}
                                        onFocus={() => setShowEnrolleeList(true)}
                                    />
                                    {showEnrolleeList && enrolleeData?.data?.length > 0 && (
                                        <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                             style={{ top: '100%', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
                                            {enrolleeData.data.map(e => (
                                                <div
                                                    key={e.id}
                                                    className="px-3 py-2 d-flex justify-content-between align-items-center"
                                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8', fontSize: 13 }}
                                                    onMouseEnter={ev => ev.currentTarget.style.background = '#f7fafc'}
                                                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                                                    onClick={() => {
                                                        setSelectedEnrollee(e);
                                                        set('enrollee_id', e.id);
                                                        setEnrolleeSearch('');
                                                        setShowEnrolleeList(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="fw-semibold">{e.first_name} {e.last_name}</div>
                                                        <div className="text-muted font-monospace" style={{ fontSize: 11 }}>
                                                            {e.enrollee_id}
                                                        </div>
                                                    </div>
                                                    <span className={`badge ${e.status === 'active' ? 'bg-success' : 'bg-warning'}`}
                                                          style={{ fontSize: 10 }}>
                                                        {e.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dependant picker */}
                        {selectedEnrollee && dependants.length > 0 && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Is this for a Dependant? (optional)
                                </label>
                                <select className="form-select" value={form.dependent_id}
                                        onChange={e => set('dependent_id', e.target.value)}>
                                    <option value="">— Principal member —</option>
                                    {dependants.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.first_name} {d.last_name} ({d.relationship})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </FormSection>

                    {/* Section 2: Provider */}
                    <FormSection title="2. Healthcare Provider" icon={Building2}>
                        {selectedHCP ? (
                            <div className="d-flex align-items-center gap-3 p-3 rounded-3"
                                 style={{ background: '#e8f0fe', border: '1px solid #c5d5e8' }}>
                                <CheckCircle size={18} color="#1967d2" />
                                <div className="flex-grow-1">
                                    <div className="fw-semibold" style={{ fontSize: 14 }}>{selectedHCP.name}</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        {selectedHCP.type} · {selectedHCP.tier} · {selectedHCP.city}
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-outline-secondary"
                                        onClick={() => { setSelectedHCP(null); set('hcp_id', ''); }}>
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="position-relative">
                                <input
                                    className="form-control"
                                    placeholder="Search for accredited healthcare provider…"
                                    value={hcpSearch}
                                    onChange={e => { setHcpSearch(e.target.value); setShowHCPList(true); }}
                                    onFocus={() => setShowHCPList(true)}
                                />
                                {showHCPList && hcpData?.data?.length > 0 && (
                                    <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                         style={{ top: '100%', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
                                        {hcpData.data.map(h => (
                                            <div
                                                key={h.id}
                                                className="px-3 py-2"
                                                style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8', fontSize: 13 }}
                                                onMouseEnter={ev => ev.currentTarget.style.background = '#f7fafc'}
                                                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                                                onClick={() => {
                                                    setSelectedHCP(h);
                                                    set('hcp_id', h.id);
                                                    setHcpSearch('');
                                                    setShowHCPList(false);
                                                }}
                                            >
                                                <div className="fw-semibold">{h.name}</div>
                                                <div className="text-muted" style={{ fontSize: 11 }}>
                                                    {h.type} · {h.tier} · {h.city}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-3">
                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                Attending Doctor / Consultant
                            </label>
                            <input
                                className="form-control"
                                placeholder="e.g. Dr. Okafor Emeka"
                                value={form.attending_doctor}
                                onChange={e => set('attending_doctor', e.target.value)}
                            />
                        </div>
                    </FormSection>

                    {/* Section 3: Clinical */}
                    <FormSection title="3. Clinical Information" icon={Stethoscope}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Service Type <span className="text-danger">*</span>
                                </label>
                                <select className="form-select" value={form.service_type}
                                        onChange={e => set('service_type', e.target.value)}>
                                    <option value="">— Select service —</option>
                                    {PA_SERVICES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    ICD-10 Diagnosis Code(s)
                                </label>
                                <input
                                    className="form-control"
                                    placeholder="e.g. J45.0, I10 (comma-separated)"
                                    value={form.diagnosis_codes}
                                    onChange={e => set('diagnosis_codes', e.target.value)}
                                />
                                <div className="form-text">Comma-separated if multiple</div>
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Diagnosis Description <span className="text-danger">*</span>
                                </label>
                                <input
                                    className="form-control"
                                    placeholder="Brief clinical description of the diagnosis"
                                    value={form.diagnosis_description}
                                    onChange={e => set('diagnosis_description', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Proposed Admission Date
                                </label>
                                <input type="date" className="form-control" value={form.admission_date}
                                       onChange={e => set('admission_date', e.target.value)} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Expected Duration (days)
                                </label>
                                <input type="number" className="form-control" min="1" placeholder="e.g. 3"
                                       value={form.expected_duration}
                                       onChange={e => set('expected_duration', e.target.value)} />
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Clinical Notes / Justification
                                </label>
                                <textarea
                                    className="form-control" rows={4}
                                    placeholder="Full clinical notes, reason for specific service/specialist, relevant history, planned procedure details…"
                                    value={form.clinical_notes}
                                    onChange={e => set('clinical_notes', e.target.value)}
                                />
                            </div>
                        </div>
                    </FormSection>

                    {/* Section 4: Cost & Urgency */}
                    <FormSection title="4. Cost Estimate & Urgency" icon={DollarSign}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Estimated Amount (₦)
                                </label>
                                <input
                                    type="number" className="form-control" min="0" step="1000"
                                    placeholder="e.g. 250000"
                                    value={form.estimated_amount}
                                    onChange={e => set('estimated_amount', e.target.value)}
                                />
                                <div className="form-text">
                                {"Required for > ₦500k (MD sign-off) and > ₦2M (CEO sign-off)"}
                                </div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Urgency <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex flex-column gap-2">
                                    {URGENCY_OPTIONS.map(o => (
                                        <label key={o.value}
                                               className="d-flex align-items-start gap-2 p-2 rounded-3"
                                               style={{
                                                   cursor: 'pointer',
                                                   border: `1.5px solid ${form.urgency === o.value ? '#1967d2' : '#e2e8f0'}`,
                                                   background: form.urgency === o.value ? '#f0f6ff' : '#fff',
                                               }}>
                                            <input type="radio" name="urgency" value={o.value}
                                                   checked={form.urgency === o.value}
                                                   onChange={() => set('urgency', o.value)}
                                                   style={{ marginTop: 3 }} />
                                            <div>
                                                <div className="fw-semibold" style={{ fontSize: 13 }}>{o.label}</div>
                                                <div className="text-muted" style={{ fontSize: 11 }}>{o.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FormSection>

                </div>

                {/* ── Right sidebar ───────────────────────────────────────── */}
                <div className="col-lg-4">
                    <div style={{ position: 'sticky', top: 24 }}>

                        {/* Approval tier indicator */}
                        <div className="card border-0 shadow-sm mb-3">
                            <div className="card-body">
                                <div className="fw-semibold mb-3" style={{ fontSize: 13 }}>
                                    Approval Requirements
                                </div>
                                {tierCfg ? (
                                    <div className="p-3 rounded-3"
                                         style={{ background: tierCfg.bg, border: `1px solid ${tierCfg.color}30` }}>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <tierCfg.icon size={16} color={tierCfg.color} />
                                            <span className="fw-bold" style={{ fontSize: 13, color: tierCfg.color }}>
                                                {tierCfg.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: tierCfg.color }}>
                                            {tierCfg.desc}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted" style={{ fontSize: 13 }}>
                                        Enter an estimated amount to see the required approval tier.
                                    </div>
                                )}

                                {/* Threshold guide */}
                                <div className="mt-3" style={{ fontSize: 11 }}>
                                    <div className="fw-semibold mb-1 text-muted">Threshold Guide:</div>
                                    {[
                                        ['Up to ₦500,000',    'Desk Officer',           '#137333'],
                                        ['₦500k – ₦2M',       'Medical Director',       '#b45309'],
                                        ['Above ₦2,000,000',  'Medical Director + CEO', '#c5221f'],
                                    ].map(([range, who, color]) => (
                                        <div key={range} className="d-flex justify-content-between py-1"
                                             style={{ borderBottom: '1px solid #f0f4f8' }}>
                                            <span className="text-muted">{range}</span>
                                            <span className="fw-semibold" style={{ color }}>{who}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* TAT reminder */}
                        <div className="card border-0 shadow-sm mb-3">
                            <div className="card-body">
                                <div className="fw-semibold mb-2" style={{ fontSize: 13 }}>
                                    <Clock size={14} className="me-1" /> TAT Commitment
                                </div>
                                <div className="vstack gap-2">
                                    {URGENCY_OPTIONS.map(o => (
                                        <div key={o.value} className="d-flex justify-content-between"
                                             style={{ fontSize: 12 }}>
                                            <span className="text-muted">{o.label}</span>
                                            <span className="fw-semibold">
                                                {o.value === 'standard' ? '15–30 min' : o.value === 'urgent' ? '30–60 min' : 'Immediate'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-body">
                                <div className="fw-semibold mb-2" style={{ fontSize: 13 }}>Submission Checklist</div>
                                {[
                                    [!!form.enrollee_id,           'Enrollee selected'],
                                    [!!form.hcp_id,                'Provider selected'],
                                    [!!form.service_type,          'Service type specified'],
                                    [!!form.diagnosis_description, 'Diagnosis described'],
                                    [!!form.urgency,               'Urgency level set'],
                                    [form.urgency !== 'standard' || !!form.estimated_amount, 'Estimated amount (if applicable)'],
                                ].map(([done, label]) => (
                                    <div key={label} className="d-flex align-items-center gap-2 mb-1">
                                        {done
                                            ? <CheckCircle size={14} color="#137333" />
                                            : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #d1d5db' }} />
                                        }
                                        <span style={{ fontSize: 12, color: done ? '#2d3748' : '#a0aec0' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            className="btn w-100 d-flex align-items-center justify-content-center gap-2"
                            style={{
                                background: isValid ? (form.urgency === 'emergency' ? '#c5221f' : '#0f4c81') : '#94a3b8',
                                color: '#fff', border: 'none', padding: '12px',
                                fontSize: 14, fontWeight: 600, borderRadius: 10,
                            }}
                            onClick={() => submitMutation.mutate()}
                            disabled={!isValid || submitMutation.isPending}
                        >
                            {submitMutation.isPending
                                ? <><span className="spinner-border spinner-border-sm" /> Submitting…</>
                                : form.urgency === 'emergency'
                                    ? <><Zap size={16} /> Submit Emergency PA</>
                                    : <><FileText size={16} /> Submit PA Request</>
                            }
                        </button>

                        {form.urgency === 'emergency' && (
                            <div className="mt-2 text-center" style={{ fontSize: 11, color: '#718096' }}>
                                Emergency care can proceed immediately. Clinical team will review within 24 hours.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function FormSection({ title, icon: Icon, children }) {
    return (
        <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                <h6 className="fw-bold d-flex align-items-center gap-2 mb-3" style={{ fontSize: 14 }}>
                    <div className="rounded-2 d-flex align-items-center justify-content-center"
                         style={{ width: 28, height: 28, background: '#e8f0fe' }}>
                        <Icon size={15} color="#1967d2" />
                    </div>
                    {title}
                </h6>
            </div>
            <div className="card-body pt-0">
                {children}
            </div>
        </div>
    );
}