import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, FileText, User, Building, Calendar, DollarSign, AlertTriangle, RotateCcw } from 'lucide-react';
import { fetchClaim, reverseClaim } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDate } from '../../utils/format';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function ClaimDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { loading: authLoading } = useAuth();
    const [showReverseModal, setShowReverseModal] = useState(false);
    const [reverseReason, setReverseReason] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['claim', id],
        queryFn: () => fetchClaim(id),
        enabled: !authLoading,
    });

    const reverseMutation = useMutation({
        mutationFn: (reason) => reverseClaim(id, { reason }),
        onSuccess: () => {
            toast.success('Claim reversed successfully');
            setShowReverseModal(false);
            queryClient.invalidateQueries({ queryKey: ['claim', id] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to reverse claim');
        },
    });
    if (authLoading) return <LoadingSpinner />;
    const claim = data?.data?.data || data;

    const handleReverse = () => {
        if (reverseReason.length < 10) {
            toast.error('Please provide a detailed reason (minimum 10 characters)');
            return;
        }
        reverseMutation.mutate(reverseReason);
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;
    if (!claim) return <ErrorAlert message="Claim not found" />;

    // Check if claim can be reversed (approved or paid claims)
    const canReverse = (claim.status === 'approved' || claim.status === 'paid');

    return (
        <div>
            <PageHeader
                title={`Claim ${claim.claim_number}`}
                actions={
                    <>
                        <button
                            className="btn btn-outline-secondary me-2"
                            onClick={() => navigate('/claims')}
                        >
                            <ArrowLeft size={18} className="me-1" />
                            Back
                        </button>
                        {canReverse && (
                            <button
                                className="btn btn-outline-danger"
                                onClick={() => setShowReverseModal(true)}
                            >
                                <RotateCcw size={18} className="me-1" />
                                Reverse
                            </button>
                        )}
                    </>
                }
            />

            <div className="row">
                <div className="col-md-8">
                    <div className="card mb-4">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Claim Details</h5>
                            <StatusBadge status={claim.status} />
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

                    <div className="card mb-4">
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

                    {claim.fraud_flags?.length > 0 && (
                        <div className="card border-danger">
                            <div className="card-header bg-danger text-white">
                                <h5 className="mb-0 d-flex align-items-center gap-2">
                                    <AlertTriangle size={16} /> Fraud Flags
                                </h5>
                            </div>
                            <div className="card-body">
                                {claim.fraud_flags.map((flag, idx) => (
                                    <div key={idx} className="mb-2 pb-2 border-bottom">
                                        <p className="mb-1"><strong>{flag.flag_type}</strong></p>
                                        <p className="mb-0 small">{flag.description}</p>
                                    </div>
                                ))}
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
                                <button
                                    className="btn btn-light"
                                    onClick={() => setShowReverseModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleReverse}
                                    disabled={reverseReason.length < 10 || reverseMutation.isPending}
                                >
                                    {reverseMutation.isPending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" />
                                            Reversing...
                                        </>
                                    ) : (
                                        'Confirm Reversal'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}