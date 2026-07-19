/**
 * FILE LOCATION: resources/js/pages/finance/capitation/RatesTab.jsx
 *
 * Renders inside CapitationListPage's "HCP Rates" tab.
 * Lists all active capitation rates. Allows Finance to set/update
 * the agreed monthly rate per HCP (principal + dependant).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Plus, Edit2, Building2, AlertCircle } from 'lucide-react';
// import { fetchCapitationRates, saveCapitationRate, fetchHCPs } from '../../../api/index';

import { 
    fetchCapitationRates, 
    createCapitationRate as saveCapitationRate,  // alias
    fetchHCPs,
    updateCapitationRate, 
    deleteCapitationRate 
} from '../../../api/index';

import { LoadingSpinner, ErrorAlert, Pagination } from '../../../components/ui/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { useAuth } from '../../../contexts/AuthContext';

export default function RatesTab() {
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const [page, setPage] = useState(1);
    const [editRate, setEditRate] = useState(null);   // null | rate-object (or {} for new)
    const canManage = hasPermission('finance.capitation');

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey:  ['capitation-rates', page],
        queryFn:   () => fetchCapitationRates({ page, per_page: 30, active_only: false }),
        keepPreviousData: true,
    });

    if (isLoading) return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body py-5"><LoadingSpinner /></div></div>;
    if (isError)   return <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}><div className="card-body"><ErrorAlert message="Failed to load rates." onRetry={refetch} /></div></div>;

    const rates = data?.data  ?? [];

    return (
        <>
            <div className="card border-0 shadow-sm" style={{ borderRadius: '0 8px 8px 8px' }}>
                <div className="card-header bg-white d-flex align-items-center justify-content-between py-3">
                    <div>
                        <span className="fw-semibold" style={{ fontSize: 14 }}>HCP Capitation Rates</span>
                        <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                            Monthly agreed rate per enrolled member
                        </span>
                    </div>
                    {canManage && (
                        <button
                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
                            onClick={() => setEditRate({})}
                        >
                            <Plus size={13} /> Set Rate
                        </button>
                    )}
                </div>

                {rates.length === 0 ? (
                    <div className="card-body text-center py-5 text-muted">
                        <Building2 size={36} className="mb-3 opacity-25" />
                        <p className="mb-1 fw-semibold">No capitation rates configured.</p>
                        <p style={{ fontSize: 13 }}>
                            Set a rate for each HCP before generating a run.
                        </p>
                        {canManage && (
                            <button
                                className="btn btn-sm btn-primary mt-2"
                                onClick={() => setEditRate({})}
                            >
                                <Plus size={13} className="me-1" /> Set First Rate
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th className="ps-4" style={{ fontWeight: 600, color: '#374151' }}>HCP</th>
                                        <th>Tier</th>
                                        <th className="text-end">Rate / Principal</th>
                                        <th className="text-end">Rate / Dependant</th>
                                        <th>Effective From</th>
                                        <th>Effective To</th>
                                        <th>Status</th>
                                        {canManage && <th></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rates.map(rate => (
                                        <tr key={rate.id}>
                                            <td className="ps-4">
                                                <div style={{ fontWeight: 600, color: '#111' }}>{rate.hcp_name}</div>
                                                <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                                                    {rate.hcp_code}
                                                </div>
                                            </td>
                                            <td>
                                                <TierBadge tier={rate.tier} />
                                            </td>
                                            <td className="text-end font-monospace" style={{ fontWeight: 600, color: '#0f4c81' }}>
                                                {formatCurrency(rate.rate_per_principal)}
                                            </td>
                                            <td className="text-end font-monospace" style={{ color: '#374151' }}>
                                                {formatCurrency(rate.rate_per_dependent)}
                                            </td>
                                            <td style={{ color: '#374151' }}>{formatDate(rate.effective_from)}</td>
                                            <td style={{ color: '#374151' }}>
                                                {rate.effective_to ? formatDate(rate.effective_to) : (
                                                    <span style={{ color: '#137333', fontSize: 12 }}>Open-ended</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                    color:      rate.is_active ? '#137333' : '#6b7280',
                                                    background: rate.is_active ? '#e6f4ea' : '#f3f4f6',
                                                }}>
                                                    {rate.is_active ? 'Active' : 'Superseded'}
                                                </span>
                                            </td>
                                            {canManage && (
                                                <td>
                                                    {rate.is_active && (
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                            title="Update rate"
                                                            onClick={() => setEditRate(rate)}
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data?.meta && (
                            <div className="card-body border-top py-2">
                                <Pagination meta={data.meta} onPageChange={setPage} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {editRate !== null && (
                <SetRateModal
                    existing={editRate}
                    onClose={() => setEditRate(null)}
                    onSuccess={() => {
                        qc.invalidateQueries({ queryKey: ['capitation-rates'] });
                        setEditRate(null);
                    }}
                />
            )}
        </>
    );
}

/* ── Tier badge ─────────────────────────────────────────────────────────────── */

const TIER_STYLE = {
    primary:   { color: '#0f4c81', bg: '#e8f0fe' },
    secondary: { color: '#7c3aed', bg: '#f5f3ff' },
    tertiary:  { color: '#b45309', bg: '#fef3c7' },
};

