import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Edit, FileText, User, Building, Calendar, DollarSign, AlertTriangle,
    RotateCcw, CheckCircle, XCircle, UserCheck, Play, Clock
} from 'lucide-react';
import {
    fetchClaim, reverseClaim, approveClaim, rejectClaim, processClaim,
    assignClaim, fetchUsers, fetchClaimTimeline, fetchFraudFlags,
    fetchClaimRisk
} from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import PaymentTimeline from '../../components/claims/PaymentTimeline';

const STATUS_COLOR = {
    submitted: 'secondary', auto_validating: 'info', auto_validated: 'info',
    flagged: 'danger', under_review: 'warning', supervisor_review: 'warning',
    approved: 'success', paid: 'primary', rejected: 'danger', reversed: 'dark',
};

export default function ClaimDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, hasPermission, loading: authLoading } = useAuth();
    
    // ── useState hooks (keep these here) ─────────────────────────────────
    const [activeTab, setActiveTab] = useState('overview');
    const [showReverseModal, setShowReverseModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [reverseReason, setReverseReason] = useState('');
    const [approveAmount, setApproveAmount] = useState('');
    const [approveNote, setApproveNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [assignUserId, setAssignUserId] = useState('');
    const [assignNote, setAssignNote] = useState('');
    const [processNote, setProcessNote] = useState('');

    const [claimRisk, setClaimRisk] = useState(null);
    const [loadingRisk, setLoadingRisk] = useState(false);

    // ── useQuery hooks (keep these here) ─────────────────────────────────
    const { data, isLoading, error } = useQuery({
        queryKey: ['claim', id],
        queryFn: () => fetchClaim(id),
        enabled: !authLoading && !!user,
    });

    const { data: timelineData } = useQuery({
        queryKey: ['claim-timeline', id],
        queryFn: () => fetchClaimTimeline(id),
        enabled: activeTab === 'timeline' && !!user,
    });

    const { data: flagsData } = useQuery({
        queryKey: ['claim-flags', id],
        queryFn: () => fetchFraudFlags(id),
        enabled: activeTab === 'fraud' && !!user,
    });

    const { data: usersData } = useQuery({
        queryKey: ['users-for-assign'],
        queryFn: () => fetchUsers({ per_page: 100 }),
        enabled: showAssignModal && !!user,
    });

    // ── useMemo hook (keep this here) ────────────────────────────────────
    const users = useMemo(() => {
        if (!usersData) return [];
        // fetchUsers returns raw axios → .data is Laravel response → .data is the array
        if (usersData?.data?.data && Array.isArray(usersData.data.data)) return usersData.data.data;
        if (usersData?.data && Array.isArray(usersData.data)) return usersData.data;
        if (Array.isArray(usersData)) return usersData;
        return [];
    }, [usersData]);

    const loadClaimRisk = async () => {
        setLoadingRisk(true);
        try {
            const res = await fetchClaimRisk(id);
            if (res.success) setClaimRisk(res);
        } catch (err) { console.error(err); }
        finally { setLoadingRisk(false); }
    };

    // REPLACE WITH (data only):
    useEffect(() => {
        if (showApproveModal && data) {
            const amount = data?.data?.data?.total_amount_claimed
                        ?? data?.data?.total_amount_claimed
                        ?? data?.total_amount_claimed
                        ?? '';
            setApproveAmount(String(amount));
        }
    }, [showApproveModal, data]);  // ← no claim

    // ── 🟢 MOVE ALL useMutation HOOKS HERE (BEFORE ANY EARLY RETURNS) ──
    const invalidateClaim = () => queryClient.invalidateQueries({ queryKey: ['claim', id] });

    const reverseMutation = useMutation({
        mutationFn: (reason) => reverseClaim(id, { reason }),
        onSuccess: () => {
            toast.success('Claim reversed successfully');
            setShowReverseModal(false);
            setReverseReason('');
            invalidateClaim();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to reverse claim');
        },
    });

    const approveMutation = useMutation({
        mutationFn: () => approveClaim(id, {
            // approved_amount: parseFloat(approveAmount) || (data?.data?.data?.total_amount_claimed || data?.total_amount_claimed || 0),
            approved_amount: parseFloat(approveAmount) || 0,
            note: approveNote,
        }),

        onSuccess: () => {
            toast.success('Claim approved successfully');
            setShowApproveModal(false);
            setApproveAmount('');
            setApproveNote('');
            invalidateClaim();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to approve claim');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: () => rejectClaim(id, { reason: rejectReason }),
        onSuccess: () => {
            toast.success('Claim rejected');
            setShowRejectModal(false);
            setRejectReason('');
            invalidateClaim();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to reject claim');
        },
    });

    const processMutation = useMutation({
        mutationFn: () => processClaim(id, { note: processNote }),
        onSuccess: () => {
            toast.success('Claim moved to Under Review');
            setShowProcessModal(false);
            setProcessNote('');
            invalidateClaim();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to process claim');
        },
    });

    const assignMutation = useMutation({
        mutationFn: () => assignClaim(id, { assignee_id: assignUserId, note: assignNote }),
        onSuccess: () => {
            toast.success('Claim assigned successfully');
            setShowAssignModal(false);
            setAssignUserId('');
            setAssignNote('');
            invalidateClaim();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to assign claim');
        },
    });

    // ── useEffect (keep this here) ───────────────────────────────────────
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, authLoading, navigate]);

    // ── EARLY RETURNS (keep these here, AFTER all hooks) ─────────────────
    if (authLoading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return null;
    }

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;
    
    const claim = data?.data?.data || data;
    
    if (!claim) return <ErrorAlert message="Claim not found" />;

    // ── Permission checks (keep these here) ──────────────────────────────
    const canReverse = hasPermission('claims.reverse') && 
    ['approved', 'paid'].includes(claim.status);
    const canApprove = hasPermission('claims.approve') && 
        ['under_review', 'supervisor_review', 'auto_validated'].includes(claim.status);
    const canReject = hasPermission('claims.reject') && 
        ['under_review', 'supervisor_review', 'auto_validated', 'flagged'].includes(claim.status);
    const canProcess = hasPermission('claims.process') && 
        ['submitted', 'auto_validated', 'auto_validating'].includes(claim.status);
    const canAssign = hasPermission('claims.assign') && 
        !['paid', 'rejected', 'reversed'].includes(claim.status);

    // ── Helper function (keep this here) ─────────────────────────────────
    const getApproveButton = () => {
        if (!canApprove) return null;
        
        const amount = claim.total_amount_claimed;
        
        if (amount <= 500000 && hasPermission('claims.approve')) {
            return (
                <button className="btn btn-success d-flex align-items-center gap-2" onClick={() => setShowApproveModal(true)}>
                    <CheckCircle size={16} /> Approve
                </button>
            );
        }
        if (amount > 500000 && amount <= 2000000 && hasPermission('claims.approve_high_value')) {
            return (
                <button className="btn btn-warning d-flex align-items-center gap-2" onClick={() => setShowApproveModal(true)}>
                    <CheckCircle size={16} /> Approve (MD Required)
                </button>
            );
        }
        if (amount > 2000000 && hasPermission('claims.approve_critical')) {
            return (
                <button className="btn btn-danger d-flex align-items-center gap-2" onClick={() => setShowApproveModal(true)}>
                    <CheckCircle size={16} /> Approve (CEO Sign-off)
                </button>
            );
        }
        return null;
    };

    return (
        <div>
            <PageHeader
                title={`Claim ${claim.claim_number}`}
                subtitle={
                    <span className="d-flex align-items-center gap-2">
                        <StatusBadge status={claim.status} color={STATUS_COLOR[claim.status]} />
                        {claim.risk_score >= 70 && (
                            <span className="badge bg-danger-subtle text-danger">
                                <AlertTriangle size={12} /> High Risk ({claim.risk_score}/100)
                            </span>
                        )}

                        {claim.risk_score !== undefined && (
                            <div className="d-flex align-items-center gap-2 ms-3">
                                <span className="badge bg-secondary">Local Risk: {claim.risk_score}/100</span>
                                <button className="btn btn-sm btn-outline-warning" onClick={loadClaimRisk} disabled={loadingRisk}>
                                    {loadingRisk ? '...' : '⚡ AI Risk'}
                                </button>
                                {claimRisk && (
                                    <span className={`badge ${claimRisk.label === 'high' ? 'bg-danger' : 'bg-warning'}`}>
                                        AI: {claimRisk.score}/100 ({claimRisk.label})
                                    </span>
                                )}
                            </div>
                        )}

                    </span>
                }
                actions={
                    <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-outline-secondary" onClick={() => navigate('/claims')}>
                            <ArrowLeft size={18} className="me-1" /> Back
                        </button>
                        
                        {canProcess && (
                            <button className="btn btn-outline-info" onClick={() => setShowProcessModal(true)}>
                                <Play size={16} className="me-1" /> Move to Review
                            </button>
                        )}
                        
                        {canAssign && (
                            <button className="btn btn-outline-primary" onClick={() => setShowAssignModal(true)}>
                                <UserCheck size={16} className="me-1" /> Assign
                            </button>
                        )}
                        
                        {getApproveButton()}
                        
                        {canReject && (
                            <button className="btn btn-outline-danger" onClick={() => setShowRejectModal(true)}>
                                <XCircle size={16} className="me-1" /> Reject
                            </button>
                        )}
                        
                        {canReverse && (
                            <button className="btn btn-outline-dark" onClick={() => setShowReverseModal(true)}>
                                <RotateCcw size={16} className="me-1" /> Reverse
                            </button>
                        )}
                    </div>
                }
            />

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                {['overview', 'items', 'documents', 'fraud', 'timeline'].map(tab => (
                    <li key={tab} className="nav-item">
                        <button
                            className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {tab}
                            {tab === 'fraud' && claim.fraud_flags?.length > 0 && (
                                <span className="badge bg-danger ms-2">{claim.fraud_flags.length}</span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>

            {/* Tab Content */}
            <div className="row">
                <div className="col-md-8">
                    {activeTab === 'overview' && (
                        <>
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h5 className="mb-0">Claim Details</h5>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <small className="text-muted d-block">Service Date</small>
                                            <strong>{formatDate(claim.service_date)}</strong>
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <small className="text-muted d-block">Submission Date</small>
                                            <strong>{formatDate(claim.submission_date)}</strong>
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <small className="text-muted d-block">Claim Type</small>
                                            <strong>{claim.claim_type}</strong>
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <small className="text-muted d-block">Risk Score</small>
                                            <strong className={claim.risk_score >= 70 ? 'text-danger' : ''}>
                                                {claim.risk_score}/100
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h5 className="mb-0">Financial Summary</h5>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-4 mb-3">
                                            <small className="text-muted d-block">Amount Claimed</small>
                                            <h4>{formatCurrency(claim.total_amount_claimed)}</h4>
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <small className="text-muted d-block">Amount Approved</small>
                                            <h4 className={claim.total_amount_approved ? 'text-success' : 'text-muted'}>
                                                {claim.total_amount_approved ? formatCurrency(claim.total_amount_approved) : '-'}
                                            </h4>
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <small className="text-muted d-block">Amount Paid</small>
                                            <h4 className={claim.total_amount_paid ? 'text-primary' : 'text-muted'}>
                                                {claim.total_amount_paid ? formatCurrency(claim.total_amount_paid) : '-'}
                                            </h4>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Timeline  */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h5 className="mb-0">Payment Timeline</h5>
                                </div>
                                <div className="card-body">
                                    <PaymentTimeline claimId={claim.id} />
                                </div>
                            </div>

                            {/* Notes */}
                            {(claim.reviewer_notes || claim.rejection_reason) && (
                                <div className="card mb-4">
                                    <div className="card-header">
                                        <h5 className="mb-0">Notes & Reasons</h5>
                                    </div>
                                    <div className="card-body">
                                        {claim.reviewer_notes && (
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Reviewer Notes</small>
                                                <p className="mb-0">{claim.reviewer_notes}</p>
                                            </div>
                                        )}
                                        {claim.rejection_reason && (
                                            <div>
                                                <small className="text-muted d-block">Rejection Reason</small>
                                                <p className="mb-0 text-danger">{claim.rejection_reason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'items' && (
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Claim Items</h5>
                            </div>
                            <div className="card-body">
                                {claim.items?.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Service</th>
                                                    <th>Qty</th>
                                                    <th>Unit Price</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {claim.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{item.service_name || item.service_code}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{formatCurrency(item.unit_price)}</td>
                                                        <td>{formatCurrency(item.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <th colSpan="3" className="text-end">Total:</th>
                                                    <th>{formatCurrency(claim.total_amount_claimed)}</th>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-muted mb-0">No claim items found.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Documents</h5>
                            </div>
                            <div className="card-body">
                                {claim.documents?.length > 0 ? (
                                    <div className="list-group">
                                        {claim.documents.map(doc => (
                                            <a
                                                key={doc.id}
                                                href={`/api/v1/claims/${id}/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="list-group-item list-group-item-action d-flex align-items-center"
                                            >
                                                <FileText size={16} className="me-2" />
                                                <span>{doc.filename || 'Document'}</span>
                                                <small className="text-muted ms-auto">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </small>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted mb-0">No documents uploaded.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'fraud' && (
                        <div className="card border-danger">
                            <div className="card-header bg-danger text-white">
                                <h5 className="mb-0">Fraud Flags</h5>
                            </div>
                            <div className="card-body">
                                {claim.fraud_flags?.length > 0 ? (
                                    claim.fraud_flags.map((flag, idx) => (
                                        <div key={idx} className="mb-3 pb-2 border-bottom">
                                            <div className="d-flex justify-content-between">
                                                <strong>{flag.flag_type}</strong>
                                                <span className="badge bg-danger">{flag.score}</span>
                                            </div>
                                            <p className="mb-1">{flag.description}</p>
                                            {flag.status !== 'open' && (
                                                <small className="text-muted">
                                                    Reviewed by: {flag.reviewed_by?.name} on {formatDate(flag.reviewed_at)}
                                                </small>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted mb-0">No fraud flags detected.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Timeline</h5>
                            </div>
                            <div className="card-body">
                                {timelineData?.data?.length > 0 ? (
                                    <div className="timeline">
                                        {timelineData.data.map((log, idx) => (
                                            <div key={log.id} className="d-flex gap-3 mb-3">
                                                <div className="flex-shrink-0">
                                                    <Clock size={16} className="text-muted" />
                                                </div>
                                                <div>
                                                    <p className="mb-1">
                                                        <strong>{log.from_status} → {log.to_status}</strong>
                                                        <br />
                                                        <small className="text-muted">
                                                            {formatDateTime(log.created_at)} by {log.user?.name || log.triggered_by}
                                                        </small>
                                                    </p>
                                                    {log.note && <p className="mb-0 small">{log.note}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted mb-0">No timeline entries.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="col-md-4">
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Enrollee</h5>
                        </div>
                        <div className="card-body">
                            {claim.enrollee && (
                                <>
                                    <p className="mb-1">
                                        <User size={16} className="text-muted me-2" />
                                        {claim.enrollee.first_name} {claim.enrollee.last_name}
                                    </p>
                                    <p className="mb-0">
                                        <small className="text-muted">ID: {claim.enrollee.enrollee_id}</small>
                                    </p>
                                    {claim.enrollee.benefit_balance !== undefined && (
                                        <p className="mt-2 mb-0">
                                            <small className="text-muted">Benefit Balance</small>
                                            <br />
                                            <strong>{formatCurrency(claim.enrollee.benefit_balance)}</strong>
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Healthcare Provider</h5>
                        </div>
                        <div className="card-body">
                            {claim.hcp && (
                                <>
                                    <p className="mb-1">
                                        <Building size={16} className="text-muted me-2" />
                                        {claim.hcp.name}
                                    </p>
                                    <p className="mb-0">
                                        <small className="text-muted">Code: {claim.hcp.hcp_code}</small>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {claim.active_assignment && (
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Assignment</h5>
                            </div>
                            <div className="card-body">
                                <p className="mb-1">
                                    <UserCheck size={16} className="text-muted me-2" />
                                    {claim.active_assignment.assigned_to?.name}
                                </p>
                                {claim.active_assignment.note && (
                                    <small className="text-muted">{claim.active_assignment.note}</small>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reverse Modal */}
            {showReverseModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reverse Claim #{claim.claim_number}</h5>
                                <button className="btn-close" onClick={() => setShowReverseModal(false)} />
                            </div>
                            <div className="modal-body">
                                <p className="text-muted">
                                    This will mark the current claim as <strong>reversed</strong>. 
                                    A new corrected claim will need to be submitted.
                                </p>
                                <div className="alert alert-warning">
                                    <small>
                                        <strong>Note:</strong> Reversal is permanent and creates an audit trail. 
                                        If this claim was already paid, finance will be notified.
                                    </small>
                                </div>
                                <label className="form-label fw-semibold">
                                    Reason for reversal <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={reverseReason}
                                    onChange={(e) => setReverseReason(e.target.value)}
                                    placeholder="Explain why this claim is being reversed..."
                                />
                                <small className="text-muted">
                                    Minimum 10 characters. This will be recorded in the audit log.
                                </small>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light" onClick={() => setShowReverseModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => reverseMutation.mutate(reverseReason)}
                                    disabled={reverseReason.length < 20 || reverseMutation.isPending}
                                >
                                    {reverseMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Modal */}
            {showApproveModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Approve Claim #{claim.claim_number}</h5>
                                <button className="btn-close" onClick={() => setShowApproveModal(false)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Approved Amount</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={approveAmount}
                                        onChange={(e) => setApproveAmount(e.target.value)}
                                        placeholder={claim.total_amount_claimed}
                                    />
                                    <small className="text-muted">
                                        Claimed: {formatCurrency(claim.total_amount_claimed)}
                                    </small>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Note (optional)</label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        value={approveNote}
                                        onChange={(e) => setApproveNote(e.target.value)}
                                        placeholder="Add any notes about this approval..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light" onClick={() => setShowApproveModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-success"
                                    onClick={() => approveMutation.mutate()}
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reject Claim #{claim.claim_number}</h5>
                                <button className="btn-close" onClick={() => setShowRejectModal(false)} />
                            </div>
                            <div className="modal-body">
                                <label className="form-label fw-semibold">
                                    Reason for rejection <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    className="form-control"
                                    rows={4}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Explain why this claim is being rejected..."
                                />
                                <small className="text-muted">
                                    Minimum 10 characters. This will be recorded in the audit log.
                                </small>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light" onClick={() => setShowRejectModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => rejectMutation.mutate()}
                                    disabled={rejectReason.length < 10 || rejectMutation.isPending}
                                >
                                    {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Process Modal */}
            {showProcessModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Move Claim to Under Review</h5>
                                <button className="btn-close" onClick={() => setShowProcessModal(false)} />
                            </div>
                            <div className="modal-body">
                                <label className="form-label fw-semibold">Note (optional)</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={processNote}
                                    onChange={(e) => setProcessNote(e.target.value)}
                                    placeholder="Any notes about moving this claim to review..."
                                />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light" onClick={() => setShowProcessModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-info"
                                    onClick={() => processMutation.mutate()}
                                    disabled={processMutation.isPending}
                                >
                                    {processMutation.isPending ? 'Processing...' : 'Move to Review'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {showAssignModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Assign Claim to Officer</h5>
                                <button className="btn-close" onClick={() => setShowAssignModal(false)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">
                                        Select Officer <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={assignUserId}
                                        onChange={(e) => setAssignUserId(e.target.value)}
                                    >
                                        <option value="">- Choose an officer -</option>
                                        {users.length > 0 ? (
                                            users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))
                                        ) : (
                                            <option disabled>Loading users...</option>
                                        )}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Note (optional)</label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        value={assignNote}
                                        onChange={(e) => setAssignNote(e.target.value)}
                                        placeholder="Instructions for the assigned officer..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-light" onClick={() => setShowAssignModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => assignMutation.mutate()}
                                    disabled={!assignUserId || assignMutation.isPending}
                                >
                                    {assignMutation.isPending ? 'Assigning...' : 'Assign Claim'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}