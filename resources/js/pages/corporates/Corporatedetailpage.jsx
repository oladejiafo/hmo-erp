/**
 * CorporateDetailPage
 *
 * Route:   /corporates/:id
 * Permission required: corporates.view
 *
 * What this page does:
 *   - Shows full corporate profile
 *   - Tabs: Overview | Plans | Invoices | Enrollees (link to enrollee list filtered)
 *   - Suspend / Reactivate action (needs corporates.edit)
 *   - Edit button navigates to /corporates/:id/edit
 *
 * Data flow:
 *   useQuery(['corporate', id]) → fetchCorporate(id) → GET /corporates/:id
 *   Plans: useQuery(['corporate-plans', id]) → fetchCorporatePlans(id)
 *   Invoices: useQuery(['corporate-invoices', id]) → fetchCorporateInvoices(id)
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Edit2, PauseCircle, PlayCircle, Plus,
    Building2, Users, FileText, CreditCard
} from 'lucide-react';
import {
    fetchCorporate, fetchPlans as fetchCorporatePlans, fetchInvoices as fetchCorporateInvoices,
    suspendCorporate, createInvoice, markInvoicePaid
} from '../../api/index';
import {
    PageHeader, StatusBadge, StatCard, LoadingSpinner,
    ErrorAlert, EmptyState, ConfirmModal
} from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/format';

import PlanListPage from '../plans/PlanListPage';

export default function CorporateDetailPage() {
    const { id }             = useParams();
    const navigate           = useNavigate();
    const { hasPermission }  = useAuth();
    const queryClient        = useQueryClient();

    const [activeTab, setActiveTab]       = useState('overview');
    const [confirmSuspend, setConfirmSuspend] = useState(false);

    // ── Data fetching ──────────────────────────────────────────────────────
    const { data, isLoading, error } = useQuery({
        queryKey: ['corporate', id],
        queryFn:  () => fetchCorporate(id),
    });

    const { data: plansData } = useQuery({
        queryKey: ['corporate-plans', id],
        queryFn:  () => fetchCorporatePlans(id),
        enabled:  activeTab === 'plans',
    });

    const { data: invoicesData } = useQuery({
        queryKey: ['corporate-invoices', id],
        queryFn:  () => fetchCorporateInvoices(id),
        enabled:  activeTab === 'invoices',
    });

    // ── Mutations ──────────────────────────────────────────────────────────
    const suspendMutation = useMutation({
        mutationFn: () => suspendCorporate(id, { reason: 'Toggled via admin interface' }),
        onSuccess:  (res) => {
            toast.success(res.data.message);
            queryClient.invalidateQueries({ queryKey: ['corporate', id] });
            queryClient.invalidateQueries({ queryKey: ['corporates'] });
            setConfirmSuspend(false);
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Action failed.'),
    });

    if (isLoading) return <div className="py-5 text-center"><LoadingSpinner text="Loading..." /></div>;
    if (error)     return <ErrorAlert error={error} />;

    const corp     = data?.data?.data;
    const isSuspended = corp.status === 'suspended';
    const plans    = plansData?.data?.data ?? plansData?.data ?? [];
    const invoices = invoicesData?.data?.data ?? invoicesData?.data ?? [];

    return (
        <div>
            {/* ── Header ── */}
            <div className="d-flex align-items-start gap-3 mb-4">
                <button className="btn btn-light btn-sm mt-1" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                </button>
                <div className="flex-grow-1">
                    <PageHeader
                        title={corp.name}
                        subtitle={`${corp.code} · ${corp.industry ?? 'No industry set'} · ${corp.state ?? ''}`}
                        breadcrumbs={['Home', 'Corporates', corp.name]}
                        actions={
                            <div className="d-flex gap-2">
                                {hasPermission('corporates.edit') && (
                                    <>
                                        <button
                                            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                                            onClick={() => setConfirmSuspend(true)}
                                        >
                                            {isSuspended
                                                ? <><PlayCircle size={14} /> Reactivate</>
                                                : <><PauseCircle size={14} /> Suspend</>
                                            }
                                        </button>
                                        <button
                                            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                            onClick={() => navigate(`/corporates/${id}/edit`)}
                                        >
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    </>
                                )}
                            </div>
                        }
                    />
                </div>
            </div>

            {/* ── Quick Stats ── */}
            <div className="row g-3 mb-4">
                <div className="col-sm-6 col-md-3">
                    <StatCard
                        title="Active Enrollees"
                        value={corp.active_enrollees_count ?? 0}
                        subtitle={`of ${corp.enrollees_count ?? 0} total`}
                        icon={Users} color="success"
                    />
                </div>
                <div className="col-sm-6 col-md-3">
                    <StatCard
                        title="Active Plans"
                        value={corp.plans_count ?? 0}
                        icon={CreditCard} color="primary"
                    />
                </div>
                <div className="col-sm-6 col-md-3">
                    <StatCard
                        title="Contract Ends"
                        value={formatDate(corp.contract_end_date)}
                        subtitle={corp.is_contract_expired ? '⚠ Expired' : `${corp.days_until_renewal ?? '?'} days remaining`}
                        icon={FileText}
                        color={corp.is_contract_expired ? 'danger' : corp.days_until_renewal <= 30 ? 'warning' : 'info'}
                    />
                </div>
                <div className="col-sm-6 col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body text-center pt-3">
                            <StatusBadge
                                status={corp.status}
                                color={corp.status === 'active' ? 'success' : 'warning'}
                                label={corp.status_label ?? corp.status}
                            />
                            <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                                {corp.state} · {corp.city}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0 pt-3">
                    <ul className="nav nav-tabs card-header-tabs">
                        {['overview', 'plans', 'invoices', 'contacts'].map(tab => (
                            <li className="nav-item" key={tab}>
                                <button
                                    className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                    style={{ textTransform: 'capitalize', fontSize: 13 }}
                                >
                                    {tab}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card-body">
                    {/* Overview tab */}
                    {activeTab === 'overview' && (
                        <div className="row g-4">
                            <div className="col-md-6">
                                <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: 11, letterSpacing: 1 }}>
                                    Company Information
                                </h6>
                                <InfoRow label="Full Name"      value={corp.name} />
                                <InfoRow label="Code"           value={corp.code} mono />
                                <InfoRow label="RC Number"      value={corp.rc_number} />
                                <InfoRow label="Industry"       value={corp.industry} />
                                <InfoRow label="Email"          value={corp.email} />
                                <InfoRow label="Phone"          value={corp.phone} />
                                <InfoRow label="State"          value={corp.state} />
                                <InfoRow label="Address"        value={corp.address} />
                            </div>
                            <div className="col-md-6">
                                <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ fontSize: 11, letterSpacing: 1 }}>
                                    Contract Information
                                </h6>
                                <InfoRow label="Contract Start" value={formatDate(corp.contract_start_date)} />
                                <InfoRow label="Contract End"   value={formatDate(corp.contract_end_date)} />
                                <InfoRow label="Total Employees" value={corp.total_employees?.toLocaleString()} />
                                {corp.notes && <InfoRow label="Notes" value={corp.notes} />}
                            </div>
                        </div>
                    )}

                    {/* Plans tab */}
                    {activeTab === 'plans' && (
                        <PlanListPage
                            corporateId={corp.id}
                            corporateName={corp.name}
                        />
                    )}

                    {/* Invoices tab */}
                    {activeTab === 'invoices' && (
                        <div>
                            {invoices.data?.length === 0 ? (
                                <EmptyState icon={<FileText size={48} />} message="No invoices yet" />
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ fontSize: 12 }}>Invoice No.</th>
                                                <th style={{ fontSize: 12 }}>Issue Date</th>
                                                <th style={{ fontSize: 12 }}>Due Date</th>
                                                <th style={{ fontSize: 12 }} className="text-end">Amount</th>
                                                <th style={{ fontSize: 12 }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoices.data?.map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="font-monospace" style={{ fontSize: 12 }}>{inv.invoice_number}</td>
                                                    <td style={{ fontSize: 12 }}>{formatDate(inv.issue_date)}</td>
                                                    <td style={{ fontSize: 12 }}>{formatDate(inv.due_date)}</td>
                                                    <td style={{ fontSize: 12 }} className="text-end">{formatCurrency(inv.total_amount)}</td>
                                                    <td>
                                                        <StatusBadge
                                                            status={inv.status}
                                                            color={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'}
                                                            label={inv.status}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contacts tab */}
                    {activeTab === 'contacts' && (
                        <div>
                            {!corp.contacts?.length ? (
                                <EmptyState icon={<Users size={48} />} message="No contacts on record" />
                            ) : (
                                <div className="row g-3">
                                    {corp.contacts.map(c => (
                                        <div key={c.id} className="col-md-6">
                                            <div className="border rounded-3 p-3">
                                                <div className="fw-semibold mb-1">{c.name}</div>
                                                <div className="text-muted mb-2" style={{ fontSize: 12 }}>{c.title}</div>
                                                <div className="badge bg-secondary-subtle text-secondary mb-2" style={{ fontSize: 11 }}>{c.type}</div>
                                                <InfoRow label="Email" value={c.email} />
                                                <InfoRow label="Phone" value={c.phone} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm suspend/reactivate */}
            <ConfirmModal
                show={confirmSuspend}
                title={isSuspended ? 'Reactivate Corporate' : 'Suspend Corporate'}
                message={isSuspended
                    ? `Reactivate ${corp.name}? Their enrollees will regain access to services.`
                    : `Suspend ${corp.name}? This will prevent their enrollees from making new claims.`
                }
                variant={isSuspended ? 'success' : 'warning'}
                onConfirm={() => suspendMutation.mutate()}
                onCancel={() => setConfirmSuspend(false)}
                loading={suspendMutation.isPending}
            />
        </div>
    );
}

function InfoRow({ label, value, mono }) {
    if (!value && value !== 0) return null;
    return (
        <div className="d-flex gap-3 mb-2">
            <span className="text-muted" style={{ fontSize: 12, minWidth: 130 }}>{label}</span>
            <span className={`fw-semibold ${mono ? 'font-monospace' : ''}`} style={{ fontSize: 13 }}>
                {value}
            </span>
        </div>
    );
}