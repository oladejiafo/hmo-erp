/**
 * FILE: resources/js/pages/plans/PlanDetailPage.jsx
 *
 * Shows full plan details:
 *  - Header card: name, tier, status, enrollee count, key dates
 *  - Limits summary grid
 *  - Coverage flags
 *  - Benefit items grouped by category (read-only)
 *  - Edit benefit items inline (opens BenefitItemsEditor)
 *
 * Route: /corporates/:corporateId/plans/:planId
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Edit, ShieldCheck, Users, Calendar,
    CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { fetchPlan, syncBenefitItems } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth, useAuthReady } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const TIER_STYLE = {
    basic:     { bg: '#f1f5f9', color: '#475569' },
    standard:  { bg: '#dbeafe', color: '#1d4ed8' },
    premium:   { bg: '#fef3c7', color: '#92400e' },
    executive: { bg: '#fce7f3', color: '#9d174d' },
};

const COVERAGE_STYLE = {
    covered:          { color: '#166534', bg: '#dcfce7',   label: 'Covered'         },
    not_covered:      { color: '#991b1b', bg: '#fee2e2',   label: 'Not Covered'     },
    limited:          { color: '#92400e', bg: '#fef3c7',   label: 'Limited'         },
    requires_preauth: { color: '#1e40af', bg: '#dbeafe',   label: 'Requires PA'     },
    copay_applies:    { color: '#5b21b6', bg: '#ede9fe',   label: 'Co-Pay Applies'  },
};

const BENEFIT_CATEGORIES = [
    'consultation', 'lab', 'radiology', 'pharmacy', 'surgery',
    'maternity', 'inpatient', 'emergency', 'dental', 'optical',
    'physiotherapy', 'mental_health', 'immunisation', 'family_planning',
    'chronic_disease', 'other',
];

const CATEGORY_LABELS = {
    consultation: 'Consultation', lab: 'Laboratory', radiology: 'Radiology',
    pharmacy: 'Pharmacy / Drugs', surgery: 'Surgery', maternity: 'Maternity',
    inpatient: 'Inpatient / Admission', emergency: 'Emergency', dental: 'Dental',
    optical: 'Optical', physiotherapy: 'Physiotherapy', mental_health: 'Mental Health',
    immunisation: 'Immunisation', family_planning: 'Family Planning',
    chronic_disease: 'Chronic Disease', other: 'Other',
};

export default function PlanDetailPage() {
    const { corporateId, planId } = useParams();
    const navigate   = useNavigate();
    const authReady  = useAuthReady();
    const qc         = useQueryClient();
    const { hasPermission } = useAuth();

    const [editingItems, setEditingItems] = useState(false);
    const [expandedCats, setExpandedCats] = useState({});

    const { data, isLoading, error } = useQuery({
        queryKey: ['plan', corporateId, planId],
        queryFn:  () => fetchPlan(corporateId, planId),
        enabled:  authReady && !!planId,
        staleTime: 30_000,
    });

    const plan = data?.data?.data ?? data?.data ?? data;

    const syncMutation = useMutation({
        mutationFn: (items) => syncBenefitItems(corporateId, planId, items),
        onSuccess: () => {
            toast.success('Benefit items saved.');
            qc.invalidateQueries({ queryKey: ['plan', corporateId, planId] });
            setEditingItems(false);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to save items.'),
    });

    if (!authReady || isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;
    if (!plan?.id) return <ErrorAlert message="Plan not found." />;

    const tier = TIER_STYLE[plan.tier] ?? TIER_STYLE.standard;

    // Flatten grouped benefit items for editing
    const flatItems = plan.benefit_items
        ? plan.benefit_items.flatMap(g => g.items?.map(i => ({ ...i, benefit_category: i.benefit_category ?? g.category })) ?? [])
        : [];

    return (
        <div>
            <PageHeader
                title={plan.plan_name}
                subtitle={<span className="font-monospace text-muted">{plan.plan_code}</span>}
                actions={
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm"
                                onClick={() => navigate(`/corporates/${corporateId}`)}>
                            <ArrowLeft size={15} className="me-1" />Back
                        </button>
                        {hasPermission('plans.edit') && plan.status !== 'discontinued' && (
                            <button className="btn btn-primary btn-sm"
                                    onClick={() => navigate(`/corporates/${corporateId}/plans/${planId}/edit`)}>
                                <Edit size={15} className="me-1" />Edit Plan
                            </button>
                        )}
                    </div>
                }
            />

            {/* ── Header cards ─────────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
                {/* Plan card */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div style={{ height: 4, background: tier.color, borderRadius: '8px 8px 0 0' }} />
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <span className="badge" style={{ background: tier.bg, color: tier.color, fontSize: 11 }}>
                                    {plan.tier_label ?? plan.tier}
                                </span>
                                <StatusBadge status={plan.status} color={
                                    plan.status === 'active' ? 'success' :
                                    plan.status === 'inactive' ? 'secondary' : 'dark'
                                } label={plan.status_label} />
                            </div>
                            <div className="row g-2 text-center">
                                <div className="col-6">
                                    <div className="fw-bold" style={{ fontSize: 22, color: '#0f4c81' }}>
                                        {formatCurrency(plan.max_benefit_value, false)}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: 10 }}>Annual Limit</div>
                                </div>
                                <div className="col-6">
                                    <div className="fw-bold" style={{ fontSize: 22, color: '#166534' }}>
                                        {(plan.enrollee_count ?? 0).toLocaleString()}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: 10 }}>
                                        <Users size={10} className="me-1" />Enrollees
                                    </div>
                                </div>
                            </div>
                            <hr className="my-2" />
                            <div style={{ fontSize: 12 }}>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Type</span>
                                    <span className="fw-semibold text-capitalize">{plan.plan_type}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Max Dependents</span>
                                    <span className="fw-semibold">
                                        {plan.max_dependents != null ? plan.max_dependents : 'Unlimited'}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Co-pay</span>
                                    <span className="fw-semibold">
                                        {plan.copay_amount > 0
                                            ? formatCurrency(plan.copay_amount)
                                            : plan.copay_percentage > 0
                                            ? `${plan.copay_percentage}%`
                                            : 'None'}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Waiting Period</span>
                                    <span className="fw-semibold">
                                        {plan.waiting_period_days > 0 ? `${plan.waiting_period_days} days` : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Limits grid */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white fw-semibold" style={{ fontSize: 13 }}>Sub-Limits</div>
                        <div className="card-body">
                            {[
                                { label: 'Inpatient',   value: plan.inpatient_limit  },
                                { label: 'Outpatient',  value: plan.outpatient_limit },
                                { label: 'Surgery',     value: plan.surgery_limit    },
                                { label: 'Maternity',   value: plan.maternity_limit  },
                                { label: 'Dental',      value: plan.dental_limit     },
                                { label: 'Optical',     value: plan.optical_limit    },
                                { label: 'Drugs',       value: plan.drug_limit       },
                            ].map(({ label, value }) => (
                                <div key={label} className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
                                    <span className="text-muted">{label}</span>
                                    <span className="fw-semibold font-monospace">
                                        {value ? formatCurrency(value) : <span className="text-muted">-</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coverage & Pre-auth */}
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white fw-semibold" style={{ fontSize: 13 }}>Coverage & Pre-Auth</div>
                        <div className="card-body">
                            <p className="text-muted mb-2" style={{ fontSize: 11 }}>COVERAGE INCLUSIONS</p>
                            {[
                                { key: 'surgery_covered',        label: 'Surgery'        },
                                { key: 'maternity_covered',      label: 'Maternity'      },
                                { key: 'dental_covered',         label: 'Dental'         },
                                { key: 'optical_covered',        label: 'Optical'        },
                                { key: 'physiotherapy_covered',  label: 'Physiotherapy'  },
                                { key: 'mental_health_covered',  label: 'Mental Health'  },
                            ].map(({ key, label }) => (
                                <div key={key} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: 12 }}>
                                    {plan[key]
                                        ? <CheckCircle size={13} color="#166534" />
                                        : <XCircle    size={13} color="#dc2626" />}
                                    <span className={plan[key] ? '' : 'text-muted'}>{label}</span>
                                </div>
                            ))}
                            <hr className="my-2" />
                            <p className="text-muted mb-2" style={{ fontSize: 11 }}>PRE-AUTH THRESHOLDS</p>
                            {[
                                { label: 'Inpatient', value: plan.preauth_threshold_inpatient },
                                { label: 'Surgery',   value: plan.preauth_threshold_surgery   },
                                { label: 'Drugs',     value: plan.preauth_threshold_drugs     },
                            ].map(({ label, value }) => (
                                <div key={label} className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
                                    <span className="text-muted">{label}</span>
                                    <span className="fw-semibold font-monospace">
                                        {value ? `≥ ${formatCurrency(value)}` : <span className="text-muted">No threshold</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Benefit Items ─────────────────────────────────────────────── */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <div>
                        <span className="fw-semibold" style={{ fontSize: 14 }}>Benefit Items</span>
                        <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                            {flatItems.length} services defined across {plan.benefit_items?.length ?? 0} categories
                        </span>
                    </div>
                    {hasPermission('plans.edit') && plan.status !== 'discontinued' && (
                        <button
                            className={`btn btn-sm ${editingItems ? 'btn-secondary' : 'btn-outline-primary'}`}
                            onClick={() => setEditingItems(prev => !prev)}
                        >
                            {editingItems ? 'Cancel Edit' : 'Edit Items'}
                        </button>
                    )}
                </div>

                <div className="card-body p-0">
                    {editingItems ? (
                        <BenefitItemsEditor
                            initialItems={flatItems}
                            onSave={(items) => syncMutation.mutate(items)}
                            isSaving={syncMutation.isPending}
                            onCancel={() => setEditingItems(false)}
                        />
                    ) : (
                        plan.benefit_items?.length === 0 || !plan.benefit_items ? (
                            <div className="py-5 text-center text-muted">
                                <ShieldCheck size={36} className="mb-2 opacity-25" />
                                <p className="mb-0">No benefit items defined yet.</p>
                            </div>
                        ) : (
                            <div>
                                {plan.benefit_items.map(group => {
                                    const isOpen = expandedCats[group.category] !== false; // open by default
                                    return (
                                        <div key={group.category} className="border-bottom">
                                            <button
                                                className="w-100 text-start px-4 py-2 d-flex justify-content-between align-items-center bg-transparent border-0"
                                                style={{ background: '#fafbfc' }}
                                                onClick={() => setExpandedCats(p => ({ ...p, [group.category]: !isOpen }))}
                                            >
                                                <span className="fw-semibold" style={{ fontSize: 13 }}>
                                                    {group.category_label}
                                                    <span className="text-muted fw-normal ms-2" style={{ fontSize: 11 }}>
                                                        ({group.items?.length} service{group.items?.length !== 1 ? 's' : ''})
                                                    </span>
                                                </span>
                                                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>

                                            {isOpen && (
                                                <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th className="ps-4">Service</th>
                                                            <th>Coverage</th>
                                                            <th className="text-end">Annual Limit</th>
                                                            <th className="text-end">Per Visit</th>
                                                            <th className="text-center">Pre-Auth. Required</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.items?.map(item => {
                                                            const cs = COVERAGE_STYLE[item.coverage_type] ?? COVERAGE_STYLE.covered;
                                                            return (
                                                                <tr key={item.id}>
                                                                    <td className="ps-4">{item.benefit_name}</td>
                                                                    <td>
                                                                        <span className="badge"
                                                                              style={{ background: cs.bg, color: cs.color, fontSize: 10 }}>
                                                                            {cs.label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-end font-monospace">
                                                                        {item.annual_limit ? formatCurrency(item.annual_limit) : <span className="text-muted">-</span>}
                                                                    </td>
                                                                    <td className="text-end font-monospace">
                                                                        {item.per_visit_limit ? formatCurrency(item.per_visit_limit) : <span className="text-muted">-</span>}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        {item.requires_preauth
                                                                            ? <AlertCircle size={13} color="#1e40af" />
                                                                            : <span className="text-muted">-</span>}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Inline benefit items editor ───────────────────────────────────────────────
function BenefitItemsEditor({ initialItems, onSave, isSaving, onCancel }) {
    const [items, setItems] = useState(initialItems.map(i => ({ ...i })));

    const update = (idx, field, value) =>
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

    const remove = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    const add = () => setItems(prev => [...prev, {
        benefit_category: 'consultation', benefit_name: '', coverage_type: 'covered',
        annual_limit: '', per_visit_limit: '', requires_preauth: false, waiting_period_days: 0, notes: '',
    }]);

    return (
        <div className="p-3">
            <div className="table-responsive">
                <table className="table table-sm align-middle" style={{ fontSize: 12 }}>
                    <thead className="table-light">
                        <tr>
                            <th>Category</th><th>Service</th><th>Coverage</th>
                            <th>Annual (₦)</th><th>Per Visit (₦)</th><th>PA</th><th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td>
                                    <select className="form-select form-select-sm"
                                            value={item.benefit_category}
                                            onChange={e => update(idx, 'benefit_category', e.target.value)}>
                                        {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                                            <option key={v} value={v}>{l}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <input className="form-control form-control-sm" value={item.benefit_name}
                                           onChange={e => update(idx, 'benefit_name', e.target.value)} />
                                </td>
                                <td>
                                    <select className="form-select form-select-sm" value={item.coverage_type}
                                            onChange={e => update(idx, 'coverage_type', e.target.value)}>
                                        <option value="covered">Covered</option>
                                        <option value="not_covered">Not Covered</option>
                                        <option value="limited">Limited</option>
                                        <option value="requires_preauth">Requires PA</option>
                                        <option value="copay_applies">Co-Pay</option>
                                    </select>
                                </td>
                                <td><input className="form-control form-control-sm" type="number" value={item.annual_limit}
                                           onChange={e => update(idx, 'annual_limit', e.target.value)} placeholder="-" /></td>
                                <td><input className="form-control form-control-sm" type="number" value={item.per_visit_limit}
                                           onChange={e => update(idx, 'per_visit_limit', e.target.value)} placeholder="-" /></td>
                                <td className="text-center">
                                    <input type="checkbox" className="form-check-input"
                                           checked={item.requires_preauth}
                                           onChange={e => update(idx, 'requires_preauth', e.target.checked)} />
                                </td>
                                <td>
                                    <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => remove(idx)}>
                                        <XCircle size={13} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="d-flex gap-2 mt-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={add}>
                    + Add Row
                </button>
                <div className="ms-auto d-flex gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-sm"
                            disabled={isSaving || items.some(i => !i.benefit_name.trim())}
                            onClick={() => onSave(items)}>
                        {isSaving ? 'Saving…' : 'Save Items'}
                    </button>
                </div>
            </div>
        </div>
    );
}