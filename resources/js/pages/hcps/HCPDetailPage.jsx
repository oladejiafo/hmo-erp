import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    ArrowLeft, Edit2, CheckCircle, XCircle, AlertTriangle, Plus,
    TrendingUp, FileText, Download, Phone, Building2, ShieldOff,
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
    fetchHCP, accreditHCP, blacklistHCP, suspendHCP, reactivateHCP, unblacklistHCP,
    fetchTariffs, createTariff as addTariff, updateTariff,
    fetchContracts, createContract,
    fetchHCPPerformance,
} from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/format';

const STATUS_COLOR = {
    pending: 'warning', active: 'success', suspended: 'secondary',
    blacklisted: 'danger', terminated: 'dark',
};
const TIER_COLOR   = { primary: 'info', secondary: 'primary', tertiary: 'success' };
const PAYMENT_MODEL_STYLE = {
    capitation:      { bg: '#e8f0fe', color: '#1967d2', label: 'Capitation' },
    fee_for_service: { bg: '#f0fdf4', color: '#166534', label: 'Fee for Service' },
    hybrid:          { bg: '#fef9c3', color: '#854d0e', label: 'Hybrid' },
};
const CATEGORIES = [
    'consultation', 'procedure', 'laboratory', 'radiology', 'drug',
    'surgery', 'dental', 'optical', 'physiotherapy', 'maternity', 'emergency',
];

