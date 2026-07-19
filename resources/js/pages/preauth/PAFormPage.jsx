/**
 * FILE LOCATION: resources/js/pages/preauth/PAFormPage.jsx
 *
 * Enhanced with autocomplete suggestions for:
 *  - Service types (with ICD-10 code suggestions)
 *  - Diagnosis codes (ICD-10 lookup)
 *  - Common procedure names
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    ArrowLeft, AlertTriangle, Info, CheckCircle,
    User, Building2, Stethoscope, FileText, Zap,
    Clock, TrendingUp, DollarSign, Search, X,
} from 'lucide-react';
import { submitPARequest, fetchEnrollees, fetchHCPs } from '../../api/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';


// Services that require pre-authorisation per NHIA guidelines
const PA_SERVICES = [
    { value: 'inpatient_admission',  label: 'Inpatient Admission / Hospitalisation', keywords: ['admit', 'hospital', 'ward', 'inpatient'] },
    { value: 'surgical_procedure',   label: 'Surgical Procedure', keywords: ['surgery', 'operation', 'surgical', 'theatre'] },
    { value: 'mri_ct_scan',          label: 'MRI / CT Scan', keywords: ['mri', 'ct scan', 'radiology', 'imaging'] },
    { value: 'specialist_referral',  label: 'Specialist Consultation (Referred)', keywords: ['referral', 'specialist', 'consultant'] },
    { value: 'physiotherapy',        label: 'Physiotherapy (Course)', keywords: ['physio', 'physical therapy', 'rehab'] },
    { value: 'chemotherapy',         label: 'Chemotherapy / Oncology', keywords: ['chemo', 'oncology', 'cancer'] },
    { value: 'dialysis',             label: 'Renal Dialysis', keywords: ['dialysis', 'kidney', 'renal'] },
    { value: 'maternity_admission',  label: 'Maternity Admission / Delivery', keywords: ['maternity', 'delivery', 'antenatal', 'labour'] },
    { value: 'major_investigation',  label: 'Major Diagnostic Investigation', keywords: ['endoscopy', 'colonoscopy', 'biopsy'] },
    { value: 'prosthetics',          label: 'Prosthetics / Orthopaedic Implants', keywords: ['prosthetic', 'implant', 'orthopaedic'] },
    { value: 'chronic_drugs',        label: 'Chronic Medication (New Registration)', keywords: ['chronic', 'medication', 'drugs'] },
    { value: 'dental_major',         label: 'Major Dental (Extraction, Root Canal)', keywords: ['dental', 'extraction', 'root canal'] },
    { value: 'optical',              label: 'Optical / Spectacles', keywords: ['optical', 'spectacles', 'glasses'] },
    { value: 'other',                label: 'Other (specify in clinical notes)', keywords: ['other'] },
];

const ICD10_COMMON = [
    { code: 'A00-A09', label: 'Intestinal infectious diseases' },
    { code: 'C00-D49', label: 'Neoplasms (Cancer)' },
    { code: 'E00-E89', label: 'Endocrine, nutritional and metabolic diseases' },
    { code: 'F01-F99', label: 'Mental, Behavioral and Neurodevelopmental disorders' },
    { code: 'G00-G99', label: 'Diseases of the nervous system' },
    { code: 'I00-I99', label: 'Diseases of the circulatory system' },
    { code: 'J00-J99', label: 'Diseases of the respiratory system' },
    { code: 'K00-K95', label: 'Diseases of the digestive system' },
    { code: 'M00-M99', label: 'Diseases of the musculoskeletal system' },
    { code: 'N00-N99', label: 'Diseases of the genitourinary system' },
    { code: 'O00-O9A', label: 'Pregnancy, childbirth and the puerperium' },
];

// Common procedure names with keywords
const COMMON_PROCEDURES = [
    { name: 'Appendectomy', keywords: ['appendix', 'appendicitis'] },
    { name: 'Cholecystectomy', keywords: ['gallbladder', 'gall stones'] },
    { name: 'Hernia Repair', keywords: ['hernia', 'inguinal'] },
    { name: 'Cataract Surgery', keywords: ['cataract', 'eye surgery'] },
    { name: 'Caesarean Section', keywords: ['c-section', 'delivery'] },
    { name: 'Hysterectomy', keywords: ['uterus', 'womb'] },
    { name: 'Knee Replacement', keywords: ['knee', 'arthroplasty'] },
    { name: 'Hip Replacement', keywords: ['hip', 'arthroplasty'] },
    { name: 'Angioplasty', keywords: ['heart', 'stent', 'cardiac'] },
    { name: 'Coronary Bypass', keywords: ['CABG', 'heart surgery'] },
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
    { value: 'emergency', label: '🔴 Emergency',  desc: 'Immediate life-threatening situation. Care proceeds; Pre-Auth. Code is retrospective within 24 hrs.' },
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
    const [serviceSearch,  setServiceSearch]  = useState('');
    const [icdSearch,      setIcdSearch]      = useState('');
    const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
    const [showIcdSuggestions, setShowIcdSuggestions] = useState(false);
    const [showProcedureSuggestions, setShowProcedureSuggestions] = useState(false);
    const [selectedEnrollee, setSelectedEnrollee] = useState(null);
    const [selectedHCP,      setSelectedHCP]      = useState(null);
    const [showEnrolleeList, setShowEnrolleeList] = useState(false);
    const [showHCPList,      setShowHCPList]      = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Enrollee search
    const { data: enrolleeData, isLoading: enrolleeLoading } = useQuery({
        queryKey: ['pa-enrollee-search', enrolleeSearch],
        queryFn: () => fetchEnrollees({ search: enrolleeSearch, per_page: 8 }),
        enabled: enrolleeSearch.length > 1,
    });

    // Extract enrollees with proper nested structure
    const enrollees = enrolleeData?.data?.data ?? [];

    // HCP search
    const { data: hcpData, isLoading: hcpLoading } = useQuery({
        queryKey: ['pa-hcp-search', hcpSearch],
        queryFn:  () => fetchHCPs({ search: hcpSearch, status: 'active', per_page: 8 }),
        enabled:  hcpSearch.length > 1,
    });

    // Extract HCPs with proper nested structure
    const hcps = hcpData?.data?.data ?? [];

    // Filter service suggestions based on search
    const serviceSuggestions = useMemo(() => {
        if (!serviceSearch) return PA_SERVICES.slice(0, 5);
        const searchLower = serviceSearch.toLowerCase();
        return PA_SERVICES.filter(s => 
            s.label.toLowerCase().includes(searchLower) ||
            s.keywords.some(k => k.includes(searchLower))
        ).slice(0, 5);
    }, [serviceSearch]);

    // Filter ICD-10 suggestions
    const icdSuggestions = useMemo(() => {
        if (!icdSearch) return ICD10_COMMON.slice(0, 5);
        const searchLower = icdSearch.toLowerCase();
        return ICD10_COMMON.filter(i => 
            i.code.toLowerCase().includes(searchLower) ||
            i.label.toLowerCase().includes(searchLower)
        ).slice(0, 5);
    }, [icdSearch]);

    // Filter procedure suggestions
    const procedureSuggestions = useMemo(() => {
        const descLower = form.diagnosis_description?.toLowerCase() || '';
        if (!descLower) return [];
        return COMMON_PROCEDURES.filter(p => 
            p.keywords.some(k => descLower.includes(k)) ||
            p.name.toLowerCase().includes(descLower)
        ).slice(0, 3);
    }, [form.diagnosis_description]);

    const submitMutation = useMutation({
        mutationFn: async () => {
            // Format the data correctly for the backend
            const payload = {
                enrollee_id: parseInt(form.enrollee_id),
                dependent_id: form.dependent_id ? parseInt(form.dependent_id) : null,
                hcp_id: parseInt(form.hcp_id),
                service_type: form.service_type,
                urgency: form.urgency,
                diagnosis_codes: form.diagnosis_codes 
                    ? form.diagnosis_codes.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                diagnosis_description: form.diagnosis_description,
                clinical_notes: form.clinical_notes || null,
                estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
                admission_date: form.admission_date || null,
                expected_duration: form.expected_duration ? parseInt(form.expected_duration) : null,
                attending_doctor: form.attending_doctor || null,
                submission_channel: 'hmo_portal'
            };
            

            return submitPARequest(payload);
        },
        onSuccess: (res) => {
            const pa = res.data?.data;
            toast.success('Pre-Auth. Code Request submitted successfully');
            navigate(`/pre-auth/${pa?.id}`);
        },
        onError: (err) => {
            console.error('❌ Submit error:', err);
            toast.error(err.response?.data?.message || 'Submission failed');
        },
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
                        Submit for clinical review. Emergency cases may proceed - PA is retrospective.
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
                            The patient can receive care immediately. This Pre-Auth. request will be reviewed retrospectively within 24 hours by the clinical team.
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
                                        placeholder="Type 3+ characters to search..."
                                        value={enrolleeSearch}
                                        onChange={e => {
                                            setEnrolleeSearch(e.target.value);
                                            setShowEnrolleeList(e.target.value.length >= 3);
                                        }}
                                        onFocus={() => {
                                            if (enrolleeSearch.length >= 3) {
                                                setShowEnrolleeList(true);
                                            }
                                        }}
                                    />
                                    {showEnrolleeList && (
                                        <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                            style={{ top: '100%', zIndex: 1000, maxHeight: 240, overflowY: 'auto' }}>
                                            {enrolleeLoading ? (
                                                <div className="p-3 text-center">
                                                    <div className="spinner-border spinner-border-sm" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                </div>
                                            ) : enrollees.length > 0 ? (
                                                enrollees.map(e => (
                                                    <div
                                                        key={e.id}
                                                        className="px-3 py-2 d-flex justify-content-between align-items-center"
                                                        style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8' }}
                                                        onMouseDown={(event) => {
                                                            event.preventDefault();
                                                            setSelectedEnrollee(e);
                                                            set('enrollee_id', e.id);
                                                            setEnrolleeSearch('');
                                                            setShowEnrolleeList(false);
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                                                ))
                                            ) : (
                                                <div className="p-3 text-center text-muted">
                                                    No enrollees found matching "{enrolleeSearch}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dependant picker */}
                        {selectedEnrollee && selectedEnrollee.dependants?.length > 0 && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Is this for a Dependant? (optional)
                                </label>
                                <select className="form-select" value={form.dependent_id}
                                        onChange={e => set('dependent_id', e.target.value)}>
                                    <option value="">- Principal member -</option>
                                    {selectedEnrollee.dependants.map(d => (
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
                                    placeholder="Type 3+ characters to search for providers..."
                                    value={hcpSearch}
                                    onChange={e => {
                                        setHcpSearch(e.target.value);
                                        setShowHCPList(e.target.value.length >= 3);
                                    }}
                                    onFocus={() => {
                                        if (hcpSearch.length >= 3) {
                                            setShowHCPList(true);
                                        }
                                    }}
                                />
                                {showHCPList && (
                                    <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                        style={{ top: '100%', zIndex: 1000, maxHeight: 240, overflowY: 'auto' }}>
                                        {hcpLoading ? (
                                            <div className="p-3 text-center">
                                                <div className="spinner-border spinner-border-sm" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : hcps.length > 0 ? (
                                            hcps.map(h => (
                                                <div
                                                    key={h.id}
                                                    className="px-3 py-2"
                                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8' }}
                                                    onMouseDown={(event) => {
                                                        event.preventDefault();
                                                        setSelectedHCP(h);
                                                        set('hcp_id', h.id);
                                                        setHcpSearch('');
                                                        setShowHCPList(false);
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div className="fw-semibold">{h.name}</div>
                                                    <div className="text-muted" style={{ fontSize: 11 }}>
                                                        {h.type} · {h.tier} · {h.city}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-muted">
                                                No providers found matching "{hcpSearch}"
                                            </div>
                                        )}
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
                            {/* Service Type with Autocomplete */}
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Service Type <span className="text-danger">*</span>
                                </label>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Type to search services..."
                                        value={serviceSearch}
                                        onChange={(e) => {
                                            setServiceSearch(e.target.value);
                                            setShowServiceSuggestions(true);
                                        }}
                                        onFocus={() => setShowServiceSuggestions(true)}
                                        onBlur={() => {
                                            // Delay hiding to allow click on suggestion
                                            setTimeout(() => setShowServiceSuggestions(false), 200);
                                        }}
                                    />
                                    {showServiceSuggestions && serviceSuggestions.length > 0 && (
                                        <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                            style={{ top: '100%', zIndex: 1000, maxHeight: '250px', overflowY: 'auto' }}>
                                            {serviceSuggestions.map(s => (
                                                <div
                                                    key={s.value}
                                                    className="px-3 py-2"
                                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8' }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent blur before click
                                                        set('service_type', s.value);
                                                        setServiceSearch(s.label);
                                                        setShowServiceSuggestions(false);
                                                    }}
                                                >
                                                    <div className="fw-semibold">{s.label}</div>
                                                    <small className="text-muted">Keywords: {s.keywords?.join(', ')}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Hidden select to show selected value */}
                                {form.service_type && (
                                    <small className="text-success d-block mt-1">
                                        ✓ Selected: {PA_SERVICES.find(s => s.value === form.service_type)?.label}
                                    </small>
                                )}
                            </div>

                            {/* ICD-10 Codes with Autocomplete */}
                            <div className="col-md-6">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    ICD-10 Diagnosis Code(s)
                                </label>
                                <div className="position-relative">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search ICD-10 codes..."
                                        value={icdSearch}
                                        onChange={(e) => {
                                            setIcdSearch(e.target.value);
                                            setShowIcdSuggestions(true);
                                        }}
                                        onFocus={() => setShowIcdSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowIcdSuggestions(false), 200)}
                                    />
                                    {showIcdSuggestions && icdSuggestions.length > 0 && (
                                        <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                            style={{ top: '100%', zIndex: 1000, maxHeight: '250px', overflowY: 'auto' }}>
                                            {icdSuggestions.map(i => (
                                                <div
                                                    key={i.code}
                                                    className="px-3 py-2 d-flex justify-content-between align-items-center"
                                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8' }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        const currentCodes = form.diagnosis_codes 
                                                            ? form.diagnosis_codes.split(',').map(s => s.trim()).filter(Boolean)
                                                            : [];
                                                        
                                                        if (!currentCodes.includes(i.code)) {
                                                            currentCodes.push(i.code);
                                                            set('diagnosis_codes', currentCodes.join(', '));
                                                        }
                                                        setIcdSearch('');
                                                        setShowIcdSuggestions(false);
                                                    }}
                                                >
                                                    <span>
                                                        <span className="fw-bold me-2">{i.code}</span>
                                                        <span>{i.label}</span>
                                                    </span>
                                                    <span className="badge bg-light text-dark">Add</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Display selected codes as badges */}
                                {form.diagnosis_codes && (
                                    <div className="d-flex flex-wrap gap-1 mt-2">
                                        {form.diagnosis_codes.split(',').map((code, idx) => (
                                            <span key={idx} className="badge bg-primary" style={{ fontSize: 11 }}>
                                                {code.trim()}
                                                <button
                                                    type="button"
                                                    className="btn-close btn-close-white ms-1"
                                                    style={{ fontSize: '6px', verticalAlign: 'middle' }}
                                                    onClick={() => {
                                                        const codes = form.diagnosis_codes.split(',').map(s => s.trim());
                                                        codes.splice(idx, 1);
                                                        set('diagnosis_codes', codes.join(', '));
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="form-text">Type to search, click to add codes</div>
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Diagnosis Description <span className="text-danger">*</span>
                                </label>
                                <div className="position-relative">
                                    <input
                                        className="form-control"
                                        placeholder="Brief clinical description of the diagnosis"
                                        value={form.diagnosis_description}
                                        onChange={e => {
                                            set('diagnosis_description', e.target.value);
                                            setShowProcedureSuggestions(true);
                                        }}
                                        onFocus={() => setShowProcedureSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowProcedureSuggestions(false), 200)}
                                    />
                                    {showProcedureSuggestions && procedureSuggestions.length > 0 && (
                                        <div className="position-absolute w-100 bg-white border rounded-3 shadow-sm"
                                             style={{ top: '100%', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                                            <div className="px-3 py-2 text-muted fw-semibold" style={{ fontSize: 11 }}>
                                                Suggested procedures:
                                            </div>
                                            {procedureSuggestions.map(p => (
                                                <div
                                                    key={p.name}
                                                    className="px-3 py-2"
                                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f0f4f8', fontSize: 13 }}
                                                    onMouseEnter={ev => ev.currentTarget.style.background = '#f7fafc'}
                                                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                                                    onClick={() => {
                                                        set('diagnosis_description', p.name);
                                                        setShowProcedureSuggestions(false);
                                                    }}
                                                >
                                                    {p.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                                    : <><FileText size={16} /> Submit Pre-Auth. Request</>
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