function TierBadge({ tier }) {
    const s = TIER_STYLE[tier] ?? { color: '#6b7280', bg: '#f3f4f6' };
    return (
        <span style={{
            padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            textTransform: 'capitalize', color: s.color, background: s.bg,
        }}>
            {tier ?? '-'}
        </span>
    );
}

/* ── Set / Update Rate Modal ─────────────────────────────────────────────────── */

function SetRateModal({ existing, onClose, onSuccess }) {
    const isNew = !existing?.id;
    const qc    = useQueryClient();

    const [form, setForm] = useState({
        hcp_id:             existing?.hcp_id  ?? '',
        rate_per_principal: existing?.rate_per_principal ?? '',
        rate_per_dependent: existing?.rate_per_dependent ?? '',
        effective_from:     existing?.effective_from ?? new Date().toISOString().slice(0, 10),
        effective_to:       existing?.effective_to ?? '',
        notes:              existing?.notes ?? '',
    });
    const [errors, setErrors] = useState({});

    // Load HCP list for the selector (only when creating new)
    const { data: hcpData } = useQuery({
        queryKey:  ['hcps-simple'],
        queryFn:   () => fetchHCPs({ per_page: 200, status: 'active' }),
        enabled:   isNew,
        staleTime: 300_000,
    });
    // const hcps = hcpData?.data ?? [];
    const hcps = hcpData?.data?.data ?? hcpData?.data ?? hcpData ?? [];
    const mutation = useMutation({
        mutationFn: saveCapitationRate,
        onSuccess: () => {
            toast.success(isNew ? 'Capitation rate set.' : 'Rate updated. Previous rate superseded.');
            onSuccess();
        },
        onError: (err) => {
            const msg = err.response?.data?.message ?? 'Failed to save rate.';
            toast.error(msg);
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
        },
    });

    const field = (name, label, type = 'text', extra = {}) => (
        <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>{label}</label>
            <input
                type={type}
                className={`form-control form-control-sm ${errors[name] ? 'is-invalid' : ''}`}
                value={form[name]}
                onChange={e => {
                    setForm(p => ({ ...p, [name]: e.target.value }));
                    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
                }}
                {...extra}
            />
            {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
        </div>
    );

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1055 }}>
            <div className="modal-dialog modal-md modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold">
                            {isNew ? 'Set Capitation Rate' : `Update Rate - ${existing.hcp_name}`}
                        </h5>
                        <button className="btn-close" onClick={onClose} />
                    </div>

                    <div className="modal-body">
                        {!isNew && (
                            <div className="alert alert-info py-2 mb-3 d-flex gap-2 align-items-start" style={{ fontSize: 13 }}>
                                <AlertCircle size={15} className="flex-shrink-0 mt-1" />
                                <span>
                                    Setting a new rate will <strong>supersede</strong> the current rate.
                                    The old rate will be closed on the day before the new effective date.
                                </span>
                            </div>
                        )}

                        {/* HCP selector - only on new */}
                        {isNew && (
                            <div className="mb-3">
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                    Healthcare Provider
                                </label>
                                <select
                                    className={`form-select form-select-sm ${errors.hcp_id ? 'is-invalid' : ''}`}
                                    value={form.hcp_id}
                                    onChange={e => setForm(p => ({ ...p, hcp_id: e.target.value }))}
                                >
                                    <option value="">Select HCP…</option>
                                    {hcps.map(h => (
                                        <option key={h.id} value={h.id}>
                                            {h.name} ({h.hcp_code}) - {h.tier ?? 'No tier'}
                                        </option>
                                    ))}
                                </select>
                                {errors.hcp_id && <div className="invalid-feedback">{errors.hcp_id}</div>}
                            </div>
                        )}

                        <div className="row g-3">
                            <div className="col-6">
                                {field('rate_per_principal', 'Rate / Principal (₦/month)', 'number', { min: 0, step: '0.01', placeholder: '0.00' })}
                            </div>
                            <div className="col-6">
                                {field('rate_per_dependent', 'Rate / Dependant (₦/month)', 'number', { min: 0, step: '0.01', placeholder: '0.00' })}
                            </div>
                            <div className="col-6">
                                {field('effective_from', 'Effective From', 'date')}
                            </div>
                            <div className="col-6">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                        Effective To <span className="text-muted fw-normal">(leave blank = open)</span>
                                    </label>
                                    <input
                                        type="date"
                                        className={`form-control form-control-sm ${errors.effective_to ? 'is-invalid' : ''}`}
                                        value={form.effective_to}
                                        onChange={e => setForm(p => ({ ...p, effective_to: e.target.value }))}
                                    />
                                    {errors.effective_to && <div className="invalid-feedback">{errors.effective_to}</div>}
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="mb-0">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Notes</label>
                                    <textarea
                                        className="form-control form-control-sm"
                                        rows={2}
                                        value={form.notes}
                                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="e.g. Negotiated rate per Q1 2025 contract review"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate(form)}
                        >
                            {mutation.isPending
                                ? <><span className="spinner-border spinner-border-sm me-1" /> Saving…</>
                                : isNew ? 'Set Rate' : 'Update Rate'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}