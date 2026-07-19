/**
 * FILE: resources/js/pages/finance/PaymentBatchDetail.jsx
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, CheckCircle, Send, Download, Clock,
    Building, FileText, AlertTriangle, Wallet, Users,
} from 'lucide-react';
import {
    fetchPaymentBatch,
    submitPaymentBatch,
    approvePaymentBatch,
    exportBankFile,
} from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const BATCH_STATUS_COLOR = {
    draft: 'secondary', submitted: 'warning', approved: 'primary',
    processing: 'info', completed: 'success', failed: 'danger', reversed: 'dark',
};

const PAYMENT_STATUS_COLOR = {
    pending: 'warning', paid: 'success', failed: 'danger',
};

export default function PaymentBatchDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();
    const [showApproveModal, setShowApproveModal] = useState(false);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['payment-batch', id],
        queryFn: () => fetchPaymentBatch(id),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payment-batch', id] });

    const submitMutation = useMutation({
        mutationFn: () => submitPaymentBatch(id),
        onSuccess: (res) => {
            toast.success(res.data?.message ?? 'Batch submitted for approval.');
            invalidate();
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to submit batch.'),
    });

    const approveMutation = useMutation({
        mutationFn: () => approvePaymentBatch(id, {}),
        onSuccess: (res) => {
            toast.success(res.data?.message ?? 'Batch approved. Claims marked paid.');
            setShowApproveModal(false);
            invalidate();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message ?? 'Failed to approve batch.');
            setShowApproveModal(false);
        },
    });

    const exportMutation = useMutation({
        mutationFn: () => exportBankFile(id),
        onSuccess: (res) => {
            const url = res.data?.download_url;
            if (url) {
                const a = document.createElement('a');
                a.href = url;
                a.download = res.data?.filename ?? 'bank-export.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success('Bank export file downloaded.');
            } else {
                toast.success('Export generated.');
            }
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Export failed.'),
    });

    if (isLoading) return <LoadingSpinner />;
    if (error)     return <ErrorAlert message={error.message} onRetry={refetch} />;

    const batch = data?.data?.data ?? data?.data ?? data;
    if (!batch) return <ErrorAlert message="Batch not found." />;

    const status      = batch.status ?? '';
    const isDraft     = status === 'draft';
    const isSubmitted = status === 'submitted';
    const isCompleted = status === 'completed';

    const canSubmit  = hasPermission('finance.batch_create') && isDraft;
    const canApprove = hasPermission('finance.batch_approve') && isSubmitted;
    const canExport  = hasPermission('finance.batch_approve') && (isSubmitted || isCompleted);

    // Group payments by HCP
    const payments = batch.payments ?? [];
    const byHcp = payments.reduce((acc, p) => {
        const key = p.hcp?.id ?? 'unknown';
        if (!acc[key]) acc[key] = { hcp: p.hcp, payments: [], total: 0 };
        acc[key].payments.push(p);
        acc[key].total += parseFloat(p.amount ?? 0);
        return acc;
    }, {});

    return (
        <div>
            <PageHeader
                title={`Batch ${batch.batch_number}`}
                subtitle={
                    <span className="d-flex align-items-center gap-2">
                        <StatusBadge status={status} color={BATCH_STATUS_COLOR[status] ?? 'secondary'} />
                        <span className="text-muted" style={{ fontSize: 13 }}>
                            {batch.claim_count} claim{batch.claim_count !== 1 ? 's' : ''} •{' '}
                            {batch.provider_count} provider{batch.provider_count !== 1 ? 's' : ''}
                        </span>
                    </span>
                }
                actions={
                    <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-outline-secondary" onClick={() => navigate('/finance')}>
                            <ArrowLeft size={16} className="me-1" /> Back
                        </button>

                        {canExport && (
                            <button
                                className="btn btn-outline-dark d-flex align-items-center gap-2"
                                onClick={() => exportMutation.mutate()}
                                disabled={exportMutation.isPending}
                            >
                                <Download size={15} />
                                {exportMutation.isPending ? 'Generating…' : 'Bank Export'}
                            </button>
                        )}

                        {canSubmit && (
                            <button
                                className="btn btn-warning d-flex align-items-center gap-2"
                                onClick={() => submitMutation.mutate()}
                                disabled={submitMutation.isPending}
                            >
                                <Send size={15} />
                                {submitMutation.isPending ? 'Submitting…' : 'Submit for Approval'}
                            </button>
                        )}

                        {canApprove && (
                            <button
                                className="btn btn-success d-flex align-items-center gap-2"
                                onClick={() => setShowApproveModal(true)}
                            >
                                <CheckCircle size={15} /> Approve & Mark Paid
                            </button>
                        )}
                    </div>
                }
            />

            {/* KPI strip */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'Total Amount',   value: formatCurrency(batch.total_amount),  icon: <Wallet size={18} />,   color: '#5e35b1', bg: '#f3e8fd' },
                    { label: 'Claims',          value: batch.claim_count,                   icon: <FileText size={18} />, color: '#1967d2', bg: '#e8f0fe' },
                    { label: 'Providers',       value: batch.provider_count,                icon: <Building size={18} />, color: '#137333', bg: '#e6f4ea' },
                    { label: 'Created',         value: formatDate(batch.created_at),        icon: <Clock size={18} />,    color: '#b05e00', bg: '#fef7e0' },
                ].map(k => (
                    <div key={k.label} className="col-md-3 col-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body d-flex align-items-center gap-3 py-3">
                                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                     style={{ width: 44, height: 44, background: k.bg, color: k.color }}>
                                    {k.icon}
                                </div>
                                <div>
                                    <div className="text-muted" style={{ fontSize: 11 }}>{k.label}</div>
                                    <div className="fw-bold" style={{ fontSize: 18, color: k.color, lineHeight: 1.2 }}>{k.value}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4">
                {/* Payments by HCP */}
                <div className="col-md-8">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
                            <h6 className="mb-0 fw-semibold">Provider Payments</h6>
                            <span className="badge bg-light text-dark border">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="card-body p-0">
                            {payments.length === 0 ? (
                                <div className="py-5 text-center text-muted">
                                    <Users size={32} className="mb-2 opacity-25" />
                                    <p className="mb-0">No payments in this batch.</p>
                                </div>
                            ) : (
                                Object.values(byHcp).map(({ hcp, payments: hcpPayments, total }) => (
                                    <div key={hcp?.id ?? 'unknown'} className="border-bottom">
                                        {/* HCP header row */}
                                        <div className="d-flex align-items-center justify-content-between px-4 py-2"
                                             style={{ background: '#f8fafc' }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <Building size={14} className="text-muted" />
                                                <span className="fw-semibold" style={{ fontSize: 13 }}>
                                                    {hcp?.name ?? 'Unknown Provider'}
                                                </span>
                                                <span className="font-monospace text-muted" style={{ fontSize: 11 }}>
                                                    {hcp?.hcp_code}
                                                </span>
                                            </div>
                                            <span className="fw-bold" style={{ color: '#5e35b1', fontSize: 14 }}>
                                                {formatCurrency(total)}
                                            </span>
                                        </div>

                                        {/* Individual claims */}
                                        <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-4">Claim No.</th>
                                                    <th className="text-end">Amount</th>
                                                    <th className="text-center">Status</th>
                                                    <th>Reference</th>
                                                    <th>Paid At</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {hcpPayments.map(p => (
                                                    <tr key={p.id}>
                                                        <td className="ps-4 font-monospace">
                                                            {p.claim?.claim_number ?? `#${p.claim_id}`}
                                                        </td>
                                                        <td className="text-end fw-semibold">
                                                            {formatCurrency(p.amount)}
                                                        </td>
                                                        <td className="text-center">
                                                            <StatusBadge
                                                                status={p.status}
                                                                color={PAYMENT_STATUS_COLOR[p.status] ?? 'secondary'}
                                                            />
                                                        </td>
                                                        <td className="font-monospace text-muted">
                                                            {p.payment_reference ?? '-'}
                                                        </td>
                                                        <td className="text-muted">
                                                            {p.paid_at ? formatDateTime(p.paid_at) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar - meta */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="mb-0 fw-semibold">Batch Info</h6>
                        </div>
                        <div className="card-body">
                            {[
                                { label: 'Batch Number',  value: batch.batch_number },
                                { label: 'Status',        value: <StatusBadge status={status} color={BATCH_STATUS_COLOR[status]} /> },
                                { label: 'Description',   value: batch.description },
                                { label: 'Created By',    value: batch.created_by?.name ?? '-' },
                                { label: 'Created At',    value: formatDateTime(batch.created_at) },
                                { label: 'Approved By',   value: batch.approved_by?.name ?? '-' },
                                { label: 'Approved At',   value: batch.approved_at ? formatDateTime(batch.approved_at) : '-' },
                                { label: 'Processed At',  value: batch.processed_at ? formatDateTime(batch.processed_at) : '-' },
                            ].map(({ label, value }) => (
                                <div key={label} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                    <small className="text-muted">{label}</small>
                                    <span style={{ fontSize: 13 }}>{value ?? '-'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Workflow guide */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="mb-0 fw-semibold">Workflow</h6>
                        </div>
                        <div className="card-body p-0">
                            {[
                                { s: 'draft',     label: 'Draft - review claims' },
                                { s: 'submitted', label: 'Submitted - awaiting approval' },
                                { s: 'completed', label: 'Completed - claims marked paid' },
                            ].map(({ s, label }) => (
                                <div key={s} className={`d-flex align-items-center gap-3 px-3 py-2 border-bottom ${status === s ? 'bg-light' : ''}`}>
                                    <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}
                                         style={{
                                             width: 28, height: 28,
                                             background: status === s ? '#1967d2' : (
                                                 ['completed','approved'].includes(status) && ['draft','submitted'].includes(s) ? '#e6f4ea' : '#f1f3f4'
                                             ),
                                             color: status === s ? '#fff' : '#888',
                                             fontSize: 11,
                                         }}>
                                        {status === s ? '●' : '○'}
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: status === s ? 600 : 400 }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Approve confirmation modal */}
            {showApproveModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Approve Batch {batch.batch_number}</h5>
                                <button className="btn-close" onClick={() => setShowApproveModal(false)} />
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning d-flex gap-2 align-items-start">
                                    <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
                                    <div>
                                        <strong>This action cannot be undone.</strong>
                                        <p className="mb-0 mt-1" style={{ fontSize: 13 }}>
                                            Approving will mark all <strong>{batch.claim_count} claim{batch.claim_count !== 1 ? 's' : ''}</strong> as <strong>paid</strong> and
                                            create ledger debit entries totalling <strong>{formatCurrency(batch.total_amount)}</strong>.
                                        </p>
                                    </div>
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
                                    {approveMutation.isPending ? 'Processing…' : 'Confirm Approval'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}