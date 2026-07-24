/**
 * NEW FILE — resources/js/pages/hcps/HcpTariffsPage.jsx
 * Standalone — drop in as a tab/section on the HCP detail page:
 * <HcpTariffsPage hcpId={hcp.id} />
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    fetchTariffs, createTariff, updateTariff, deleteTariff, bulkUploadTariffs,
} from '../../api/index';
import { formatCurrency } from '../../utils/format';
import { Plus, Upload, Trash2, Edit2, X } from 'lucide-react';

const CATEGORIES = ['consultation', 'procedure', 'laboratory', 'radiology', 'drug', 'surgery', 'dental', 'optical', 'physiotherapy', 'maternity', 'emergency'];

export default function HcpTariffsPage({ hcpId }) {
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['hcp-tariffs', hcpId, search],
        queryFn: () => fetchTariffs(hcpId, { search }),
    });

    const deleteMutation = useMutation({
        mutationFn: (tariffId) => deleteTariff(hcpId, tariffId),
        onSuccess: () => { toast.success('Tariff removed.'); qc.invalidateQueries({ queryKey: ['hcp-tariffs', hcpId] }); },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to delete.'),
    });

    const tariffs = data?.data?.data ?? data?.data ?? [];
    const invalidate = () => qc.invalidateQueries({ queryKey: ['hcp-tariffs', hcpId] });

    return (
        <div>
            <div style={headerRowStyle}>
                <h2 style={titleStyle}>Tariffs</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setBulkOpen(true)} style={secondaryBtnStyle}><Upload size={14} /> Bulk Upload</button>
                    <button onClick={() => setAddOpen(true)} style={primaryBtnStyle}><Plus size={14} /> Add Tariff</button>
                </div>
            </div>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search service name or code…" style={searchStyle} />

            <table style={tableStyle}>
                <thead>
                    <tr>
                        {['Code', 'Service', 'Category', 'Agreed Price', 'NHIS Price', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan={7} style={emptyStyle}>Loading…</td></tr>
                    ) : !tariffs.length ? (
                        <tr><td colSpan={7} style={emptyStyle}>No tariffs set up yet.</td></tr>
                    ) : tariffs.map(t => (
                        <tr key={t.id}>
                            <td style={tdStyle}>{t.service_code}</td>
                            <td style={tdStyle}>{t.service_name}</td>
                            <td style={tdStyle}>{t.category}</td>
                            <td style={tdStyle}>{formatCurrency(t.agreed_price)}</td>
                            <td style={tdStyle}>{t.nhis_price ? formatCurrency(t.nhis_price) : '—'}</td>
                            <td style={tdStyle}>
                                <span style={{ ...badgeStyle, background: t.is_active ? '#e6f4ea' : '#f0f0f0', color: t.is_active ? '#137333' : '#718096' }}>
                                    {t.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td style={tdStyle}>
                                <button onClick={() => setEditRow(t)} style={iconBtnStyle}><Edit2 size={13} /></button>
                                <button onClick={() => { if (confirm('Remove this tariff?')) deleteMutation.mutate(t.id); }} style={iconBtnStyle}><Trash2 size={13} color="#c5221f" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {addOpen && <TariffFormModal hcpId={hcpId} onClose={() => setAddOpen(false)} onSuccess={() => { setAddOpen(false); invalidate(); }} />}
            {editRow && <TariffFormModal hcpId={hcpId} existing={editRow} onClose={() => setEditRow(null)} onSuccess={() => { setEditRow(null); invalidate(); }} />}
            {bulkOpen && <BulkUploadModal hcpId={hcpId} onClose={() => setBulkOpen(false)} onSuccess={() => { setBulkOpen(false); invalidate(); }} />}
        </div>
    );
}

function TariffFormModal({ hcpId, existing, onClose, onSuccess }) {
    const [form, setForm] = useState(existing ?? {
        service_code: '', service_name: '', category: 'consultation',
        agreed_price: '', nhis_price: '', is_active: true,
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const mutation = useMutation({
        mutationFn: () => existing ? updateTariff(hcpId, existing.id, form) : createTariff(hcpId, form),
        onSuccess: () => { toast.success(existing ? 'Tariff updated.' : 'Tariff added.'); onSuccess(); },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Save failed.'),
    });

    const canSave = form.service_name && form.agreed_price;

    return (
        <Modal title={existing ? 'Edit Tariff' : 'Add Tariff'} onClose={onClose}>
            <Field label="Service Code" value={form.service_code} onChange={v => set('service_code', v)} />
            <Field label="Service Name *" value={form.service_name} onChange={v => set('service_name', v)} />
            <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <Field label="Agreed Price *" type="number" value={form.agreed_price} onChange={v => set('agreed_price', v)} />
            <Field label="NHIS Price" type="number" value={form.nhis_price} onChange={v => set('nhis_price', v)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)} />
                Active
            </label>
            <div style={modalFooterStyle}>
                <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
                <button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending} style={primaryBtnStyle}>
                    {mutation.isPending ? 'Saving…' : 'Save'}
                </button>
            </div>
        </Modal>
    );
}

function BulkUploadModal({ hcpId, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const mutation = useMutation({
        mutationFn: () => bulkUploadTariffs(hcpId, file),
        onSuccess: (res) => { toast.success(`Uploaded: ${res.data?.imported ?? 0} tariffs.`); onSuccess(); },
        onError: (e) => toast.error(e.response?.data?.message ?? 'Upload failed.'),
    });

    return (
        <Modal title="Bulk Upload Tariffs" onClose={onClose}>
            <p style={{ fontSize: 13, color: '#4a5568' }}>CSV columns: service_code, service_name, category, agreed_price, nhis_price</p>
            <div onClick={() => document.getElementById('tariff-file').click()} style={dropzoneStyle}>
                <input id="tariff-file" type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                <Upload size={24} color="#0f4c81" />
                <div style={{ fontSize: 12, marginTop: 6 }}>{file ? file.name : 'Click to select file'}</div>
            </div>
            <div style={modalFooterStyle}>
                <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
                <button onClick={() => mutation.mutate()} disabled={!file || mutation.isPending} style={primaryBtnStyle}>
                    {mutation.isPending ? 'Uploading…' : 'Upload'}
                </button>
            </div>
        </Modal>
    );
}

function Field({ label, value, onChange, type = 'text' }) {
    return (
        <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
        </div>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <>
            <div style={backdropStyle} onClick={onClose} />
            <div style={modalStyle}>
                <div style={modalHeaderStyle}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                {children}
            </div>
        </>
    );
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 };
const titleStyle = { fontSize: 16, fontWeight: 700, margin: 0 };
const searchStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, marginBottom: 14, boxSizing: 'border-box' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden' };
const thStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #eee' };
const tdStyle = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f5f5f5' };
const emptyStyle = { padding: 30, textAlign: 'center', color: '#a0aec0' };
const badgeStyle = { fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600 };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginRight: 4 };
const primaryBtnStyle = { display: 'flex', alignItems: 'center', gap: 6, background: '#0f4c81', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' };
const secondaryBtnStyle = { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#4a5568', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' };
const backdropStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 };
const modalStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 14, padding: 20, width: 400, maxWidth: '90vw', zIndex: 1001 };
const modalHeaderStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 14 };
const modalFooterStyle = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4a5568', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' };
const dropzoneStyle = { border: '2px dashed #c5d5e8', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', marginTop: 10 };
