/**
 * FILE LOCATION: resources/js/pages/portal/corporate/CorpEnrolleesPage.jsx
 * PATCH NOTE: complete replacement of your real file (382 lines, verified).
 * Additions marked [PHASE 7]: row checkboxes, bulk delist/reactivate
 * toolbar, per-row reactivate button (was missing), per-row inline
 * "Change plan" dropdown wired against the actual table markup.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Search, Plus, Upload, Download, Trash2, Users,
    X, User, AlertTriangle, RotateCcw, Repeat, CheckSquare, Square,
} from 'lucide-react';
import {
    fetchCorpPortalEnrollees, corpPortalAddEnrollee,
    corpPortalRemoveEnrollee, corpPortalBulkUpload,
    corpPortalReactivateEnrollee, corpPortalBulkUpdateEnrolleeStatus,
    fetchCorpAvailablePlans, corpPortalUpgradeEnrolleeTier,
} from '../../../api/index';
import { formatDate } from '../../../utils/format';

export default function CorpEnrolleesPage() {
    const qc = useQueryClient();
    const [search,      setSearch]      = useState('');
    const [statusFilter,setStatusFilter]= useState('');
    const [page,        setPage]        = useState(1);
    const [addModal,    setAddModal]    = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState(null);
    const [bulkModal,   setBulkModal]   = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [planDropdownFor, setPlanDropdownFor] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['corp-enrollees', search, statusFilter, page],
        queryFn:  () => fetchCorpPortalEnrollees({ search, status: statusFilter, page }),
        keepPreviousData: true,
    });

    const enrollees = data?.data ?? [];
    const meta      = data?.meta ?? {};

    const removeMutation = useMutation({
        mutationFn: (id) => corpPortalRemoveEnrollee(id),
        onSuccess: () => {
            toast.success('Enrollee removed successfully.');
            setRemoveConfirm(null);
            qc.invalidateQueries({ queryKey: ['corp-enrollees'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to remove enrollee.'),
    });

    const reactivateMutation = useMutation({
        mutationFn: (id) => corpPortalReactivateEnrollee(id),
        onSuccess: () => {
            toast.success('Enrollee reactivated.');
            qc.invalidateQueries({ queryKey: ['corp-enrollees'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to reactivate enrollee.'),
    });

    const bulkStatusMutation = useMutation({
        mutationFn: ({ ids, status }) => corpPortalBulkUpdateEnrolleeStatus(ids, status),
        onSuccess: (res) => {
            toast.success(res.message);
            setSelectedIds([]);
            qc.invalidateQueries({ queryKey: ['corp-enrollees'] });
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Bulk update failed.'),
    });

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === enrollees.length ? [] : enrollees.map(e => e.id));
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 }}>
                    Staff & Enrollees
                </h1>
                <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>
                    Manage your enrolled staff members and their dependants
                </p>
            </div>

            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
                <div style={{ position:'relative', flex:'1 1 260px' }}>
                    <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#a0aec0' }} />
                    <input
                        value={search} onChange={e=>setSearch(e.target.value)}
                        placeholder="Search by name, staff ID, or email…"
                        style={{ ...inputStyle, paddingLeft:32 }}
                    />
                </div>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={inputStyle}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                </select>
                <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
                    <BtnSecondary icon={Upload} label="Bulk Upload" onClick={() => setBulkModal(true)} />
                    <BtnPrimary   icon={Plus}   label="Add Staff"   onClick={() => setAddModal(true)} />
                </div>
            </div>

            <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
                <Pill label="Total" value={meta.total ?? 0} color="#0f4c81" />
                <Pill label="Active" value={meta.active_count ?? 0} color="#137333" />
                <Pill label="Suspended" value={meta.suspended_count ?? 0} color="#b45309" />
                <Pill label="With Dependants" value={meta.with_dependants_count ?? 0} color="#5e35b1" />
            </div>

            {selectedIds.length > 0 && (
                <div style={bulkBarStyle}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#2d3748' }}>
                        {selectedIds.length} selected
                    </span>
                    <button
                        onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'inactive' })}
                        disabled={bulkStatusMutation.isPending}
                        style={bulkBtnStyle('#fce8e6', '#c5221f')}
                    >
                        Delist selected
                    </button>
                    <button
                        onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'active' })}
                        disabled={bulkStatusMutation.isPending}
                        style={bulkBtnStyle('#e6f4ea', '#137333')}
                    >
                        Reactivate selected
                    </button>
                    <button onClick={() => setSelectedIds([])} style={bulkBtnStyle('#f0f0f0', '#4a5568')}>
                        Clear
                    </button>
                </div>
            )}

            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e8ecf0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                        <tr style={{ background:'#f7fafc', borderBottom:'1px solid #e8ecf0' }}>
                            <th style={{ ...thStyle, width: 36 }}>
                                <button onClick={toggleSelectAll} style={checkboxBtnStyle}>
                                    {selectedIds.length === enrollees.length && enrollees.length > 0
                                        ? <CheckSquare size={16} color="#0f4c81" />
                                        : <Square size={16} color="#a0aec0" />}
                                </button>
                            </th>
                            {['Employee', 'Member No.', 'Plan', 'Dependants', 'Enrolled', 'Status', 'Actions'].map(h => (
                                <th key={h} style={thStyle}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#a0aec0' }}>Loading…</td></tr>
                        ) : !enrollees.length ? (
                            <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'#a0aec0' }}>
                                <Users size={32} style={{ display:'block', margin:'0 auto 8px', opacity:0.4 }} />
                                No enrollees found
                            </td></tr>
                        ) : enrollees.map(e => (
                            <tr key={e.id} style={{ borderBottom:'1px solid #f0f4f8', transition:'background 0.1s' }}
                                onMouseEnter={ev=>ev.currentTarget.style.background='#f7fafc'}
                                onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                                <td style={tdStyle}>
                                    <button onClick={() => toggleSelect(e.id)} style={checkboxBtnStyle}>
                                        {selectedIds.includes(e.id)
                                            ? <CheckSquare size={16} color="#0f4c81" />
                                            : <Square size={16} color="#a0aec0" />}
                                    </button>
                                </td>
                                <td style={tdStyle}>
                                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                        <div style={{
                                            width:32, height:32, borderRadius:'50%',
                                            background:'linear-gradient(135deg, #e8f0fe, #c7d9f8)',
                                            display:'flex', alignItems:'center', justifyContent:'center',
                                            fontSize:12, fontWeight:700, color:'#0f4c81',
                                        }}>
                                            {e.first_name?.[0]}{e.last_name?.[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight:600, fontSize:13 }}>{e.first_name} {e.last_name}</div>
                                            <div style={{ fontSize:11, color:'#718096' }}>{e.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...tdStyle, fontFamily:'monospace', fontSize:12 }}>{e.enrollee_id}</td>
                                <td style={tdStyle}>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setPlanDropdownFor(planDropdownFor === e.id ? null : e.id)}
                                            style={{ ...planBadge, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            {e.plan_name ?? '—'} <Repeat size={11} />
                                        </button>
                                        {planDropdownFor === e.id && (
                                            <TierUpgradeDropdown
                                                enrolleeId={e.id}
                                                currentPlanId={e.plan_id}
                                                onClose={() => setPlanDropdownFor(null)}
                                                onDone={() => { setPlanDropdownFor(null); qc.invalidateQueries({ queryKey: ['corp-enrollees'] }); }}
                                            />
                                        )}
                                    </div>
                                </td>
                                <td style={{ ...tdStyle, textAlign:'center' }}>
                                    <span style={{ fontWeight:600, color: e.dependants_count>0?'#0f4c81':'#a0aec0' }}>
                                        {e.dependants_count ?? 0}
                                    </span>
                                </td>
                                <td style={{ ...tdStyle, fontSize:12, color:'#718096' }}>{formatDate(e.enrolled_at)}</td>
                                <td style={tdStyle}><EnrolleeStatusBadge status={e.status} /></td>
                                <td style={tdStyle}>
                                    <div style={{ display:'flex', gap:6 }}>
                                        <ActionBtn icon={Download} tip="Download ID Card"
                                            onClick={() => window.open(`/api/v1/enrollees/${e.id}/card`, '_blank')} />
                                        {e.status === 'active' ? (
                                            <ActionBtn icon={Trash2} tip="Remove Enrollee" danger
                                                onClick={() => setRemoveConfirm(e)} />
                                        ) : (
                                            <ActionBtn icon={RotateCcw} tip="Reactivate"
                                                onClick={() => reactivateMutation.mutate(e.id)} />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {meta.last_page > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:6, padding:16, borderTop:'1px solid #f0f4f8' }}>
                        {Array.from({ length: meta.last_page }, (_, i) => i+1).map(p => (
                            <button key={p} onClick={()=>setPage(p)} style={{
                                width:32, height:32, borderRadius:8, border:'1px solid',
                                borderColor: p===page?'#0f4c81':'#e2e8f0',
                                background: p===page?'#0f4c81':'#fff',
                                color: p===page?'#fff':'#4a5568',
                                cursor:'pointer', fontSize:13,
                            }}>{p}</button>
                        ))}
                    </div>
                )}
            </div>

            {addModal && <AddEnrolleeModal onClose={() => setAddModal(false)} onSuccess={() => { setAddModal(false); qc.invalidateQueries({ queryKey:['corp-enrollees'] }); }} />}
            {bulkModal && <BulkUploadModal onClose={() => setBulkModal(false)} onSuccess={() => { setBulkModal(false); qc.invalidateQueries({ queryKey:['corp-enrollees'] }); }} />}

            {removeConfirm && (
                <Modal title="Remove Enrollee" onClose={() => setRemoveConfirm(null)}>
                    <div style={{ textAlign:'center', padding:'8px 0' }}>
                        <AlertTriangle size={40} color="#f59e0b" style={{ marginBottom:12 }} />
                        <p style={{ fontSize:14, color:'#4a5568' }}>
                            Are you sure you want to remove <strong>{removeConfirm.first_name} {removeConfirm.last_name}</strong> from your health plan?
                        </p>
                        <p style={{ fontSize:12, color:'#718096' }}>
                            Their coverage will end from today. You can reactivate them later from this list.
                        </p>
                    </div>
                    <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16 }}>
                        <button onClick={() => setRemoveConfirm(null)} style={btnSecondaryStyle}>Cancel</button>
                        <button
                            onClick={() => removeMutation.mutate(removeConfirm.id)}
                            disabled={removeMutation.isPending}
                            style={{ ...btnDangerStyle }}
                        >
                            {removeMutation.isPending ? 'Removing…' : 'Yes, Remove'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function TierUpgradeDropdown({ enrolleeId, currentPlanId, onClose, onDone }) {
    const { data } = useQuery({
        queryKey: ['corp-available-plans'],
        queryFn: fetchCorpAvailablePlans,
    });

    const upgradeMutation = useMutation({
        mutationFn: (planId) => corpPortalUpgradeEnrolleeTier(enrolleeId, planId),
        onSuccess: (res) => { toast.success(res.message); onDone(); },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to change plan.'),
    });

    const plans = (data?.data ?? []).filter(p => p.id !== currentPlanId);

    return (
        <div style={dropdownStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#718096' }}>Move to plan</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={12} color="#a0aec0" />
                </button>
            </div>
            {!plans.length ? (
                <div style={{ fontSize: 12, color: '#a0aec0', padding: 8 }}>No other plans available</div>
            ) : plans.map(p => (
                <button
                    key={p.id}
                    onClick={() => upgradeMutation.mutate(p.id)}
                    disabled={upgradeMutation.isPending}
                    style={dropdownItemStyle}
                >
                    {p.plan_name} <span style={{ color: '#a0aec0', fontSize: 11 }}>({p.tier})</span>
                </button>
            ))}
        </div>
    );
}

function AddEnrolleeModal({ onClose, onSuccess }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        first_name:'', last_name:'', email:'', phone:'', gender:'',
        date_of_birth:'', staff_id:'', plan_id:'',
    });

    const { data: plansData } = useQuery({
        queryKey: ['corp-available-plans'],
        queryFn: fetchCorpAvailablePlans,
    });

    const mutation = useMutation({
        mutationFn: () => corpPortalAddEnrollee(form),
        onSuccess:  () => { toast.success('Staff member enrolled successfully.'); onSuccess(); },
        onError:    (e) => toast.error(e.response?.data?.message ?? 'Enrolment failed.'),
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const valid = form.first_name && form.last_name && form.email && form.date_of_birth && form.plan_id;

    return (
        <Modal title="Add Staff Member" onClose={onClose} wide>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="First Name *" value={form.first_name} onChange={v=>set('first_name',v)} />
                <Field label="Last Name *"  value={form.last_name}  onChange={v=>set('last_name',v)} />
                <Field label="Email *"      value={form.email}      onChange={v=>set('email',v)} type="email" />
                <Field label="Phone"        value={form.phone}      onChange={v=>set('phone',v)} type="tel" />
                <Field label="Date of Birth *" value={form.date_of_birth} onChange={v=>set('date_of_birth',v)} type="date" />
                <div>
                    <label style={labelStyle}>Gender</label>
                    <select value={form.gender} onChange={e=>set('gender',e.target.value)} style={inputStyle}>
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Plan *</label>
                    <select value={form.plan_id} onChange={e=>set('plan_id',e.target.value)} style={inputStyle}>
                        <option value="">Select plan</option>
                        {(plansData?.data ?? []).map(p => (
                            <option key={p.id} value={p.id}>{p.plan_name} ({p.tier})</option>
                        ))}
                    </select>
                </div>
                <Field label="Staff / Employee ID" value={form.staff_id} onChange={v=>set('staff_id',v)} span={2} />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
                <button onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
                <button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending} style={btnPrimaryStyle}>
                    {mutation.isPending ? 'Enrolling…' : 'Enrol Staff Member'}
                </button>
            </div>
        </Modal>
    );
}

function BulkUploadModal({ onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const mutation = useMutation({
        mutationFn: () => {
            const fd = new FormData(); fd.append('file', file);
            return corpPortalBulkUpload(fd);
        },
        onSuccess: (res) => {
            toast.success(`Upload complete: ${res.data?.data?.imported ?? 0} enrolled, ${res.data?.data?.errors ?? 0} errors.`);
            onSuccess();
        },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Upload failed.'),
    });

    return (
        <Modal title="Bulk Upload Enrollees" onClose={onClose}>
            <p style={{ fontSize:13, color:'#4a5568', marginBottom:16 }}>
                Upload a CSV file with columns: <code>first_name, last_name, email, phone, gender, date_of_birth, staff_id</code>
            </p>
            <a
                href="/templates/bulk-enrollee-template.csv"
                download
                style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#0f4c81', marginBottom:16 }}
            >
                <Download size={14} /> Download template
            </a>
            <div
                onClick={() => document.getElementById('bulk-file').click()}
                style={{
                    border:'2px dashed #c5d5e8', borderRadius:12, padding:'28px 16px',
                    textAlign:'center', cursor:'pointer', background: file ? '#f0f7ff' : '#f7fafc',
                    marginBottom:16,
                }}
            >
                <input id="bulk-file" type="file" accept=".csv,.xlsx" style={{ display:'none' }}
                    onChange={e => setFile(e.target.files[0])} />
                <Upload size={28} color="#0f4c81" style={{ marginBottom:8 }} />
                <div style={{ fontSize:13, color:'#4a5568' }}>{file ? file.name : 'Click to select CSV or Excel file'}</div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
                <button onClick={() => mutation.mutate()} disabled={!file || mutation.isPending} style={btnPrimaryStyle}>
                    {mutation.isPending ? 'Uploading…' : 'Upload & Enrol'}
                </button>
            </div>
        </Modal>
    );
}

function Modal({ title, onClose, children, wide }) {
    return (
        <>
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000 }} onClick={onClose} />
            <div style={{
                position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                background:'#fff', borderRadius:16, padding:'24px 28px',
                width: wide ? 560 : 440, maxWidth:'95vw', zIndex:1001,
                boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto',
            }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                    <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#1a202c' }}>{title}</h3>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                        <X size={18} color="#718096" />
                    </button>
                </div>
                {children}
            </div>
        </>
    );
}

function Field({ label, value, onChange, type='text', span }) {
    return (
        <div style={span === 2 ? { gridColumn:'1/-1' } : {}}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={e=>onChange(e.target.value)} style={inputStyle} />
        </div>
    );
}

function BtnPrimary({ icon: Icon, label, onClick }) {
    return (
        <button onClick={onClick} style={{ ...btnPrimaryStyle, display:'flex', alignItems:'center', gap:6 }}>
            <Icon size={15} />{label}
        </button>
    );
}
function BtnSecondary({ icon: Icon, label, onClick }) {
    return (
        <button onClick={onClick} style={{ ...btnSecondaryStyle, display:'flex', alignItems:'center', gap:6 }}>
            <Icon size={15} />{label}
        </button>
    );
}
function ActionBtn({ icon: Icon, tip, onClick, danger }) {
    return (
        <button onClick={onClick} title={tip} style={{
            background: danger ? '#fff5f5' : '#f7fafc',
            border: `1px solid ${danger ? '#fca5a5' : '#e2e8f0'}`,
            borderRadius: 6, padding:'5px 7px', cursor:'pointer',
            display:'flex', alignItems:'center',
        }}>
            <Icon size={14} color={danger ? '#ef4444' : '#4a5568'} />
        </button>
    );
}

function EnrolleeStatusBadge({ status }) {
    const map = {
        active: ['Active', '#e6f4ea', '#137333'],
        suspended: ['Suspended', '#fff3e0', '#c55a11'],
        inactive: ['Inactive', '#f1f5f9', '#64748b']
    };
    const [label, bg, color] = map[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ background:bg, color, fontSize:11, padding:'3px 8px', borderRadius:10, fontWeight:600 }}>{label}</span>;
}

function Pill({ label, value, color }) {
    return (
        <div style={{ background:'#fff', border:`1px solid ${color}20`, borderRadius:8, padding:'6px 14px', display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#718096' }}>{label}</span>
            <span style={{ fontSize:14, fontWeight:700, color }}>{value}</span>
        </div>
    );
}

const inputStyle  = { width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', background:'#f7fafc' };
const thStyle     = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#718096', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' };
const tdStyle     = { padding:'12px 14px', fontSize:13, color:'#2d3748', verticalAlign:'middle' };
const labelStyle  = { display:'block', fontSize:11, fontWeight:600, color:'#4a5568', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 };
const planBadge   = { background:'#e8f0fe', color:'#1a6fad', fontSize:11, padding:'3px 8px', borderRadius:6 };
const btnPrimaryStyle   = { background:'#0f4c81', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:13, fontWeight:500 };
const btnSecondaryStyle = { background:'#fff', color:'#4a5568', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:13 };
const btnDangerStyle    = { background:'#ef4444', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:13 };
const checkboxBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' };
const bulkBarStyle = { display: 'flex', alignItems: 'center', gap: 10, background: '#e8f0fe', border: '1px solid #c7d9f8', borderRadius: 10, padding: '10px 16px', marginBottom: 16 };
const bulkBtnStyle = (bg, color) => ({ background: bg, color, border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' });
const dropdownStyle = { position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 10, minWidth: 200, zIndex: 50 };
const dropdownItemStyle = { display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '7px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#2d3748' };
