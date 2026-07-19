/**
 * FILE LOCATION: resources/js/pages/preauth/PADetailPage.jsx
 *
 * Pre-Authorisation Detail - clinical review workspace.
 *
 * Three-step approval flow (triggered by estimated_amount):
 *   ≤ ₦500k   → Authorisation Desk Officer approves (one step → "approved")
 *   ₦500k–₦2M → Desk Officer approves first (→ "awaiting_md"),
 *                Medical Director gives final sign-off (→ "approved")
 *   > ₦2M     → Desk Officer → MD → CEO (→ "approved")
 *
 * Emergency PAs:
 *   - Status shows "emergency_retrospective"
 *   - Must be reviewed and formally approved/declined within 24 hrs
 *   - Declining an emergency PA does NOT void the claim - it flags for audit
 *
 * PA Code:
 *   Generated on FIRST approval decision (standard) or MD sign-off (high-value)
 *   Format: PA-YYYY-NNNNNNN  e.g. PA-2025-0042341
 *   Displayed prominently once issued - provider uses this code on the claim form
 *
 * Permissions:
 *   pa.view              → read-only view
 *   pa.approve_standard  → approve ≤₦500k, or first-step for higher tiers
 *   pa.approve_high      → Medical Director sign-off on ₦500k–₦2M
 *   pa.approve_critical  → CEO sign-off on >₦2M
 *   pa.decline           → decline at any stage
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle,
    Zap, Shield, User, Building2, FileText, Activity,
    Copy, Download, RefreshCw, Timer, ChevronRight,
    DollarSign, Calendar, Stethoscope, MessageSquare,
} from 'lucide-react';
import { fetchPARequest, approvePA, declinePA, revokePA } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import client from '../../api/client';
import axios from 'axios';
// ── TAT helpers (same as PAListPage) ──────────────────────────────────────────
function minutesElapsed(isoStr) {
    return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
}
function tatStatus(urgency, minutes) {
    if (urgency === 'emergency') return 'safe';
    const [warn, danger] = urgency === 'urgent' ? [30, 60] : [15, 30];
    if (minutes >= danger) return 'danger';
    if (minutes >= warn)   return 'warning';
    return 'safe';
}
const TAT_STYLE = {
    safe:    { bg: '#e6f4ea', color: '#137333', border: '#a8d5b5' },
    warning: { bg: '#fff8e1', color: '#b45309', border: '#fcd34d' },
    danger:  { bg: '#fce8e6', color: '#c5221f', border: '#fca5a5' },
};

// ── Approval tier config ───────────────────────────────────────────────────────
function getApprovalTier(amount) {
    if (!amount || amount <= 0) return 'standard';
    if (amount > 2_000_000)    return 'ceo';
    if (amount > 500_000)      return 'md';
    return 'standard';
}

// Which permission is needed to take the NEXT approval action on this PA
function nextApprovalPermission(pa) {
    if (!pa) return null;
    if (pa.status === 'pending') {
        // Anyone with standard can push it forward; MD/CEO can also approve in one go if they have authority
        const tier = getApprovalTier(pa.estimated_amount);
        if (tier === 'standard') return 'pa.approve_standard';
        if (tier === 'md')       return 'pa.approve_standard'; // desk officer does first step
        return 'pa.approve_standard';
    }
    if (pa.status === 'awaiting_md')  return 'pa.approve_high_value';
    if (pa.status === 'awaiting_ceo') return 'pa.approve_critical';
    return null;
}

// Human label for status
const STATUS_LABEL = {
    pending:                  'Pending Review',
    awaiting_md:              'Awaiting Medical Director',
    awaiting_ceo:             'Awaiting CEO',
    approved:                 'Approved',
    declined:                 'Declined',
    expired:                  'Expired',
    used:                     'Used on Claim',
    revoked:                  'Revoked',
    emergency_retrospective:  'Emergency - Retrospective Review',
};
const STATUS_COLOR = {
    pending:                 'warning',
    awaiting_md:             'info',
    awaiting_ceo:            'primary',
    approved:                'success',
    declined:                'danger',
    expired:                 'dark',
    used:                    'secondary',
    revoked:                 'dark',
    emergency_retrospective: 'danger',
};

const URGENCY_STYLE = {
    standard:  { bg: '#e8f0fe', color: '#1967d2', label: 'Standard' },
    urgent:    { bg: '#fff3e0', color: '#e65100', label: 'Urgent'   },
    emergency: { bg: '#fce8e6', color: '#c5221f', label: 'Emergency' },
};

export default function PADetailPage() {
    const { id }     = useParams();
    const navigate   = useNavigate();
    const { hasPermission } = useAuth();
    const qc         = useQueryClient();

    // Approval modal state
    const [approveModal, setApproveModal] = useState(false);
    const [declineModal, setDeclineModal] = useState(false);
    const [revokeModal,  setRevokeModal]  = useState(false);
    const [approvedAmt,  setApprovedAmt]  = useState('');
    const [approveNote,  setApproveNote]  = useState('');
    const [declineNote,  setDeclineNote]  = useState('');
    const [revokeNote,   setRevokeNote]   = useState('');
    const [validityDays, setValidityDays] = useState(30);

    // Live TAT clock
    const [tatMins, setTatMins] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            if (data?.data?.created_at) setTatMins(minutesElapsed(data.data.created_at));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['pa-request', id],
        queryFn:  () => fetchPARequest(id),
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: ['pa-request', id] });

    const approveMutation = useMutation({
        mutationFn: () => approvePA(id, {
            approved_amount:  approvedAmt ? parseFloat(approvedAmt) : null,
            note:             approveNote,
            validity_days:    parseInt(validityDays, 10),
        }),
        onSuccess: (res) => {
            const pa = res.data?.data;
            toast.success(
                pa?.status === 'approved'
                    ? `✅ Pre-Auth. approved - Code: ${pa.pa_code}`
                    : `✅ First approval recorded. Escalated to ${pa?.status === 'awaiting_md' ? 'Medical Director' : 'CEO'}.`
            );
            setApproveModal(false);
            invalidate();
            qc.invalidateQueries({ queryKey: ['pa-requests'] });
            qc.invalidateQueries({ queryKey: ['pa-stats'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Approval failed.'),
    });

    const declineMutation = useMutation({
        mutationFn: () => declinePA(id, { reason: declineNote }),
        onSuccess: () => {
            toast.info('Pre-Auth. request declined. Decline reason recorded.');
            setDeclineModal(false);
            invalidate();
            qc.invalidateQueries({ queryKey: ['pa-requests'] });
            qc.invalidateQueries({ queryKey: ['pa-stats'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Decline failed.'),
    });

    const revokeMutation = useMutation({
        mutationFn: () => revokePA(id, { reason: revokeNote }),
        onSuccess: () => {
            toast.warning('Pre-Auth. code revoked. Provider has been notified.');
            setRevokeModal(false);
            invalidate();
            qc.invalidateQueries({ queryKey: ['pa-requests'] });
            qc.invalidateQueries({ queryKey: ['pa-stats'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Revoke failed.'),
    });

    if (isLoading) return <div className="d-flex justify-content-center py-5"><LoadingSpinner /></div>;
    if (error)     return <ErrorAlert error={error} />;

    const pa = data?.data;

    if (!pa) return null;

    // Computed permissions
    const nextPerm       = nextApprovalPermission(pa);
    const canApprove     = nextPerm && hasPermission(nextPerm);
    const canDecline     = hasPermission('pa.decline') && ['pending','awaiting_md','awaiting_ceo','emergency_retrospective'].includes(pa.status);
    const canRevoke      = hasPermission('pa.decline') && pa.status === 'approved' && !pa.claim_id;
    const isActive       = ['pending','awaiting_md','awaiting_ceo','emergency_retrospective'].includes(pa.status);
    const tier           = getApprovalTier(pa.estimated_amount);
    const urgSty         = URGENCY_STYLE[pa.urgency] ?? URGENCY_STYLE.standard;
    const ts             = tatStatus(pa.urgency, minutesElapsed(pa.created_at));
    const tatSty         = TAT_STYLE[ts];

    // Approval chain steps
    const steps = buildApprovalSteps(pa, tier);

    const downloadPDF = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                toast.error('Not authenticated');
                return;
            }
            
            console.log('Downloading Pre-Auth. ID:', pa.id);
            
            const response = await axios.get(`/api/v1/pre-auth/${pa.id}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob'
            });
            
            // Create download link from response
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `PA-Letter-${pa.pa_code || pa.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Download started');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Download failed');
        }
    };

    return (
        <div>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="d-flex align-items-start gap-3 mb-4 flex-wrap">
                <button className="btn btn-light btn-sm mt-1" onClick={() => navigate('/pre-auth')}>
                    <ArrowLeft size={16} />
                </button>
                <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-3 flex-wrap mb-1">
                        <h4 className="fw-bold mb-0 font-monospace" style={{ fontSize: 18 }}>
                            {pa.pa_code
                                ? <span style={{ color: '#137333' }}>{pa.pa_code}</span>
                                : <span className="text-muted">Code Pending…</span>
                            }
                        </h4>
                        <StatusBadge
                            status={pa.status}
                            color={STATUS_COLOR[pa.status] ?? 'secondary'}
                            label={STATUS_LABEL[pa.status] ?? pa.status}
                        />
                        <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                            background: urgSty.bg, color: urgSty.color,
                        }}>
                            {urgSty.label}
                        </span>
                        {isActive && (
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                                background: tatSty.bg, color: tatSty.color, border: `1px solid ${tatSty.border}`,
                                fontFamily: 'monospace',
                            }}>
                                <Timer size={11} className="me-1" />
                                {formatElapsed(minutesElapsed(pa.created_at))}
                                {ts === 'danger'  && ' ⚠ OVERDUE'}
                                {ts === 'warning' && ' ⚡ DUE SOON'}
                            </span>
                        )}
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                        Submitted {formatDateTime(pa.created_at)} by {pa.submitted_by_name ?? 'System'}
                        {pa.reviewed_at && ` · Reviewed ${formatDateTime(pa.reviewed_at)}`}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="d-flex gap-2 flex-shrink-0 flex-wrap">
                    <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                            onClick={() => refetch()}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                    {pa.pa_code && (
                        <button
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                            onClick={() => { navigator.clipboard.writeText(pa.pa_code); toast.success('Pre-Auth. code copied!'); }}
                        >
                            <Copy size={13} /> Copy Code
                        </button>
                    )}
                    {canDecline && (
                        <button className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                                onClick={() => setDeclineModal(true)}>
                            <XCircle size={14} /> Decline
                        </button>
                    )}
                    {canRevoke && (
                        <button className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
                                onClick={() => setRevokeModal(true)}>
                            <XCircle size={14} /> Revoke Code
                        </button>
                    )}
                    {canApprove && (
                        <button
                            className="btn btn-success d-flex align-items-center gap-2"
                            onClick={() => {
                                setApprovedAmt(pa.estimated_amount ?? '');
                                setApproveModal(true);
                            }}
                        >
                            <CheckCircle size={16} />
                            {pa.status === 'awaiting_md'  ? 'MD Sign-Off' :
                             pa.status === 'awaiting_ceo' ? 'CEO Sign-Off' : 'Approve PA'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Emergency banner ────────────────────────────────────────── */}
            {pa.urgency === 'emergency' && (
                <div className="alert d-flex align-items-start gap-3 mb-4"
                     style={{ background: '#fce8e6', border: '1px solid #fca5a5', color: '#7b0000' }}>
                    <Zap size={20} className="flex-shrink-0 mt-1" />
                    <div>
                        <div className="fw-bold" style={{ fontSize: 14 }}>Emergency Pre-Auth</div>
                        <div style={{ fontSize: 13 }}>
                            Care was authorised to proceed immediately. This Pre-Auth. must be formally reviewed within <strong>24 hours</strong> of admission.
                            {isActive && <span className="ms-2 fw-bold">Action required now.</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── PA Code display (approved) ──────────────────────────────── */}
            {pa.pa_code && pa.status !== 'declined' && pa.status !== 'revoked' && (
                <div className="card border-0 shadow-sm mb-4"
                     style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e3a5f 100%)', color: '#fff' }}>
                    <div className="card-body py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                Pre-Authorisation Code - Provider must quote this on the claim
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 2 }}>
                                {pa.pa_code}
                            </div>
                        </div>
                        <div className="d-flex flex-column align-items-end gap-1">
                            <div style={{ fontSize: 11, opacity: 0.75 }}>Valid Until</div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{pa.expires_at ? formatDate(pa.expires_at) : '-'}</div>
                            {pa.status === 'used' && (
                                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 10 }}>
                                    ✓ Used on Claim {pa.claim_number}
                                </span>
                            )}
                            {pa.status === 'expired' && (
                                <span style={{ fontSize: 11, background: 'rgba(255,100,100,0.3)', padding: '2px 10px', borderRadius: 10 }}>
                                    ✗ Expired
                                </span>
                            )}
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-sm d-flex align-items-center gap-1"
                                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
                                onClick={() => { navigator.clipboard.writeText(pa.pa_code); toast.success('Pre-Auth. code copied!'); }}
                            >
                                <Copy size={13} /> Copy
                            </button>
                            <button
                                className="btn btn-sm d-flex align-items-center gap-1"
                                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
                                onClick={downloadPDF}
                            >
                              <Download size={13} /> PDF Letter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Approval chain progress ──────────────────────────────────── */}
            {tier !== 'standard' && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body py-3 px-4">
                        <div className="fw-semibold mb-3" style={{ fontSize: 13 }}>Approval Chain Progress</div>
                        <div className="d-flex align-items-center gap-0 flex-wrap">
                            {steps.map((step, i) => (
                                <React.Fragment key={step.label}>
                                    <div className="d-flex flex-column align-items-center" style={{ minWidth: 120 }}>
                                        <div
                                            className="rounded-circle d-flex align-items-center justify-content-center mb-1"
                                            style={{
                                                width: 36, height: 36,
                                                background: step.state === 'done'    ? '#137333' :
                                                            step.state === 'current' ? '#1967d2' : '#e2e8f0',
                                                color: step.state !== 'pending' ? '#fff' : '#94a3b8',
                                            }}
                                        >
                                            {step.state === 'done'
                                                ? <CheckCircle size={18} />
                                                : step.state === 'current'
                                                    ? <Clock size={18} />
                                                    : <span style={{ fontSize: 14, fontWeight: 700 }}>{i + 1}</span>
                                            }
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: step.state === 'pending' ? '#a0aec0' : '#2d3748' }}>
                                            {step.label}
                                        </div>
                                        {step.by && (
                                            <div style={{ fontSize: 10, color: '#718096', textAlign: 'center' }}>{step.by}</div>
                                        )}
                                        {step.at && (
                                            <div style={{ fontSize: 10, color: '#a0aec0' }}>{formatDateTime(step.at)}</div>
                                        )}
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div style={{ flex: 1, height: 2, background: steps[i + 1].state === 'pending' ? '#e2e8f0' : '#137333', margin: '0 4px 20px' }} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main grid ───────────────────────────────────────────────── */}
            <div className="row g-4">

                {/* Left - clinical details */}
                <div className="col-lg-8">

                    {/* Patient & Provider */}
                    <div className="row g-3 mb-4">
                        <div className="col-md-6">
                            <InfoCard title="Patient" icon={User}>
                                <InfoRow label="Name"        value={pa.enrollee_name} />
                                <InfoRow label="Member No."  value={<span className="font-monospace">{pa.enrollee_member_no}</span>} />
                                <InfoRow label="Company"     value={pa.corporate_name} />
                                {pa.dependent_name && (
                                    <div className="mt-2 p-2 bg-light rounded-2" style={{ fontSize: 12 }}>
                                        <strong>For Dependant:</strong> {pa.dependent_name}
                                        {pa.dependent_relationship && <span className="text-muted ms-1">({pa.dependent_relationship})</span>}
                                    </div>
                                )}
                                {pa.enrollee_benefit_balance != null && (
                                    <div className="mt-2 pt-2 border-top">
                                        <div className="d-flex justify-content-between">
                                            <span style={{ fontSize: 12, color: '#718096' }}>Benefit Balance</span>
                                            <span className="fw-bold" style={{ fontSize: 13, color: pa.enrollee_benefit_balance < 10000 ? '#c5221f' : '#137333' }}>
                                                {formatCurrency(pa.enrollee_benefit_balance)}
                                            </span>
                                        </div>
                                        {pa.enrollee_benefit_balance < parseFloat(pa.estimated_amount || 0) && (
                                            <div className="mt-1" style={{ fontSize: 11, color: '#c5221f' }}>
                                                ⚠ Estimated amount exceeds remaining balance
                                            </div>
                                        )}
                                    </div>
                                )}
                            </InfoCard>
                        </div>
                        <div className="col-md-6">
                            <InfoCard title="Healthcare Provider" icon={Building2}>
                                <InfoRow label="Name"   value={pa.hcp_name} />
                                <InfoRow label="Type"   value={pa.hcp_type} />
                                <InfoRow label="Tier"   value={pa.hcp_tier} />
                                <InfoRow label="City"   value={pa.hcp_city} />
                                {pa.attending_doctor && (
                                    <InfoRow label="Attending Doctor" value={pa.attending_doctor} />
                                )}
                            </InfoCard>
                        </div>
                    </div>

                    {/* Clinical details */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="fw-bold d-flex align-items-center gap-2 mb-0" style={{ fontSize: 14 }}>
                                <Stethoscope size={15} className="text-primary" /> Clinical Information
                            </h6>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InfoRow label="Service Type" value={pa.service_type_label ?? pa.service_type} />
                                </div>
                                <div className="col-md-6">
                                    <InfoRow label="Diagnosis Description" value={pa.diagnosis_description} />
                                </div>
                                {pa.diagnosis_codes?.length > 0 && (
                                    <div className="col-md-6">
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#718096', marginBottom: 4 }}>
                                            ICD-10 Code(s)
                                        </div>
                                        <div className="d-flex gap-1 flex-wrap">
                                            {pa.diagnosis_codes.map(c => (
                                                <span key={c} className="badge bg-light text-dark border" style={{ fontSize: 11 }}>{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {pa.admission_date && (
                                    <div className="col-md-3">
                                        <InfoRow label="Admission Date" value={formatDate(pa.admission_date)} />
                                    </div>
                                )}
                                {pa.expected_duration && (
                                    <div className="col-md-3">
                                        <InfoRow label="Expected Duration" value={`${pa.expected_duration} day(s)`} />
                                    </div>
                                )}
                                {pa.clinical_notes && (
                                    <div className="col-12">
                                        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#718096', marginBottom: 4 }}>
                                            Clinical Notes
                                        </div>
                                        <div className="p-3 bg-light rounded-3" style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                            {pa.clinical_notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Decision notes */}
                    {(pa.approval_note || pa.decline_reason) && (
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white border-bottom py-3">
                                <h6 className="fw-bold d-flex align-items-center gap-2 mb-0" style={{ fontSize: 14 }}>
                                    <MessageSquare size={15} className={pa.status === 'declined' ? 'text-danger' : 'text-success'} />
                                    Clinical Decision Notes
                                </h6>
                            </div>
                            <div className="card-body">
                                {pa.approval_note && (
                                    <div className="p-3 rounded-3 mb-2"
                                         style={{ background: '#e6f4ea', border: '1px solid #a8d5b5', fontSize: 13 }}>
                                        <div className="fw-semibold mb-1" style={{ color: '#137333' }}>Approval Note</div>
                                        {pa.approval_note}
                                    </div>
                                )}
                                {pa.decline_reason && (
                                    <div className="p-3 rounded-3"
                                         style={{ background: '#fce8e6', border: '1px solid #fca5a5', fontSize: 13 }}>
                                        <div className="fw-semibold mb-1" style={{ color: '#c5221f' }}>Decline Reason</div>
                                        {pa.decline_reason}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Approval timeline */}
                    {pa.timeline?.length > 0 && (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom py-3">
                                <h6 className="fw-bold d-flex align-items-center gap-2 mb-0" style={{ fontSize: 14 }}>
                                    <Activity size={15} className="text-primary" /> Audit Timeline
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="position-relative ps-4">
                                    {pa.timeline.map((event, i) => (
                                        <div key={event.id ?? i}
                                             className="d-flex gap-3 mb-3"
                                             style={{ position: 'relative' }}>
                                            {/* connector line */}
                                            {i < pa.timeline.length - 1 && (
                                                <div style={{
                                                    position: 'absolute', left: -16, top: 24,
                                                    width: 2, height: 'calc(100% + 4px)',
                                                    background: '#e2e8f0',
                                                }} />
                                            )}
                                            {/* dot */}
                                            <div style={{
                                                position: 'absolute', left: -20, top: 4,
                                                width: 10, height: 10, borderRadius: '50%',
                                                background: timelineColor(event.event),
                                                border: '2px solid #fff',
                                                boxShadow: '0 0 0 2px ' + timelineColor(event.event),
                                            }} />
                                            <div>
                                                <div className="d-flex align-items-center gap-2 mb-1">
                                                    <span className="fw-semibold" style={{ fontSize: 13 }}>
                                                        {event.event_label ?? event.event}
                                                    </span>
                                                    {event.actor_name && (
                                                        <span className="text-muted" style={{ fontSize: 12 }}>
                                                            by {event.actor_name}
                                                        </span>
                                                    )}
                                                </div>
                                                {event.note && (
                                                    <div style={{ fontSize: 12, color: '#4a5568', lineHeight: 1.5 }}>
                                                        {event.note}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
                                                    {formatDateTime(event.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right - financial + meta */}
                <div className="col-lg-4">
                    <div style={{ position: 'sticky', top: 24 }}>

                        {/* Financial summary */}
                        <div className="card border-0 shadow-sm mb-3">
                            <div className="card-body">
                                <div className="fw-semibold mb-3 d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                                    <DollarSign size={14} className="text-primary" /> Financial Details
                                </div>
                                {[
                                    ['Estimated Amount', pa.estimated_amount ? formatCurrency(pa.estimated_amount) : '-'],
                                    ['Approved Amount',  pa.approved_amount  ? formatCurrency(pa.approved_amount)  : pa.status === 'approved' ? 'Same as estimated' : '-'],
                                    ['Validity Period',  pa.validity_days ? `${pa.validity_days} days` : '-'],
                                    ['Expires',          pa.expires_at ? formatDate(pa.expires_at) : '-'],
                                ].map(([label, value]) => (
                                    <div key={label} className="d-flex justify-content-between py-2 border-bottom" style={{ fontSize: 13 }}>
                                        <span className="text-muted">{label}</span>
                                        <span className="fw-semibold">{value}</span>
                                    </div>
                                ))}
                                {/* Approval tier indicator */}
                                <div className="mt-3 p-2 rounded-3"
                                     style={{ background: tier === 'ceo' ? '#fce8e6' : tier === 'md' ? '#fff8e1' : '#e6f4ea', fontSize: 12 }}>
                                    <div className="fw-semibold">
                                        {tier === 'ceo'      ? '🔴 CEO + MD Required'
                                         : tier === 'md'     ? '🟡 Medical Director Required'
                                         : '🟢 Standard Approval'}
                                    </div>
                                    <div className="text-muted mt-1">
                                        {tier === 'ceo'
                                            ? 'Amount > ₦2M: Desk Officer → Medical Director → CEO'
                                         : tier === 'md'
                                            ? 'Amount > ₦500k: Desk Officer → Medical Director'
                                         : 'Amount ≤ ₦500k: Authorisation Desk Officer'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Request metadata */}
                        <div className="card border-0 shadow-sm mb-3">
                            <div className="card-body">
                                <div className="fw-semibold mb-3" style={{ fontSize: 13 }}>Request Details</div>
                                {[
                                    ['Submitted',   formatDateTime(pa.created_at)],
                                    ['By',          pa.submitted_by_name ?? 'System'],
                                    ['Channel',     pa.submission_channel ?? 'HMO Portal'],
                                    ['Reviewed At', pa.reviewed_at ? formatDateTime(pa.reviewed_at) : '-'],
                                    ['Reviewed By', pa.reviewed_by_name ?? '-'],
                                ].map(([label, value]) => (
                                    <div key={label} className="d-flex justify-content-between py-1 border-bottom" style={{ fontSize: 12 }}>
                                        <span className="text-muted">{label}</span>
                                        <span className="fw-semibold text-end" style={{ maxWidth: 160 }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Linked claim */}
                        {pa.claim_id && (
                            <div className="card border-0 shadow-sm mb-3">
                                <div className="card-body d-flex align-items-center gap-3">
                                    <FileText size={18} className="text-primary" />
                                    <div className="flex-grow-1">
                                        <div style={{ fontSize: 12, color: '#718096' }}>Linked Claim</div>
                                        <div className="fw-semibold font-monospace">{pa.claim_number}</div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => navigate(`/claims/${pa.claim_id}`)}
                                    >
                                        View <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* ── Approve Modal ────────────────────────────────────────────── */}
            {approveModal && (
                <>
                    <div className="modal-backdrop fade show" />
                    <div className="modal d-block">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <CheckCircle size={16} className="text-success" />
                                        {pa.status === 'awaiting_md'  ? 'Medical Director Sign-Off' :
                                         pa.status === 'awaiting_ceo' ? 'CEO Approval Sign-Off'     : 'Approve Pre-Authorisation'}
                                    </h6>
                                    <button className="btn-close" onClick={() => setApproveModal(false)} />
                                </div>
                                <div className="modal-body">
                                    {/* Next step notice */}
                                    {tier !== 'standard' && pa.status === 'pending' && (
                                        <div className="alert alert-info py-2 mb-3" style={{ fontSize: 13 }}>
                                            <strong>Note:</strong> Your approval will escalate this to{' '}
                                            {tier === 'md' ? 'the Medical Director' : 'the Medical Director, then CEO'}{' '}
                                            for final sign-off. The Pre-Auth. code will be generated after the last approval.
                                        </div>
                                    )}

                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                                Approved Amount (₦)
                                            </label>
                                            <input
                                                type="number" className="form-control" min="0" step="100"
                                                placeholder={pa.estimated_amount ?? 'Leave blank to approve full amount'}
                                                value={approvedAmt}
                                                onChange={e => setApprovedAmt(e.target.value)}
                                            />
                                            <div className="form-text">
                                                Estimated: {pa.estimated_amount ? formatCurrency(pa.estimated_amount) : 'Not specified'}
                                                {approvedAmt && pa.estimated_amount && parseFloat(approvedAmt) < pa.estimated_amount && (
                                                    <span className="text-warning ms-2">
                                                        Reducing by {formatCurrency(pa.estimated_amount - parseFloat(approvedAmt))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                                Validity (days)
                                            </label>
                                            <input
                                                type="number" className="form-control" min="1" max="365"
                                                value={validityDays}
                                                onChange={e => setValidityDays(e.target.value)}
                                            />
                                            <div className="form-text">Code expires after this many days from issue</div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                                Clinical Note / Instructions for Provider (optional)
                                            </label>
                                            <textarea
                                                className="form-control" rows={3}
                                                placeholder="Any clinical conditions or instructions attached to this approval…"
                                                value={approveNote}
                                                onChange={e => setApproveNote(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Full approval summary */}
                                    {(pa.status === 'awaiting_md' || pa.status === 'awaiting_ceo') && (
                                        <div className="mt-3 p-3 rounded-3 bg-light border" style={{ fontSize: 12 }}>
                                            <div className="fw-semibold mb-1">Finalising approval for:</div>
                                            <div>{pa.enrollee_name} · {pa.hcp_name} · {pa.service_type_label ?? pa.service_type}</div>
                                            <div className="text-muted mt-1">Your sign-off will generate the Pre-Auth. code and make it available to the provider.</div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-light" onClick={() => setApproveModal(false)}>Cancel</button>
                                    <button
                                        className="btn btn-success d-flex align-items-center gap-2"
                                        onClick={() => approveMutation.mutate()}
                                        disabled={approveMutation.isPending}
                                    >
                                        {approveMutation.isPending
                                            ? <><span className="spinner-border spinner-border-sm" /> Processing…</>
                                            : <><CheckCircle size={15} /> Confirm Approval</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Decline Modal ────────────────────────────────────────────── */}
            {declineModal && (
                <>
                    <div className="modal-backdrop fade show" />
                    <div className="modal d-block">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <XCircle size={16} className="text-danger" />
                                        Decline Pre-Authorisation
                                    </h6>
                                    <button className="btn-close" onClick={() => setDeclineModal(false)} />
                                </div>
                                <div className="modal-body">
                                    {pa.urgency === 'emergency' && (
                                        <div className="alert alert-warning py-2 mb-3" style={{ fontSize: 13 }}>
                                            <strong>Emergency PA:</strong> Declining will flag this for audit but will NOT invalidate the claim. Document your clinical rationale clearly.
                                        </div>
                                    )}
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                        Reason for Decline <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        className="form-control" rows={4}
                                        placeholder="State clearly why this Pre-Auth. request is being declined. This will be communicated to the provider and enrollee. Minimum 20 characters."
                                        value={declineNote}
                                        onChange={e => setDeclineNote(e.target.value)}
                                    />
                                    <div className="form-text d-flex justify-content-between mt-1">
                                        <span>Be specific - vague decline reasons can be challenged at NHIA.</span>
                                        <span className={declineNote.length < 20 ? 'text-danger' : 'text-muted'}>
                                            {declineNote.length}/500
                                        </span>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-light" onClick={() => setDeclineModal(false)}>Cancel</button>
                                    <button
                                        className="btn btn-danger d-flex align-items-center gap-2"
                                        onClick={() => declineMutation.mutate()}
                                        disabled={declineNote.length < 20 || declineMutation.isPending}
                                    >
                                        {declineMutation.isPending
                                            ? <><span className="spinner-border spinner-border-sm" /> Declining…</>
                                            : <><XCircle size={15} /> Confirm Decline</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Revoke Modal ─────────────────────────────────────────────── */}
            {revokeModal && (
                <>
                    <div className="modal-backdrop fade show" />
                    <div className="modal d-block">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <XCircle size={16} className="text-warning" />
                                        Revoke Pre-Auth. Code
                                    </h6>
                                    <button className="btn-close" onClick={() => setRevokeModal(false)} />
                                </div>
                                <div className="modal-body">
                                    <div className="alert alert-warning py-2 mb-3" style={{ fontSize: 13 }}>
                                        <strong>Revoking</strong> an approved Pre-Auth. code cancels it immediately. The provider will no longer be able to use <code>{pa.pa_code}</code> to process a claim. This action is logged and irreversible.
                                    </div>
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                        Reason for Revocation <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        className="form-control" rows={3}
                                        placeholder="e.g. Enrollee coverage suspended, duplicate Pre-Auth. issued, patient no longer proceeding with treatment…"
                                        value={revokeNote}
                                        onChange={e => setRevokeNote(e.target.value)}
                                    />
                                    <div className="form-text d-flex justify-content-end mt-1">
                                        <span className={revokeNote.length < 10 ? 'text-danger' : 'text-muted'}>
                                            {revokeNote.length} chars (min 10)
                                        </span>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-light" onClick={() => setRevokeModal(false)}>Cancel</button>
                                    <button
                                        className="btn btn-warning d-flex align-items-center gap-2"
                                        onClick={() => revokeMutation.mutate()}
                                        disabled={revokeNote.length < 10 || revokeMutation.isPending}
                                    >
                                        {revokeMutation.isPending
                                            ? <><span className="spinner-border spinner-border-sm" /> Revoking…</>
                                            : <><XCircle size={15} /> Confirm Revoke</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Helper functions ───────────────────────────────────────────────────────────

function buildApprovalSteps(pa, tier) {
    const steps = [
        {
            label: 'Submitted',
            state: 'done',
            by:    pa.submitted_by_name,
            at:    pa.created_at,
        },
        {
            label: 'Desk Officer',
            state: ['awaiting_md', 'awaiting_ceo', 'approved', 'used'].includes(pa.status) ? 'done'
                 : pa.status === 'pending' ? 'current' : 'pending',
            by: pa.desk_approved_by_name,
            at: pa.desk_approved_at,
        },
    ];

    if (tier === 'md' || tier === 'ceo') {
        steps.push({
            label: 'Medical Director',
            state: ['awaiting_ceo', 'approved', 'used'].includes(pa.status) ? 'done'
                 : pa.status === 'awaiting_md' ? 'current' : 'pending',
            by: pa.md_approved_by_name,
            at: pa.md_approved_at,
        });
    }
    if (tier === 'ceo') {
        steps.push({
            label: 'CEO',
            state: ['approved', 'used'].includes(pa.status) ? 'done'
                 : pa.status === 'awaiting_ceo' ? 'current' : 'pending',
            by: pa.ceo_approved_by_name,
            at: pa.ceo_approved_at,
        });
    }
    steps.push({
        label: 'Pre-Auth. Issued',
        state: ['approved', 'used', 'expired'].includes(pa.status) ? 'done' : 'pending',
        by:    pa.pa_code,
        at:    pa.reviewed_at,
    });
    return steps;
}

function timelineColor(event) {
    if (event?.includes('approve') || event?.includes('issued')) return '#137333';
    if (event?.includes('decline') || event?.includes('reject')) return '#c5221f';
    if (event?.includes('submit'))  return '#1967d2';
    if (event?.includes('escalat')) return '#b45309';
    return '#718096';
}

function formatElapsed(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoCard({ title, icon: Icon, children }) {
    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                <h6 className="fw-semibold d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                    <Icon size={14} className="text-primary" /> {title}
                </h6>
            </div>
            <div className="card-body pt-2">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="mb-2">
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#718096', marginBottom: 2 }}>
                {label}
            </div>
            <div style={{ fontSize: 13, color: '#2d3748' }}>
                {value ?? <span className="text-muted">-</span>}
            </div>
        </div>
    );
}