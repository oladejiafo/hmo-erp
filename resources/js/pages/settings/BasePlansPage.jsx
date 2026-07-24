// resources/js/pages/settings/BasePlansPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Plus, Edit2, XCircle } from 'lucide-react';
import { fetchAllPlans, createPlan, updatePlan, discontinuePlan } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency } from '../../utils/format';

export default function BasePlansPage() {
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const qc = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['base-plans'],
        queryFn: () => fetchAllPlans({ is_base: true, per_page: 100 }),
    });

    const plans = data?.data?.data ?? data?.data ?? [];

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert error={error} />;

    return (
        <div>
            <PageHeader
                title="HMO Base Plans"
                subtitle="Default plans available to any corporate or individual"
                actions={
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                        <Plus size={16} /> New Base Plan
                    </button>
                }
            />

            {showForm && (
                <PlanForm
                    isBase={true}
                    onClose={() => setShowForm(false)}
                    onSaved={() => {
                        setShowForm(false);
                        qc.invalidateQueries({ queryKey: ['base-plans'] });
                    }}
                />
            )}

            {plans.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    No base plans found. Create one to serve as a fallback for corporates.
                </div>
            ) : (
                <div className="row g-3">
                    {plans.map(plan => (
                        <div key={plan.id} className="col-md-6 col-lg-4">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <div className="d-flex justify-content-between">
                                        <h6 className="fw-bold">{plan.plan_name}</h6>
                                        <StatusBadge 
                                            status={plan.status} 
                                            color={plan.status === 'active' ? 'success' : 'secondary'}
                                        />
                                    </div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        {plan.plan_code} · {plan.tier}
                                    </div>
                                    <div className="mt-2">
                                        <span className="fw-bold">{formatCurrency(plan.annual_premium)}</span>
                                        <span className="text-muted ms-1" style={{ fontSize: 12 }}>/year</span>
                                    </div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        Max benefit: {formatCurrency(plan.max_benefit_value)}
                                    </div>
                                    {plan.is_default && (
                                        <span className="badge bg-primary">Default</span>
                                    )}
                                    <div className="mt-3 d-flex gap-2">
                                        <button 
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => setEditingPlan(plan)}
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingPlan && (
                <PlanForm
                    isBase={true}
                    existing={editingPlan}
                    onClose={() => setEditingPlan(null)}
                    onSaved={() => {
                        setEditingPlan(null);
                        qc.invalidateQueries({ queryKey: ['base-plans'] });
                    }}
                />
            )}
        </div>
    );
}

function PlanForm({ isBase, existing, onClose, onSaved }) {
    const [name, setName] = useState(existing?.plan_name || '');
    const [tier, setTier] = useState(existing?.tier || 'standard');
    const [annualPremium, setAnnualPremium] = useState(existing?.annual_premium || '');
    const [maxBenefit, setMaxBenefit] = useState(existing?.max_benefit_value || '');
    const [isDefault, setIsDefault] = useState(existing?.is_default || false);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        try {
            setSaving(true);
            const data = {
                plan_name: name,
                tier,
                annual_premium: annualPremium,
                max_benefit_value: maxBenefit,
                is_default: isDefault,
                // For base plans, corporate_id is null
                corporate_id: null,
                // Set these defaults for base plans
                plan_type: 'individual',
                status: 'active',
                dental_covered: tier !== 'basic',
                optical_covered: tier !== 'basic',
                surgery_covered: true,
                max_dependents: 4,
            };

            if (existing) {
                await updatePlan(null, existing.id, data);
                toast.success('Base plan updated');
            } else {
                await createPlan(null, data);
                toast.success('Base plan created');
            }
            onSaved();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop fade show">
            <div className="modal d-block">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h6>{existing ? 'Edit' : 'New'} Base Plan</h6>
                            <button className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            <div className="mb-2">
                                <label className="form-label">Plan Name *</label>
                                <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="mb-2">
                                <label className="form-label">Tier</label>
                                <select className="form-select" value={tier} onChange={e => setTier(e.target.value)}>
                                    <option value="basic">Basic</option>
                                    <option value="standard">Standard</option>
                                    <option value="premium">Premium</option>
                                    <option value="executive">Executive</option>
                                </select>
                            </div>
                            <div className="mb-2">
                                <label className="form-label">Annual Premium (₦) *</label>
                                <input type="number" className="form-control" value={annualPremium} onChange={e => setAnnualPremium(e.target.value)} />
                            </div>
                            <div className="mb-2">
                                <label className="form-label">Max Benefit Value (₦) *</label>
                                <input type="number" className="form-control" value={maxBenefit} onChange={e => setMaxBenefit(e.target.value)} />
                            </div>
                            <div className="form-check">
                                <input type="checkbox" className="form-check-input" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                                <label className="form-check-label" htmlFor="isDefault">Default plan (fallback for new corporates)</label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-light" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving || !name || !annualPremium || !maxBenefit}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}