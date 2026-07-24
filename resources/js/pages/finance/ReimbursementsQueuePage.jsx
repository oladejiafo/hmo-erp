import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReimbursements, approveReimbursement, rejectReimbursement, markReimbursementPaid } from '../../api/index';
import { formatCurrency, formatDate } from '../../utils/format';
import { Filter, FileText, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';

const STATUS_COLORS = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    paid: 'primary',
};

const STATUS_LABELS = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
};

export default function ReimbursementsQueuePage() {
    const [statusFilter, setStatusFilter] = useState('');
    const [openId, setOpenId] = useState(null);
    const qc = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['staff-reimbursements', statusFilter],
        queryFn: () => fetchReimbursements({ status: statusFilter || undefined }),
    });

    const rows = data?.data ?? [];
    const invalidate = () => qc.invalidateQueries({ queryKey: ['staff-reimbursements'] });

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    // Calculate summary stats
    const pendingCount = rows.filter(r => r.status === 'pending').length;
    const approvedCount = rows.filter(r => r.status === 'approved').length;
    const paidCount = rows.filter(r => r.status === 'paid').length;
    const totalAmount = rows.reduce((sum, r) => sum + (r.amount_requested || 0), 0);

    return (
        <div>
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h1 className="h4 fw-bold mb-1">Reimbursement Requests</h1>
                    <p className="text-muted" style={{ fontSize: 13 }}>
                        Review and process enrollee reimbursement requests
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex align-items-center gap-3 py-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center"
                                 style={{ width: 44, height: 44, background: '#fef7e0', color: '#b05e00', flexShrink: 0 }}>
                                <Clock size={18} />
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: 11 }}>Pending</div>
                                <div className="fw-bold" style={{ fontSize: 20, color: '#b05e00', lineHeight: 1.2 }}>{pendingCount}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex align-items-center gap-3 py-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center"
                                 style={{ width: 44, height: 44, background: '#e6f4ea', color: '#137333', flexShrink: 0 }}>
                                <CheckCircle size={18} />
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: 11 }}>Approved</div>
                                <div className="fw-bold" style={{ fontSize: 20, color: '#137333', lineHeight: 1.2 }}>{approvedCount}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex align-items-center gap-3 py-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center"
                                 style={{ width: 44, height: 44, background: '#e8f0fe', color: '#0f4c81', flexShrink: 0 }}>
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: 11 }}>Total Amount</div>
                                <div className="fw-bold" style={{ fontSize: 20, color: '#0f4c81', lineHeight: 1.2 }}>
                                    {formatCurrency(totalAmount)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex align-items-center gap-3 py-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center"
                                 style={{ width: 44, height: 44, background: '#fce8e6', color: '#c5221f', flexShrink: 0 }}>
                                <XCircle size={18} />
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: 11 }}>Rejected</div>
                                <div className="fw-bold" style={{ fontSize: 20, color: '#c5221f', lineHeight: 1.2 }}>
                                    {rows.filter(r => r.status === 'rejected').length}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-body py-2">
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <Filter size={14} className="text-muted" />
                        <span className="text-muted me-1" style={{ fontSize: 12 }}>Status:</span>
                        {['', 'pending', 'approved', 'rejected', 'paid'].map(s => (
                            <button
                                key={s}
                                className={`btn btn-sm rounded-pill ${statusFilter === s ? 'btn-primary' : 'btn-outline-secondary'}`}
                                style={{ fontSize: 11 }}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                        <span className="ms-auto text-muted" style={{ fontSize: 12 }}>
                            {rows.length} requests
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {rows.length === 0 ? (
                        <div className="py-5 text-center text-muted">
                            <FileText size={36} className="mb-2 opacity-25" />
                            <p className="mb-0">No reimbursement requests found.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12 }}>Number</th>
                                        <th style={{ fontSize: 12 }}>Enrollee</th>
                                        <th style={{ fontSize: 12 }} className="text-end">Amount</th>
                                        <th style={{ fontSize: 12 }}>Status</th>
                                        <th style={{ fontSize: 12 }}>Date</th>
                                        <th style={{ fontSize: 12 }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(r => (
                                        <React.Fragment key={r.id}>
                                            <tr 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                                            >
                                                <td className="font-monospace" style={{ fontSize: 12 }}>
                                                    {r.reimbursement_number}
                                                </td>
                                                <td style={{ fontSize: 13 }}>
                                                    {r.enrollee_name || `${r.enrollee?.first_name} ${r.enrollee?.last_name}`}
                                                </td>
                                                <td className="text-end fw-bold" style={{ fontSize: 13 }}>
                                                    {formatCurrency(r.amount_requested)}
                                                </td>
                                                <td>
                                                    <StatusBadge 
                                                        status={r.status} 
                                                        color={STATUS_COLORS[r.status] || 'secondary'}
                                                        label={STATUS_LABELS[r.status] || r.status}
                                                    />
                                                </td>
                                                <td style={{ fontSize: 12 }}>{formatDate(r.created_at)}</td>
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-outline-primary py-0" 
                                                        style={{ fontSize: 11 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenId(openId === r.id ? null : r.id);
                                                        }}
                                                    >
                                                        {openId === r.id ? 'Close' : 'Review'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {openId === r.id && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: 0 }}>
                                                        <RowDetail row={r} onChange={invalidate} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RowDetail({ row, onChange }) {
    const [amount, setAmount] = useState(row.amount_requested);
    const [notes, setNotes] = useState('');
    const [ref, setRef] = useState('');

    const approveMutation = useMutation({ 
        mutationFn: () => approveReimbursement(row.id, amount, notes), 
        onSuccess: onChange 
    });
    const rejectMutation = useMutation({ 
        mutationFn: () => rejectReimbursement(row.id, notes), 
        onSuccess: onChange 
    });
    const paidMutation = useMutation({ 
        mutationFn: () => markReimbursementPaid(row.id, ref), 
        onSuccess: onChange 
    });

    return (
        <div className="p-3 bg-light">
            <div className="row g-2 align-items-end">
                <div className="col-12">
                    <p className="mb-2" style={{ fontSize: 13 }}>
                        <strong>Reason:</strong> {row.reason}
                    </p>
                    {row.reviewer_notes && (
                        <p className="mb-2" style={{ fontSize: 12, color: '#718096' }}>
                            <strong>Staff note:</strong> {row.reviewer_notes}
                        </p>
                    )}
                </div>
                
                {row.status === 'pending' && (
                    <>
                        <div className="col-md-3">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#4a5568' }}>
                                Approved Amount
                            </label>
                            <input 
                                type="number" 
                                className="form-control form-control-sm" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#4a5568' }}>
                                Notes
                            </label>
                            <input 
                                className="form-control form-control-sm" 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                placeholder="Optional notes" 
                            />
                        </div>
                        <div className="col-md-6 d-flex gap-2">
                            <button 
                                className="btn btn-sm btn-success" 
                                onClick={() => approveMutation.mutate()}
                                disabled={!amount || approveMutation.isPending}
                            >
                                {approveMutation.isPending ? 'Approving...' : 'Approve'}
                            </button>
                            <button 
                                className="btn btn-sm btn-danger" 
                                onClick={() => rejectMutation.mutate()}
                                disabled={!notes || rejectMutation.isPending}
                            >
                                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                    </>
                )}

                {row.status === 'approved' && (
                    <>
                        <div className="col-md-3">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: '#4a5568' }}>
                                Payment Reference
                            </label>
                            <input 
                                className="form-control form-control-sm" 
                                value={ref} 
                                onChange={e => setRef(e.target.value)} 
                                placeholder="Enter payment ref" 
                            />
                        </div>
                        <div className="col-md-3">
                            <button 
                                className="btn btn-sm btn-primary" 
                                onClick={() => paidMutation.mutate()}
                                disabled={!ref || paidMutation.isPending}
                            >
                                {paidMutation.isPending ? 'Processing...' : 'Mark Paid'}
                            </button>
                        </div>
                    </>
                )}

                {row.status === 'paid' && (
                    <div className="col-12">
                        <span className="badge bg-success">Paid</span>
                        {row.payment_reference && (
                            <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                                Ref: {row.payment_reference}
                            </span>
                        )}
                        {row.paid_at && (
                            <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                                Paid: {formatDate(row.paid_at)}
                            </span>
                        )}
                    </div>
                )}

                {row.status === 'rejected' && (
                    <div className="col-12">
                        <span className="badge bg-danger">Rejected</span>
                    </div>
                )}
            </div>
        </div>
    );
}