export default function HCPDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();

    const [tab, setTab] = useState('overview');

    // Modal state
    const [blacklistModal,   setBM] = useState(false);
    const [blacklistReason,  setBR] = useState('');
    const [unblacklistModal, setUBM] = useState(false);
    const [unblacklistReason,setUBR] = useState('');
    const [suspendModal,     setSM] = useState(false);
    const [suspendReason,    setSR] = useState('');
    const [tariffModal,      setTM] = useState(false);
    const [editingTariff,    setET] = useState(null);
    const [contractModal,    setCM] = useState(false);

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: hcpData, isLoading, error } = useQuery({
        queryKey: ['hcp', id],
        queryFn:  () => fetchHCP(id),
    });
    
    const { data: tariffData, isLoading: tLoad } = useQuery({
        queryKey: ['hcp-tariffs', id],
        queryFn:  () => fetchTariffs(id),
        enabled:  !!id,
    });
    const { data: contractData, isLoading: contractsLoading } = useQuery({
        queryKey: ['hcp-contracts', id],
        queryFn:  () => fetchContracts(id),
        enabled:  !!id,
    });
    const { data: perfData, isLoading: perfLoading } = useQuery({
        queryKey: ['hcp-perf', id],
        queryFn:  () => fetchHCPPerformance(id),
        enabled:  !!id,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const inv = () => qc.invalidateQueries({ queryKey: ['hcp', id] });

    const accreditM = useMutation({
        mutationFn: () => accreditHCP(id),
        onSuccess: () => { toast.success('HCP accredited.'); inv(); },
        onError:   (e) => toast.error(e.response?.data?.message ?? 'Failed.'),
    });

    const suspendM = useMutation({
        mutationFn: () => suspendHCP(id, { reason: suspendReason }),
        onSuccess: () => { toast.success('HCP suspended.'); setSM(false); setSR(''); inv(); },
        onError:   (e) => toast.error(e.response?.data?.message ?? 'Failed.'),
    });

    const reactivateM = useMutation({
        mutationFn: () => reactivateHCP(id),
        onSuccess: () => { toast.success('HCP reactivated.'); inv(); },
        onError:   (e) => toast.error(e.response?.data?.message ?? 'Failed.'),
    });

    const blacklistM = useMutation({
        mutationFn: () => blacklistHCP(id, { reason: blacklistReason }),
        onSuccess: () => { toast.success('HCP blacklisted.'); setBM(false); setBR(''); inv(); },
        onError:   (e) => toast.error(e.response?.data?.message ?? 'Failed.'),
    });

    const unblacklistM = useMutation({
        mutationFn: () => unblacklistHCP(id, { reason: unblacklistReason }),
        onSuccess: () => { toast.success('Blacklist reversed. HCP set to active.'); setUBM(false); setUBR(''); inv(); },
        onError:   (e) => toast.error(e.response?.data?.message ?? 'Failed.'),
    });

    // ── Early returns ────────────────────────────────────────────────────────
    if (isLoading) return <div className="d-flex justify-content-center py-5"><LoadingSpinner /></div>;
    if (error)     return <ErrorAlert error={error} />;

    // ── Data extraction ──────────────────────────────────────────────────────
    // fetchHCP now returns response.data (unwrapped), so shape is { data: {...} }
    const hcp = hcpData?.data?.data || hcpData?.data || hcpData || {};
    if (!hcp || Object.keys(hcp).length === 0) return <ErrorAlert message="HCP not found" />;

    const status = typeof hcp.status === 'object' ? hcp.status?.value : hcp.status;

    // ── Permissions ──────────────────────────────────────────────────────────
    const canEdit = hasPermission('hcps.edit');
    const canAccredit = hasPermission('hcps.accredit');
    const canBlacklist = hasPermission('hcps.blacklist');
    const canSuspend = hasPermission('hcps.suspend');
    const canTariffs = hasPermission('hcps.tariffs');
    const canContracts = hasPermission('hcps.contracts');

    // ── Derived display ──────────────────────────────────────────────────────
    const score       = parseFloat(hcp.performance_score ?? 0);
    const scoreColor  = score >= 80 ? '#137333' : score >= 60 ? '#b05e00' : '#c5221f';
    const paymentStyle = PAYMENT_MODEL_STYLE[hcp.payment_model] ?? { bg: '#f3f4f6', color: '#6b7280', label: hcp.payment_model };

    const perfRows = (() => {
        if (!perfData) return [];
        // Shape: { data: { data: { current_score, history: [...] } } }
        if (Array.isArray(perfData?.data?.data?.history)) return perfData.data.data.history;
        // Fallbacks
        if (Array.isArray(perfData?.data?.data))          return perfData.data.data;
        if (Array.isArray(perfData?.data))                return perfData.data;
        if (Array.isArray(perfData))                      return perfData;
        return [];
    })();

    const perfChart = perfRows.map(p => ({
        label: `${p.period_month}/${p.period_year}`,
        score: parseFloat(p.score || 0),
        approved: p.total_claims_submitted > 0 ? Math.round(p.total_claims_approved / p.total_claims_submitted * 100) : 0,
        flags: p.total_fraud_flags || 0,
    }));

    const tariffs = (() => {
        if (!tariffData) return [];
        if (Array.isArray(tariffData)) return tariffData;
        if (tariffData.data?.data?.data && Array.isArray(tariffData.data?.data?.data)) return tariffData.data?.data?.data;
        return [];
    })();

    const contracts = (() => {
        if (!contractData) return [];
        // axios raw → { data: { data: [...] } }  (paginated)
        if (Array.isArray(contractData?.data?.data)) return contractData.data.data;
        // axios raw → { data: [...] }  (plain array)
        if (Array.isArray(contractData?.data))       return contractData.data;
        // already unwrapped → { data: [...] }
        if (Array.isArray(contractData?.data?.data)) return contractData.data.data;
        // already array
        if (Array.isArray(contractData))             return contractData;
        return [];
    })();

    const tabs = [
        { key: 'overview',     label: 'Overview' },
        canTariffs  && { key: 'tariffs',     label: 'Tariffs' },
        canContracts && { key: 'contracts',  label: 'Contracts' },
        { key: 'performance',  label: 'Performance' },
    ].filter(Boolean);

    return (
        <div>
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="d-flex align-items-start gap-3 mb-4">
                <button className="btn btn-light btn-sm mt-1" onClick={() => navigate('/hcps')}>
                    <ArrowLeft size={16} />
                </button>
                <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                        <h4 className="fw-bold mb-0">{hcp.name}</h4>
                        <StatusBadge status={status} color={STATUS_COLOR[status]} label={status} />
                        <span className={`badge bg-${TIER_COLOR[hcp.tier] ?? 'secondary'}-subtle text-${TIER_COLOR[hcp.tier] ?? 'secondary'}`}>
                            {hcp.tier}
                        </span>
                        <span className="badge bg-light text-dark border text-capitalize">{hcp.type}</span>
                        <span className="badge" style={{ background: paymentStyle.bg, color: paymentStyle.color, fontSize: 11 }}>
                            {paymentStyle.label}
                        </span>
                    </div>
                    <p className="text-muted mb-0 font-monospace" style={{ fontSize: 12 }}>
                        {hcp.hcp_code} · {hcp.city}, {hcp.state} · Branch: {hcp.branch?.name}
                    </p>
                </div>

                {/* ── Action buttons — context-aware by status ── */}
                <div className="d-flex gap-2 flex-wrap flex-shrink-0">

                    {/* Edit — always visible if permitted */}
                    {canEdit && (
                        <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                            onClick={() => navigate(`/hcps/${id}/edit`)}>
                            <Edit2 size={14} /> Edit
                        </button>
                    )}

                    {/* PENDING → Accredit (approve) */}
                    {canAccredit && status === 'pending' && (
                        <button className="btn btn-success btn-sm d-flex align-items-center gap-1"
                            onClick={() => accreditM.mutate()} disabled={accreditM.isPending}>
                            <CheckCircle size={14} />
                            {accreditM.isPending ? 'Accrediting…' : 'Accredit'}
                        </button>
                    )}

                    {/* ACTIVE → Suspend */}
                    {canSuspend && status === 'active' && (
                        <button className="btn btn-warning btn-sm d-flex align-items-center gap-1"
                            onClick={() => setSM(true)}>
                            <AlertTriangle size={14} /> Suspend
                        </button>
                    )}

                    {/* SUSPENDED → Reactivate */}
                    {canSuspend && status === 'suspended' && (
                        <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
                            onClick={() => reactivateM.mutate()} disabled={reactivateM.isPending}>
                            <CheckCircle size={14} />
                            {reactivateM.isPending ? 'Reactivating…' : 'Reactivate'}
                        </button>
                    )}

                    {/* NOT blacklisted/terminated → Blacklist */}
                    {canBlacklist && !['blacklisted', 'terminated'].includes(status) && (
                        <button className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                            onClick={() => setBM(true)}>
                            <XCircle size={14} /> Blacklist
                        </button>
                    )}

                    {/* BLACKLISTED → Reverse blacklist */}
                    {canBlacklist && status === 'blacklisted' && (
                        <button className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1"
                            onClick={() => setUBM(true)}>
                            <ShieldOff size={14} /> Reverse Blacklist
                        </button>
                    )}
                </div>
            </div>

            {/* ── KPI bar ──────────────────────────────────────────────────── */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-auto">
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                style={{ width: 58, height: 58, border: `4px solid ${scoreColor}`, color: scoreColor, fontSize: 15 }}>
                                {score.toFixed(0)}
                            </div>
                        </div>
                        <div className="col" style={{ maxWidth: 220 }}>
                            <div className="text-muted mb-1" style={{ fontSize: 11 }}>Performance Score</div>
                            <div className="progress" style={{ height: 7 }}>
                                <div className="progress-bar" style={{ width: `${score}%`, background: scoreColor }} />
                            </div>
                        </div>
                        {[
                            ['NHIS No.',        hcp.nhis_accreditation_no ?? '—'],
                            ['Accredited',      hcp.accredited_at ? formatDate(hcp.accredited_at) : '—'],
                            ['Contract Expiry', hcp.contract_expiry_date ? formatDate(hcp.contract_expiry_date) : '—'],
                            ['Payment Model',   hcp.payment_model?.replace(/_/g, ' ') ?? '—'],
                            ['FFS Tariff',      hcp.ffs_tariff_enforced ? '✓ Strict' : 'Flexible'],
                        ].map(([l, v]) => (
                            <div key={l} className="col-auto text-center border-start ps-4">
                                <div className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
                                <div className="fw-semibold" style={{ fontSize: 13 }}>{v || '—'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── FFS Contract Banner ───────────────────────────────────────── */}
            {['fee_for_service', 'hybrid'].includes(hcp.payment_model) && (
                <div className="alert d-flex align-items-start gap-2 mb-4 py-2"
                    style={{ fontSize: 13, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <FileText size={16} className="flex-shrink-0 mt-1 text-success" />
                    <div>
                        <strong>FFS Contract:</strong> {hcp.ffs_contract_ref || 'No reference'} ·
                        {hcp.ffs_contract_start && ` Valid from ${formatDate(hcp.ffs_contract_start)}`}
                        {hcp.ffs_contract_end   && ` to ${formatDate(hcp.ffs_contract_end)}`}
                        {!hcp.ffs_contract_end  && ' (Open-ended)'}
                        {hcp.ffs_contract_end && (() => {
                            const d = Math.ceil((new Date(hcp.ffs_contract_end) - new Date()) / 86400000);
                            if (d < 0)  return <span className="ms-2 text-danger fw-semibold">⚠️ Expired</span>;
                            if (d < 30) return <span className="ms-2 text-warning fw-semibold">⚠️ Expires in {d} days</span>;
                            return null;
                        })()}
                    </div>
                </div>
            )}

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <ul className="nav nav-tabs mb-4" style={{ fontSize: 13 }}>
                {tabs.map(t => (
                    <li key={t.key} className="nav-item">
                        <button className={`nav-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                            {t.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* ── Overview ─────────────────────────────────────────────────── */}
            {tab === 'overview' && (
                <div className="row g-4">
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-header bg-white border-0 pt-3 pb-0">
                                <h6 className="fw-semibold" style={{ fontSize: 13 }}>
                                    <Building2 size={14} className="me-1 text-primary" />Provider Details
                                </h6>
                            </div>
                            <div className="card-body">
                                <dl className="row mb-0" style={{ fontSize: 13 }}>
                                    {[
                                        ['Type',                 hcp.type],
                                        ['Tier',                 hcp.tier],
                                        ['LGA',                  hcp.lga],
                                        ['State',                hcp.state],
                                        ['Address',              hcp.address],
                                        ['Payment Model',        hcp.payment_model?.replace(/_/g, ' ')],
                                        ['FFS Contract Ref',     hcp.ffs_contract_ref],
                                        ['FFS Tariff Enforced',  hcp.ffs_tariff_enforced ? 'Yes' : 'No'],
                                    ].map(([l, v]) => v ? (
                                        <React.Fragment key={l}>
                                            <dt className="col-5 text-muted">{l}</dt>
                                            <dd className="col-7 mb-2">{v}</dd>
                                        </React.Fragment>
                                    ) : null)}
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-header bg-white border-0 pt-3 pb-0">
                                <h6 className="fw-semibold" style={{ fontSize: 13 }}>
                                    <Phone size={14} className="me-1 text-primary" />Contact &amp; Banking
                                </h6>
                            </div>
                            <div className="card-body">
                                <dl className="row mb-0" style={{ fontSize: 13 }}>
                                    {[
                                        ['Phone',    hcp.phone],
                                        ['Email',    hcp.email],
                                        ['Bank',     hcp.active_bank?.bank_name],
                                        ['Account',  hcp.active_bank?.account_number],
                                        ['Verified', hcp.active_bank?.verified_at ? '✓ Yes' : 'Not verified'],
                                    ].map(([l, v]) => v ? (
                                        <React.Fragment key={l}>
                                            <dt className="col-5 text-muted">{l}</dt>
                                            <dd className="col-7 mb-2">{v}</dd>
                                        </React.Fragment>
                                    ) : null)}
                                </dl>
                            </div>
                        </div>
                    </div>
                    {hcp.notes && (
                        <div className="col-12">
                            <div className="card border-0 shadow-sm">
                                <div className="card-body">
                                    <div className="text-muted mb-1" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</div>
                                    <p className="mb-0" style={{ fontSize: 13 }}>{hcp.notes}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tariffs ──────────────────────────────────────────────────── */}
            {tab === 'tariffs' && (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted" style={{ fontSize: 13 }}>{tariffs.length} tariff lines</span>
                        {canTariffs && (
                            <button className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                onClick={() => { setET(null); setTM(true); }}>
                                <Plus size={14} /> Add Tariff
                            </button>
                        )}
                    </div>
                    {tLoad ? <div className="text-center py-4"><LoadingSpinner /></div> : (
                        <div className="card border-0 shadow-sm">
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ fontSize: 11 }}>Code</th>
                                            <th style={{ fontSize: 11 }}>Service Name</th>
                                            <th style={{ fontSize: 11 }}>Category</th>
                                            <th className="text-end" style={{ fontSize: 11 }}>Agreed</th>
                                            <th className="text-end" style={{ fontSize: 11 }}>NHIS</th>
                                            <th style={{ fontSize: 11 }}>Effective</th>
                                            <th style={{ fontSize: 11 }}>Status</th>
                                            {canTariffs && <th />}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tariffs.map(t => (
                                            <tr key={t.id}>
                                                <td className="font-monospace" style={{ fontSize: 10 }}>{t.service_code}</td>
                                                <td style={{ fontSize: 13 }}>{t.service_name}</td>
                                                <td><span className="badge bg-light text-dark border" style={{ fontSize: 10 }}>{t.category}</span></td>
                                                <td className="text-end fw-semibold" style={{ fontSize: 13 }}>{formatCurrency(t.agreed_price)}</td>
                                                <td className="text-end text-muted" style={{ fontSize: 12 }}>{t.nhis_price ? formatCurrency(t.nhis_price) : '—'}</td>
                                                <td style={{ fontSize: 11 }}>{formatDate(t.effective_from)}{t.effective_to && <> – {formatDate(t.effective_to)}</>}</td>
                                                <td>
                                                    <span className={`badge ${t.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: 10 }}>
                                                        {t.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                {canTariffs && (
                                                    <td>
                                                        <button className="btn btn-sm btn-outline-secondary py-0" style={{ fontSize: 11 }}
                                                            onClick={() => { setET(t); setTM(true); }}>Edit</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {tariffs.length === 0 && (
                                            <tr><td colSpan={8} className="text-center text-muted py-4">No tariffs yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {tariffModal && (
                        <TariffModal hcpId={id} existing={editingTariff}
                            onClose={() => { setTM(false); setET(null); }}
                            onSaved={() => { setTM(false); setET(null); qc.invalidateQueries({ queryKey: ['hcp-tariffs', id] }); }} />
                    )}
                </div>
            )}

            {/* ── Contracts ────────────────────────────────────────────────── */}
            {tab === 'contracts' && (
                <div>
                    <div className="d-flex justify-content-end mb-3">
                        {canContracts && (
                            <button className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                onClick={() => setCM(true)}>
                                <Plus size={14} /> New Contract
                            </button>
                        )}
                    </div>
                    <div className="vstack gap-3">
                        {contractsLoading ? (
                            <div className="text-center py-4"><LoadingSpinner /></div>
                        ) : contracts.length === 0 ? (
                            <div className="card border-0 shadow-sm">
                                <div className="card-body text-center py-5 text-muted">
                                    <FileText size={36} className="mb-2 opacity-25" />
                                    <p className="mb-0">No contracts on file.</p>
                                </div>
                            </div>
                        ) : (
                            contracts.map(c => (
                                <div key={c.id} className="card border-0 shadow-sm">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <span className="fw-semibold font-monospace" style={{ fontSize: 13 }}>{c.contract_number}</span>
                                                <span className={`badge ms-2 ${c.status === 'active' ? 'bg-success-subtle text-success' : c.status === 'expired' ? 'bg-secondary-subtle text-secondary' : 'bg-warning-subtle text-warning'}`} style={{ fontSize: 10 }}>
                                                    {c.status}
                                                </span>
                                            </div>
                                            <div className="text-muted" style={{ fontSize: 12 }}>
                                                {formatDate(c.start_date)} — {formatDate(c.end_date)}
                                            </div>
                                        </div>
                                        <div className="row g-3" style={{ fontSize: 13 }}>
                                            <div className="col-md-3">
                                                <div className="text-muted" style={{ fontSize: 11 }}>Payment Model</div>
                                                <div className="fw-semibold text-capitalize">{c.payment_model?.replace(/_/g, ' ')}</div>
                                            </div>
                                            {c.capitation_rate > 0 && (
                                                <div className="col-md-3">
                                                    <div className="text-muted" style={{ fontSize: 11 }}>Capitation Rate</div>
                                                    <div className="fw-semibold">{formatCurrency(c.capitation_rate)}/mbr/mo</div>
                                                </div>
                                            )}
                                            {c.signed_by && (
                                                <div className="col-md-3">
                                                    <div className="text-muted" style={{ fontSize: 11 }}>Signed By</div>
                                                    <div>{c.signed_by?.name}</div>
                                                </div>
                                            )}
                                            {c.signed_at && (
                                                <div className="col-md-3">
                                                    <div className="text-muted" style={{ fontSize: 11 }}>Signed</div>
                                                    <div>{formatDate(c.signed_at)}</div>
                                                </div>
                                            )}
                                        </div>
                                        {c.terms_summary && (
                                            <p className="text-muted mb-0 mt-2" style={{ fontSize: 12 }}>{c.terms_summary}</p>
                                        )}
                                        {c.document_path && (
                                            <a href={c.document_path} target="_blank" rel="noreferrer"
                                                className="btn btn-sm btn-outline-secondary mt-2 d-inline-flex align-items-center gap-1">
                                                <Download size={12} /> Download PDF
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {contractModal && (
                        <ContractModal hcpId={id}
                            onClose={() => setCM(false)}
                            onSaved={() => { setCM(false); qc.invalidateQueries({ queryKey: ['hcp-contracts', id] }); }} />
                    )}
                </div>
            )}

            {/* ── Performance ──────────────────────────────────────────────── */}
            {tab === 'performance' && (
                <div className="row g-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-0 pt-3 pb-0">
                                <h6 className="fw-semibold" style={{ fontSize: 13 }}>Score Trend (last 6 months)</h6>
                            </div>
                            <div className="card-body">
                                {perfLoading ? (
                                    <div className="text-center py-4"><LoadingSpinner /></div>
                                ) : perfChart.length === 0 ? (
                                    <p className="text-muted text-center py-3">No performance data yet.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={230}>
                                        <LineChart data={perfChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={v => [`${v}%`]} />
                                            <Line type="monotone" dataKey="score"    stroke="#1967d2" strokeWidth={2} dot={{ r: 4 }} name="Score" />
                                            <Line type="monotone" dataKey="approved" stroke="#137333" strokeWidth={2} dot={{ r: 3 }} name="Approval %" strokeDasharray="4 2" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                    {perfChart.length > 0 && (
                        <>
                            <div className="col-md-6">
                                <div className="card border-0 shadow-sm">
                                    <div className="card-header bg-white border-0 pt-3 pb-0">
                                        <h6 className="fw-semibold" style={{ fontSize: 13 }}>Fraud Flags by Period</h6>
                                    </div>
                                    <div className="card-body">
                                        <ResponsiveContainer width="100%" height={180}>
                                            <BarChart data={perfChart}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                                <Tooltip />
                                                <Bar dataKey="flags" fill="#c5221f" name="Flags" radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-header bg-white border-0 pt-3 pb-0">
                                        <h6 className="fw-semibold" style={{ fontSize: 13 }}>Monthly Summary</h6>
                                    </div>
                                    <div className="card-body p-0">
                                        <table className="table table-sm mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ fontSize: 11 }}>Period</th>
                                                    <th className="text-end" style={{ fontSize: 11 }}>Submitted</th>
                                                    <th className="text-end" style={{ fontSize: 11 }}>Approved</th>
                                                    <th className="text-end" style={{ fontSize: 11 }}>Flags</th>
                                                    <th className="text-end" style={{ fontSize: 11 }}>Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {perfRows.slice().reverse().slice(0, 6).map(p => (
                                                    <tr key={p.id}>
                                                        <td style={{ fontSize: 11 }}>{p.period_month}/{p.period_year}</td>
                                                        <td className="text-end" style={{ fontSize: 11 }}>{p.total_claims_submitted}</td>
                                                        <td className="text-end" style={{ fontSize: 11 }}>{p.total_claims_approved}</td>
                                                        <td className="text-end" style={{ fontSize: 11, color: p.total_fraud_flags > 0 ? '#c5221f' : '#137333' }}>{p.total_fraud_flags}</td>
                                                        <td className="text-end fw-semibold" style={{ fontSize: 11, color: p.score >= 80 ? '#137333' : p.score >= 60 ? '#b05e00' : '#c5221f' }}>{p.score}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Suspend Modal ─────────────────────────────────────────────── */}
            {suspendModal && (
                <>
                    <div className="modal-backdrop fade show" />
                    <div className="modal d-block">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header border-0">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <AlertTriangle size={16} className="text-warning" /> Suspend HCP Temporarily
                                    </h6>
                                    <button className="btn-close" onClick={() => setSM(false)} />
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted" style={{ fontSize: 13 }}>
                                        Suspending <strong>{hcp.name}</strong> will prevent new PA requests and claims. This is temporary — use Blacklist for confirmed fraud.
                                    </p>
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                        Reason <span className="text-danger">*</span>
                                    </label>
                                    <textarea className="form-control" rows={3} value={suspendReason}
                                        onChange={e => setSR(e.target.value)}
                                        placeholder="Quality issue, fraud investigation, etc." />
                                </div>
                                <div className="modal-footer border-0">
                                    <button className="btn btn-light" onClick={() => setSM(false)}>Cancel</button>
                                    <button className="btn btn-warning"
                                        disabled={suspendReason.length < 10 || suspendM.isPending}
                                        onClick={() => suspendM.mutate()}>
                                        {suspendM.isPending ? 'Suspending…' : 'Confirm Suspension'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Blacklist Modal ───────────────────────────────────────────── */}
            {blacklistModal && (
                <>
                    <div className="modal-backdrop fade show" />
                    <div className="modal d-block">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header border-0">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <XCircle size={16} className="text-danger" /> Blacklist HCP
                                    </h6>
                                    <button className="btn-close" onClick={() => setBM(false)} />
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted" style={{ fontSize: 13 }}>
                                        This will permanently block <strong>{hcp.name}</strong> from submitting new claims. All pending claims will be flagged.
                                    </p>
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                        Reason <span className="text-danger">*</span>
                                    </label>
                                    <textarea className="form-control" rows={3} value={blacklistReason}
                                        onChange={e => setBR(e.target.value)}
                                        placeholder="Describe why this HCP is being blacklisted…" />
                                </div>
                                <div className="modal-footer border-0">
                                    <button className="btn btn-light" onClick={() => setBM(false)}>Cancel</button>
                                    <button className="btn btn-danger"
                                        disabled={blacklistReason.length < 10 || blacklistM.isPending}
                                        onClick={() => blacklistM.mutate()}>
                                        {blacklistM.isPending ? 'Processing…' : 'Confirm Blacklist'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Reverse Blacklist Modal ───────────────────────────────────── */}
            {unblacklistModal && (
                <>
                    <div className="modal-backdrop fade show" />
                    <div className="modal d-block">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header border-0">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <ShieldOff size={16} className="text-warning" /> Reverse Blacklist
                                    </h6>
                                    <button className="btn-close" onClick={() => setUBM(false)} />
                                </div>
                                <div className="modal-body">
                                    <p className="text-muted" style={{ fontSize: 13 }}>
                                        This will restore <strong>{hcp.name}</strong> to <strong>active</strong> status. Document the reason for reversal.
                                    </p>
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                        Reason for Reversal <span className="text-danger">*</span>
                                    </label>
                                    <textarea className="form-control" rows={3} value={unblacklistReason}
                                        onChange={e => setUBR(e.target.value)}
                                        placeholder="e.g. Investigation cleared, issue resolved, wrongful blacklisting…" />
                                </div>
                                <div className="modal-footer border-0">
                                    <button className="btn btn-light" onClick={() => setUBM(false)}>Cancel</button>
                                    <button className="btn btn-warning"
                                        disabled={unblacklistReason.length < 10 || unblacklistM.isPending}
                                        onClick={() => unblacklistM.mutate()}>
                                        {unblacklistM.isPending ? 'Processing…' : 'Confirm Reversal'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── TariffModal ───────────────────────────────────────────────────────────────
function TariffModal({ hcpId, existing, onClose, onSaved }) {
    const [f, setF] = useState({
        service_code:   existing?.service_code   ?? '',
        service_name:   existing?.service_name   ?? '',
        category:       existing?.category       ?? 'consultation',
        agreed_price:   existing?.agreed_price   ?? '',
        nhis_price:     existing?.nhis_price     ?? '',
        effective_from: existing?.effective_from?.slice(0, 10) ?? '',
        effective_to:   existing?.effective_to?.slice(0, 10)   ?? '',
        is_active:      existing?.is_active      ?? true,
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        try {
            setSaving(true);
            if (existing) await updateTariff(hcpId, existing.id, f);
            else          await addTariff(hcpId, f);
            toast.success(existing ? 'Tariff updated.' : 'Tariff added.');
            onSaved();
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="modal-backdrop fade show" />
            <div className="modal d-block">
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h6 className="modal-title">{existing ? 'Edit' : 'Add'} Tariff</h6>
                            <button className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Service Code *</label>
                                    <input className="form-control" value={f.service_code}
                                        onChange={e => setF(p => ({ ...p, service_code: e.target.value }))}
                                        placeholder="e.g. CONS-001" />
                                </div>
                                <div className="col-md-8">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Service Name *</label>
                                    <input className="form-control" value={f.service_name}
                                        onChange={e => setF(p => ({ ...p, service_name: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Category *</label>
                                    <select className="form-select" value={f.category}
                                        onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Agreed Price (₦) *</label>
                                    <input type="number" className="form-control" value={f.agreed_price} min="0" step="0.01"
                                        onChange={e => setF(p => ({ ...p, agreed_price: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>NHIS Price (₦)</label>
                                    <input type="number" className="form-control" value={f.nhis_price} min="0" step="0.01"
                                        onChange={e => setF(p => ({ ...p, nhis_price: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Effective From *</label>
                                    <input type="date" className="form-control" value={f.effective_from}
                                        onChange={e => setF(p => ({ ...p, effective_from: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Effective To</label>
                                    <input type="date" className="form-control" value={f.effective_to}
                                        onChange={e => setF(p => ({ ...p, effective_to: e.target.value }))} />
                                </div>
                                <div className="col-md-4 d-flex align-items-end pb-2">
                                    <div className="form-check">
                                        <input type="checkbox" className="form-check-input" id="ta"
                                            checked={f.is_active}
                                            onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} />
                                        <label className="form-check-label" htmlFor="ta" style={{ fontSize: 13 }}>Active</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-light" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary" onClick={save}
                                disabled={saving || !f.service_name || !f.agreed_price}>
                                {saving ? 'Saving…' : 'Save Tariff'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── ContractModal ─────────────────────────────────────────────────────────────
function ContractModal({ hcpId, onClose, onSaved }) {
    const [f, setF] = useState({
        contract_number: '', start_date: '', end_date: '',
        payment_model: 'fee_for_service', capitation_rate: '', terms_summary: '',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        try {
            setSaving(true);
            await createContract(hcpId, f);
            toast.success('Contract created.');
            onSaved();
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="modal-backdrop fade show" />
            <div className="modal d-block">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h6 className="modal-title">New Contract</h6>
                            <button className="btn-close" onClick={onClose} />
                        </div>
                        <div className="modal-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Contract Number *</label>
                                    <input className="form-control" value={f.contract_number}
                                        onChange={e => setF(p => ({ ...p, contract_number: e.target.value }))} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Start Date</label>
                                    <input type="date" className="form-control" value={f.start_date}
                                        onChange={e => setF(p => ({ ...p, start_date: e.target.value }))} />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>End Date</label>
                                    <input type="date" className="form-control" value={f.end_date}
                                        onChange={e => setF(p => ({ ...p, end_date: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Payment Model</label>
                                    <select className="form-select" value={f.payment_model}
                                        onChange={e => setF(p => ({ ...p, payment_model: e.target.value }))}>
                                        <option value="fee_for_service">Fee for Service</option>
                                        <option value="capitation">Capitation</option>
                                        <option value="hybrid">Hybrid</option>
                                    </select>
                                </div>
                                {['capitation', 'hybrid'].includes(f.payment_model) && (
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Capitation Rate (₦/mbr/mo)</label>
                                        <input type="number" className="form-control" value={f.capitation_rate} min="0"
                                            onChange={e => setF(p => ({ ...p, capitation_rate: e.target.value }))} />
                                    </div>
                                )}
                                <div className="col-12">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Terms Summary</label>
                                    <textarea className="form-control" rows={3} value={f.terms_summary}
                                        onChange={e => setF(p => ({ ...p, terms_summary: e.target.value }))} />
                                </div>
                                <div className="col-12">
                                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Contract Document (PDF)</label>
                                    <input type="file" className="form-control" accept=".pdf"
                                        onChange={e => setF(p => ({ ...p, document: e.target.files[0] }))} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-light" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary" onClick={save}
                                disabled={saving || !f.contract_number}>
                                {saving ? 'Saving…' : 'Create Contract'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
