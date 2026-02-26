import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowLeft, Plus, Copy, XCircle, Users, ShieldCheck } from 'lucide-react';
import { fetchAllPlans, discontinuePlan, duplicatePlan } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert, EmptyState } from '../../components/ui/index';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';

const TIER_STYLE = {
    basic:     { bg: '#f1f5f9', color: '#475569', label: 'Basic'     },
    standard:  { bg: '#dbeafe', color: '#1d4ed8', label: 'Standard'  },
    premium:   { bg: '#fef3c7', color: '#92400e', label: 'Premium'   },
    executive: { bg: '#fce7f3', color: '#9d174d', label: 'Executive' },
};

const STATUS_COLOR = {
    active:       'success',
    inactive:     'secondary',
    discontinued: 'dark',
};

export default function AllPlansPage() {
    console.log('🔥 AllPlansPage is rendering!');
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { hasPermission } = useAuth();
    const [duplicateTarget, setDuplicateTarget] = useState(null);
    const [newName, setNewName] = useState('');


    // const { data, isLoading, error, refetch } = useQuery({
    //     queryKey: ['all-plans'],
    //     queryFn: () => fetchAllPlans(),  // ← Call it as a function
    //     staleTime: 60_000,
    // });

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['all-plans'],
        queryFn: async () => {
            console.log('🚀 Fetching plans...');
            try {
                const result = await fetchAllPlans();
                console.log('✅ Plans fetched:', result);
                return result;
            } catch (err) {
                console.error('❌ Plans fetch failed:', err);
                console.error('❌ Error response:', err.response);
                console.error('❌ Error config:', err.config);
                console.error('❌ Full URL:', err.config?.baseURL + err.config?.url);
                throw err;
            }
        },
        staleTime: 60_000,
    });
    const plans = data?.data?.data ?? data?.data ?? [];

    // ── Discontinue mutation ──────────────────────────────────────────────────
    const discontinueMutation = useMutation({
        mutationFn: (planId) => discontinuePlan(planId),
        onSuccess: () => {
            toast.success('Plan discontinued.');
            qc.invalidateQueries({ queryKey: ['all-plans'] });
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to discontinue plan.'),
    });

    // ── Duplicate mutation ────────────────────────────────────────────────────
    const duplicateMutation = useMutation({
        mutationFn: ({ planId, name }) => duplicatePlan(planId, { plan_name: name }),
        onSuccess: (res) => {
            toast.success(`Plan "${res.data.data?.plan_name}" created.`);
            qc.invalidateQueries({ queryKey: ['all-plans'] });
            setDuplicateTarget(null);
            setNewName('');
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to duplicate plan.'),
    });

    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    const totalEnrollees = plans.reduce((s, p) => s + (p.enrollee_count ?? 0), 0);
    const activePlans = plans.filter(p => p.status === 'active');

    return (
        <div>
            <div className="d-flex align-items-center gap-2 mb-3">
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft size={14} />
                    Back to Dashboard
                </button>
            </div>

            <PageHeader
                title="All Health Plans"
                subtitle="View and manage plans across all corporates"
                actions={
                    hasPermission('plans.create') && (
                        <button
                            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                            onClick={() => navigate('/plans/new')}
                        >
                            <Plus size={15} /> New Plan
                        </button>
                    )
                }
            />

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <small className="text-muted">
                        {activePlans.length} active plan{activePlans.length !== 1 ? 's' : ''} · {totalEnrollees.toLocaleString()} enrollees · {plans.length} total plans
                    </small>
                </div>
            </div>

            {isLoading ? (
                <div className="py-5 text-center"><LoadingSpinner /></div>
            ) : plans.length === 0 ? (
                <EmptyState
                    icon={<ShieldCheck size={48} />}
                    title="No plans yet"
                    description="No health plans have been created across any corporate."
                    action={
                        hasPermission('plans.create') && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => navigate('/plans/new')}
                            >
                                <Plus size={15} className="me-1" /> Create First Plan
                            </button>
                        )
                    }
                />
            ) : (
                <div className="row g-3">
                    {plans.map(plan => {
                        const tier = TIER_STYLE[plan.tier] ?? TIER_STYLE.standard;
                        return (
                            <div key={plan.id} className="col-md-6 col-lg-4">
                                <div
                                    className="card border-0 shadow-sm h-100"
                                    style={{ cursor: 'pointer', transition: 'box-shadow .15s' }}
                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)'}
                                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                                    onClick={() => navigate(`/plans/${plan.id}`)}
                                >
                                    {/* Card header stripe */}
                                    <div style={{ height: 4, background: tier.color, borderRadius: '8px 8px 0 0' }} />

                                    <div className="card-body">
                                        {/* Top row */}
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span
                                                    className="badge me-1"
                                                    style={{ background: tier.bg, color: tier.color, fontSize: 10 }}
                                                >
                                                    {tier.label}
                                                </span>
                                                <StatusBadge
                                                    status={plan.status}
                                                    color={STATUS_COLOR[plan.status] ?? 'secondary'}
                                                    label={plan.status_label ?? plan.status}
                                                />
                                            </div>
                                            <span className="font-monospace text-muted" style={{ fontSize: 10 }}>
                                                {plan.plan_code}
                                            </span>
                                        </div>

                                        {/* Plan name and corporate */}
                                        <h6 className="fw-bold mb-1" style={{ fontSize: 15 }}>{plan.plan_name}</h6>
                                        {plan.corporate && (
                                            <div className="text-muted mb-2" style={{ fontSize: 11 }}>
                                                {plan.corporate.name} · {plan.corporate.code}
                                            </div>
                                        )}
                                        <p className="text-muted mb-3" style={{ fontSize: 12, minHeight: 36 }}>
                                            {plan.description ?? 'No description provided.'}
                                        </p>

                                        {/* Key metrics */}
                                        <div className="row g-2 mb-3">
                                            <div className="col-6">
                                                <div className="rounded-2 p-2 text-center" style={{ background: '#f8fafc' }}>
                                                    <div className="fw-bold" style={{ fontSize: 14, color: '#0f4c81' }}>
                                                        {formatCurrency(plan.max_benefit_value, false)}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: 10 }}>Annual Limit</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="rounded-2 p-2 text-center" style={{ background: '#f8fafc' }}>
                                                    <div className="fw-bold" style={{ fontSize: 14, color: '#166534' }}>
                                                        {(plan.enrollee_count ?? 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: 10 }}>Enrollees</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coverage chips */}
                                        <div className="d-flex flex-wrap gap-1 mb-3">
                                            {[
                                                { key: 'surgery_covered',       label: 'Surgery'       },
                                                { key: 'maternity_covered',     label: 'Maternity'     },
                                                { key: 'dental_covered',        label: 'Dental'        },
                                                { key: 'optical_covered',       label: 'Optical'       },
                                                { key: 'physiotherapy_covered', label: 'Physio'        },
                                                { key: 'mental_health_covered', label: 'Mental Health' },
                                            ].map(({ key, label }) => (
                                                plan[key] ? (
                                                    <span key={key}
                                                          className="badge"
                                                          style={{ background: '#e6f4ea', color: '#137333', fontSize: 10 }}>
                                                        ✓ {label}
                                                    </span>
                                                ) : null
                                            ))}
                                            {plan.max_dependents != null && (
                                                <span className="badge" style={{ background: '#e8f0fe', color: '#1d4ed8', fontSize: 10 }}>
                                                    <Users size={9} className="me-1" />
                                                    Max {plan.max_dependents} dep.
                                                </span>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        {hasPermission('plans.edit') && plan.status !== 'discontinued' && (
                                            <div className="d-flex gap-2 pt-2 border-top">
                                                <button
                                                    className="btn btn-sm btn-outline-secondary flex-grow-1"
                                                    style={{ fontSize: 11 }}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        navigate(`/plans/${plan.id}/edit`);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                {hasPermission('plans.create') && (
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        style={{ fontSize: 11 }}
                                                        title="Duplicate this plan"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setDuplicateTarget(plan);
                                                            setNewName(`${plan.plan_name} (Copy)`);
                                                        }}
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                )}
                                                {plan.enrollee_count === 0 && (
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        style={{ fontSize: 11 }}
                                                        title="Discontinue plan"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Discontinue "${plan.plan_name}"? This cannot be undone.`)) {
                                                                discontinueMutation.mutate(plan.id);
                                                            }
                                                        }}
                                                    >
                                                        <XCircle size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Duplicate modal */}
            {duplicateTarget && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Duplicate Plan</h5>
                                <button className="btn-close" onClick={() => setDuplicateTarget(null)} />
                            </div>
                            <div className="modal-body">
                                <p className="text-muted mb-3" style={{ fontSize: 13 }}>
                                    Creating a copy of <strong>{duplicateTarget.plan_name}</strong> including all benefit items.
                                </p>
                                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>New Plan Name</label>
                                <input
                                    className="form-control"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setDuplicateTarget(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    disabled={!newName.trim() || duplicateMutation.isPending}
                                    onClick={() => duplicateMutation.mutate({ planId: duplicateTarget.id, name: newName.trim() })}
                                >
                                    {duplicateMutation.isPending ? 'Duplicating…' : 'Create Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}