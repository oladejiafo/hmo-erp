// ============================================================
// FILE: resources/js/pages/finance/FinancePage.jsx
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Plus, Download } from 'lucide-react';
import { fetchPaymentBatches, createPaymentBatch } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

const BATCH_STATUS_COLOR = {
    draft: 'secondary', submitted: 'warning', approved: 'primary',
    processing: 'info', completed: 'success', failed: 'danger', reversed: 'dark',
};

export default function FinancePage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useQuery({
        queryKey: ['batches', page],
        queryFn:  () => fetchPaymentBatches({ page }),
        keepPreviousData: true,
    });

    const createMutation = useMutation({
        mutationFn: () => createPaymentBatch({}),
        onSuccess: (res) => {
            toast.success(`Batch ${res.data.data.batch_number} created.`);
            qc.invalidateQueries({ queryKey: ['batches'] });
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to create batch.'),
    });

    if (error) return <ErrorAlert error={error} />;

    const batches = data?.data?.data ?? [];

    return (
        <div>
            <PageHeader
                title="Finance & Payments"
                subtitle="Manage payment batches and provider remittances"
                actions={
                    hasPermission('finance.batch_create') && (
                        <button className="btn btn-primary d-flex align-items-center gap-2"
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending}>
                            {createMutation.isPending
                                ? <><span className="spinner-border spinner-border-sm" />Creating...</>
                                : <><Plus size={16} /> New Batch from Approved Claims</>}
                        </button>
                    )
                }
            />

            {/* Summary cards */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'Draft Batches',   key: 'draft',     color: '#6c757d' },
                    { label: 'Pending Approval', key: 'submitted', color: '#b05e00' },
                    { label: 'Completed',        key: 'completed', color: '#137333' },
                ].map(item => (
                    <div className="col-md-4" key={item.key}>
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <div className="text-muted mb-1" style={{ fontSize: 12 }}>{item.label}</div>
                                <div className="fw-bold" style={{ fontSize: 22, color: item.color }}>
                                    {batches.filter(b => b.status === item.key).length}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-body">
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ fontSize: 12 }}>Batch No.</th>
                                        <th style={{ fontSize: 12 }}>Claims</th>
                                        <th style={{ fontSize: 12 }}>Providers</th>
                                        <th style={{ fontSize: 12 }}>Total Amount</th>
                                        <th style={{ fontSize: 12 }}>Created</th>
                                        <th style={{ fontSize: 12 }}>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => (
                                        <tr key={b.id} className="cursor-pointer"
                                            onClick={() => navigate(`/finance/batches/${b.id}`)}>
                                            <td className="font-monospace" style={{ fontSize: 12 }}>{b.batch_number}</td>
                                            <td style={{ fontSize: 12 }}>{b.claim_count}</td>
                                            <td style={{ fontSize: 12 }}>{b.provider_count}</td>
                                            <td style={{ fontSize: 13, fontWeight: 600 }}>
                                                {formatCurrency(b.total_amount)}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{formatDateTime(b.created_at)}</td>
                                            <td>
                                                <StatusBadge
                                                    status={b.status}
                                                    color={BATCH_STATUS_COLOR[b.status] ?? 'secondary'}
                                                    label={b.status_label ?? b.status}
                                                />
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-primary py-0" style={{ fontSize: 11 }}
                                                        onClick={e => { e.stopPropagation(); navigate(`/finance/batches/${b.id}`); }}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Pagination meta={data?.meta} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}