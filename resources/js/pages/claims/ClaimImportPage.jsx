/**
 * FILE: resources/js/pages/claims/ClaimImportPage.jsx
 *
 * 4-step bulk claims import wizard:
 *   Step 1 — Upload (drag-drop, select HCP + period)
 *   Step 2 — Map Columns (auto-suggested, manual override)
 *   Step 3 — Review Rows (fix errors, approve/skip, bulk-approve valid)
 *   Step 4 — Confirm & Push
 */
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Upload, ArrowRight, ArrowLeft, CheckCircle2, XCircle,
    AlertCircle, RefreshCw, ChevronDown, ChevronUp, FileSpreadsheet,
} from 'lucide-react';
import apiClient from '../../api/client';
import { LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-toastify';

const STEPS = ['Upload File', 'Map Columns', 'Review Rows', 'Confirm & Push'];

const STATUS_STYLE = {
    valid:     { bg:'#dcfce7', color:'#166534', label:'Valid'     },
    error:     { bg:'#fee2e2', color:'#991b1b', label:'Error'     },
    duplicate: { bg:'#fef3c7', color:'#92400e', label:'Duplicate' },
    approved:  { bg:'#dbeafe', color:'#1e40af', label:'Approved'  },
    skipped:   { bg:'#f1f5f9', color:'#64748b', label:'Skipped'   },
    pushed:    { bg:'#d1fae5', color:'#065f46', label:'Pushed'    },
};

export default function ClaimImportPage() {
    const navigate = useNavigate();
    const [step, setStep]             = useState(0);
    const [batchId, setBatchId]       = useState(null);
    const [batchInfo, setBatchInfo]   = useState(null);
    const [sourceHeaders, setHeaders] = useState([]);
    const [systemFields, setSysFields]= useState([]);
    const [mapping, setMapping]       = useState({});  // { "Their Col" => "sys_field" | "" }
    const [previewRows, setPreview]   = useState([]);
    const [rows, setRows]             = useState([]);
    const [rowFilter, setRowFilter]   = useState('');
    const [rowPage, setRowPage]       = useState(1);
    const [rowMeta, setRowMeta]       = useState(null);

    // ── Step 1: Upload ────────────────────────────────────────────────────────
    const UploadStep = () => {
        const [file, setFile]         = useState(null);
        const [hcpId, setHcpId]       = useState('');
        const [period, setPeriod]     = useState('');
        const [dragging, setDragging] = useState(false);
        const inputRef                = useRef();

        const { data: hcpsData } = useQuery({
            queryKey: ['hcps-dropdown'],
            queryFn: () => apiClient.get('/hcps', { params: { per_page: 200, status:'active' } }),
            staleTime: 300_000,
        });
        const hcps = hcpsData?.data?.data ?? hcpsData?.data ?? [];

        const uploadMutation = useMutation({
            mutationFn: () => {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('hcp_id', hcpId);
                fd.append('claim_period', period);
                return apiClient.post('/claims/import/upload', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            },
            onSuccess: (res) => {
                const d = res.data;
                setBatchId(d.batch_id);
                setBatchInfo({ batch_number: d.batch_number, total_rows: d.total_rows });
                setHeaders(d.source_headers);
                setSysFields(d.system_fields);
                setMapping(d.auto_mapping);
                setPreview(d.preview_rows);
                setStep(1);
            },
            onError: (err) => toast.error(err.response?.data?.message ?? 'Upload failed.'),
        });

        const handleDrop = useCallback((e) => {
            e.preventDefault(); setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.xls'))) setFile(f);
            else toast.error('Only .xlsx and .csv files are supported.');
        }, []);

        return (
            <div className="row justify-content-center">
                <div className="col-md-7">
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-4">
                            <h5 className="fw-semibold mb-4">Upload Claims File</h5>

                            {/* Drop zone */}
                            <div
                                className="rounded-3 border-2 border-dashed d-flex flex-column align-items-center justify-content-center p-5 mb-4"
                                style={{ borderColor: dragging ? '#4f46e5' : '#cbd5e1', background: dragging ? '#f5f3ff' : '#f8fafc', cursor:'pointer', minHeight: 180 }}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current.click()}
                            >
                                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="d-none"
                                       onChange={e => setFile(e.target.files[0])} />
                                {file ? (
                                    <div className="text-center">
                                        <FileSpreadsheet size={40} color="#4f46e5" className="mb-2" />
                                        <div className="fw-semibold">{file.name}</div>
                                        <div className="text-muted" style={{fontSize:12}}>{(file.size/1024).toFixed(1)} KB</div>
                                        <button className="btn btn-sm btn-link text-danger mt-1" onClick={e => { e.stopPropagation(); setFile(null); }}>Remove</button>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted">
                                        <Upload size={36} className="mb-2 opacity-50" />
                                        <div className="fw-semibold">Drag &amp; drop your file here</div>
                                        <div style={{fontSize:12}}>or click to browse — .xlsx and .csv supported</div>
                                    </div>
                                )}
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold" style={{fontSize:13}}>Healthcare Provider (HCP)</label>
                                    <select className="form-select" value={hcpId} onChange={e => setHcpId(e.target.value)}>
                                        <option value="">Select HCP…</option>
                                        {hcps.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold" style={{fontSize:13}}>Claim Period</label>
                                    <input type="month" className="form-control" value={period}
                                           onChange={e => setPeriod(e.target.value)}
                                           max={new Date().toISOString().slice(0,7)} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex justify-content-end">
                        <button className="btn btn-primary"
                                disabled={!file || !hcpId || !period || uploadMutation.isPending}
                                onClick={() => uploadMutation.mutate()}>
                            {uploadMutation.isPending ? <><span className="spinner-border spinner-border-sm me-2"/>Parsing…</> : <>Next: Map Columns <ArrowRight size={15} className="ms-1"/></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Step 2: Column Mapping ────────────────────────────────────────────────
    const MappingStep = () => {
        const [localMapping, setLocalMapping] = useState({ ...mapping });

        const confirmMutation = useMutation({
            mutationFn: () => apiClient.post(`/claims/import/${batchId}/map`, { mapping: localMapping }),
            onSuccess: (res) => {
                setMapping(localMapping);
                setBatchInfo(res.data.batch);
                setStep(2);
            },
            onError: (err) => toast.error(err.response?.data?.message ?? 'Mapping failed.'),
        });

        const requiredMapped = systemFields
            .filter(f => f.required)
            .every(f => Object.values(localMapping).includes(f.key));

        return (
            <div>
                <div className="alert alert-info d-flex gap-2 mb-4" style={{fontSize:13}}>
                    <AlertCircle size={15} className="flex-shrink-0 mt-1"/>
                    <span>The system has auto-suggested column mappings based on header names. Review each one and correct any mismatches. <strong>Bold fields are required.</strong></span>
                </div>

                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-body p-0">
                        <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3">Column in file</th>
                                    <th>Sample values</th>
                                    <th style={{minWidth:220}}>Maps to system field</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sourceHeaders.map(header => {
                                    const samples = previewRows.slice(0,3).map(r => r[header]).filter(Boolean).join(' · ');
                                    const currentMap = localMapping[header];
                                    const isRequired = systemFields.find(f => f.key === currentMap)?.required;
                                    return (
                                        <tr key={header}>
                                            <td className="ps-3 fw-semibold font-monospace" style={{fontSize:12}}>{header}</td>
                                            <td className="text-muted" style={{fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{samples || '—'}</td>
                                            <td>
                                                <select
                                                    className={`form-select form-select-sm ${currentMap ? 'border-success' : 'border-secondary'}`}
                                                    value={currentMap || ''}
                                                    onChange={e => setLocalMapping(prev => ({ ...prev, [header]: e.target.value || null }))}
                                                >
                                                    <option value="">— Skip this column —</option>
                                                    {systemFields.map(f => (
                                                        <option key={f.key} value={f.key}>
                                                            {f.required ? '* ' : ''}{f.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Required fields status */}
                <div className="d-flex flex-wrap gap-2 mb-4">
                    {systemFields.filter(f => f.required).map(f => {
                        const mapped = Object.values(localMapping).includes(f.key);
                        return (
                            <span key={f.key} className="badge" style={{background: mapped ? '#dcfce7' : '#fee2e2', color: mapped ? '#166534' : '#991b1b', fontSize:12}}>
                                {mapped ? '✓' : '✗'} {f.label}
                            </span>
                        );
                    })}
                </div>

                <div className="d-flex justify-content-between">
                    <button className="btn btn-outline-secondary" onClick={() => setStep(0)}><ArrowLeft size={15} className="me-1"/>Back</button>
                    <button className="btn btn-primary" disabled={!requiredMapped || confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                        {confirmMutation.isPending ? <><span className="spinner-border spinner-border-sm me-2"/>Validating rows…</> : <>Validate Rows <ArrowRight size={15} className="ms-1"/></>}
                    </button>
                </div>
            </div>
        );
    };

    // ── Step 3: Review Rows ───────────────────────────────────────────────────
    const ReviewStep = () => {
        const { data, isLoading, refetch } = useQuery({
            queryKey: ['import-rows', batchId, rowFilter, rowPage],
            queryFn: () => apiClient.get(`/claims/import/${batchId}/rows`, { params: { status: rowFilter || undefined, page: rowPage } }),
        });

        const rows   = data?.data?.data ?? [];
        const meta   = data?.data?.meta ?? {};
        const batch  = data?.data?.batch ?? batchInfo;

        const approveMutation = useMutation({
            mutationFn: ({ rowId, action, reason }) =>
                apiClient.patch(`/claims/import/${batchId}/rows/${rowId}`, { action, override_reason: reason }),
            onSuccess: () => refetch(),
        });

        const bulkApproveMutation = useMutation({
            mutationFn: () => apiClient.post(`/claims/import/${batchId}/bulk-approve-valid`),
            onSuccess: (res) => { setBatchInfo(res.data.batch); toast.success(res.data.message); refetch(); },
        });

        const counts = batch ? {
            valid:     batch.valid_rows,
            error:     batch.error_rows,
            duplicate: batch.duplicate_rows,
            approved:  0,
        } : {};

        return (
            <div>
                {/* Summary chips */}
                <div className="d-flex flex-wrap gap-3 mb-4">
                    {[
                        { key:'',          label:'All',       count: batch?.total_rows, color:'#64748b', bg:'#f1f5f9' },
                        { key:'valid',     label:'Valid',     count: batch?.valid_rows, color:'#166534', bg:'#dcfce7' },
                        { key:'error',     label:'Errors',    count: batch?.error_rows, color:'#991b1b', bg:'#fee2e2' },
                        { key:'duplicate', label:'Duplicate', count: batch?.duplicate_rows, color:'#92400e', bg:'#fef3c7' },
                        { key:'approved',  label:'Approved',  count: rows.filter(r=>r.status==='approved').length, color:'#1e40af', bg:'#dbeafe' },
                    ].map(({ key, label, count, color, bg }) => (
                        <button key={key}
                            className="btn rounded-pill border-0"
                            style={{ background: rowFilter===key ? color : bg, color: rowFilter===key ? '#fff' : color, fontSize:12, fontWeight:600 }}
                            onClick={() => { setRowFilter(key); setRowPage(1); }}>
                            {label} {count != null ? `(${count})` : ''}
                        </button>
                    ))}
                    <button className="btn btn-success btn-sm ms-auto"
                            disabled={!batch?.valid_rows || bulkApproveMutation.isPending}
                            onClick={() => bulkApproveMutation.mutate()}>
                        <CheckCircle2 size={14} className="me-1"/>Approve All Valid ({batch?.valid_rows ?? 0})
                    </button>
                </div>

                {isLoading ? <div className="py-5 text-center"><LoadingSpinner /></div> : (
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0" style={{fontSize:12}}>
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{width:50}}>Row</th>
                                            <th>Enrollee ID</th>
                                            <th>Patient Name</th>
                                            <th>Service Date</th>
                                            <th>Service Type</th>
                                            <th className="text-end">Amount (₦)</th>
                                            <th>Status</th>
                                            <th>Issues</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr><td colSpan={9} className="text-center text-muted py-4">No rows match this filter.</td></tr>
                                        ) : rows.map(row => {
                                            const ss = STATUS_STYLE[row.status] ?? STATUS_STYLE.valid;
                                            return (
                                                <tr key={row.id}>
                                                    <td className="font-monospace text-muted">{row.row_number}</td>
                                                    <td className="font-monospace">{row.enrollee_id_raw || '—'}</td>
                                                    <td>{row.enrollee_name_raw || row.enrollee?.full_name || '—'}</td>
                                                    <td>{row.service_date || '—'}</td>
                                                    <td>{row.service_type || '—'}</td>
                                                    <td className="text-end font-monospace">{row.amount_submitted ? Number(row.amount_submitted).toLocaleString('en-NG',{minimumFractionDigits:2}) : '—'}</td>
                                                    <td>
                                                        <span className="badge" style={{background:ss.bg,color:ss.color,fontSize:10}}>{ss.label}</span>
                                                    </td>
                                                    <td>
                                                        {row.validation_errors?.map((e,i) => (
                                                            <div key={i} className="text-danger" style={{fontSize:10}}>{e.message}</div>
                                                        ))}
                                                    </td>
                                                    <td>
                                                        {row.isActionable || ['valid','error','duplicate'].includes(row.status) ? (
                                                            <div className="d-flex gap-1">
                                                                <button className="btn btn-xs btn-outline-success py-0 px-1" style={{fontSize:10}}
                                                                        disabled={approveMutation.isPending}
                                                                        onClick={() => {
                                                                            const reason = row.status === 'error'
                                                                                ? window.prompt('Override reason (required for error rows):')
                                                                                : null;
                                                                            if (row.status === 'error' && !reason) return;
                                                                            approveMutation.mutate({ rowId: row.id, action:'approve', reason });
                                                                        }}>
                                                                    ✓ Approve
                                                                </button>
                                                                <button className="btn btn-xs btn-outline-secondary py-0 px-1" style={{fontSize:10}}
                                                                        onClick={() => approveMutation.mutate({ rowId: row.id, action:'skip' })}>
                                                                    Skip
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted" style={{fontSize:10}}>{row.status}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {meta.last_page > 1 && (
                    <div className="d-flex gap-2 justify-content-center mb-4">
                        {Array.from({length: meta.last_page}, (_,i) => (
                            <button key={i} className={`btn btn-sm ${rowPage===i+1?'btn-primary':'btn-outline-secondary'}`}
                                    onClick={() => setRowPage(i+1)}>{i+1}</button>
                        ))}
                    </div>
                )}

                <div className="d-flex justify-content-between">
                    <button className="btn btn-outline-secondary" onClick={() => setStep(1)}><ArrowLeft size={15} className="me-1"/>Back</button>
                    <button className="btn btn-primary" onClick={() => setStep(3)}>
                        Confirm &amp; Push <ArrowRight size={15} className="ms-1"/>
                    </button>
                </div>
            </div>
        );
    };

    // ── Step 4: Confirm & Push ────────────────────────────────────────────────
    const ConfirmStep = () => {
        const [notes, setNotes] = useState('');

        const pushMutation = useMutation({
            mutationFn: () => apiClient.post(`/claims/import/${batchId}/push`, { notes }),
            onSuccess: (res) => {
                toast.success(res.data.message);
                navigate('/claims');
            },
            onError: (err) => toast.error(err.response?.data?.message ?? 'Push failed.'),
        });

        const b = batchInfo;
        const approved = b ? (b.valid_rows + (b.approved_rows ?? 0)) : 0;

        return (
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body text-center p-5">
                            <CheckCircle2 size={56} color="#166534" className="mb-3"/>
                            <h5 className="fw-bold mb-1">Ready to push to claims queue</h5>
                            <p className="text-muted mb-4" style={{fontSize:13}}>
                                The following rows will be inserted as <strong>pending</strong> claims and enter the normal review workflow.
                            </p>
                            <div className="row g-3 mb-4">
                                {[
                                    { label:'Total Rows',    value: b?.total_rows,    color:'#475569' },
                                    { label:'To Push',       value: b?.valid_rows,    color:'#166534' },
                                    { label:'Errors',        value: b?.error_rows,    color:'#991b1b' },
                                    { label:'Duplicates',    value: b?.duplicate_rows,color:'#92400e' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="col-6">
                                        <div className="rounded-3 p-3" style={{background:'#f8fafc'}}>
                                            <div className="fw-bold" style={{fontSize:22,color}}>{value ?? 0}</div>
                                            <div className="text-muted" style={{fontSize:11}}>{label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <textarea className="form-control mb-4" rows={2} placeholder="Optional notes for this import…"
                                      value={notes} onChange={e => setNotes(e.target.value)} />
                            <div className="d-flex gap-2">
                                <button className="btn btn-outline-secondary flex-grow-1" onClick={() => setStep(2)}><ArrowLeft size={15} className="me-1"/>Back</button>
                                <button className="btn btn-success flex-grow-1" disabled={pushMutation.isPending} onClick={() => pushMutation.mutate()}>
                                    {pushMutation.isPending ? <><span className="spinner-border spinner-border-sm me-2"/>Pushing…</> : `Push ${b?.valid_rows ?? 0} Claims`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">Bulk Claims Import</h4>
                    <small className="text-muted">Upload and map an Excel or CSV file from an HCP</small>
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/claims/imports')}>
                    View Import History
                </button>
            </div>

            {/* Step indicator */}
            <div className="d-flex align-items-center mb-5">
                {STEPS.map((label, i) => (
                    <React.Fragment key={i}>
                        <div className="d-flex flex-column align-items-center" style={{minWidth:100}}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold mb-1"
                                 style={{width:36,height:36,fontSize:14,
                                     background: i < step ? '#166534' : i === step ? '#1e40af' : '#e2e8f0',
                                     color: i <= step ? '#fff' : '#94a3b8'}}>
                                {i < step ? '✓' : i + 1}
                            </div>
                            <div style={{fontSize:11,color: i===step?'#1e40af':'#94a3b8',fontWeight:i===step?600:400,textAlign:'center'}}>
                                {label}
                            </div>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{flex:1,height:2,background: i<step?'#166534':'#e2e8f0',margin:'0 4px',marginBottom:20}}/>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {step === 0 && <UploadStep />}
            {step === 1 && <MappingStep />}
            {step === 2 && <ReviewStep />}
            {step === 3 && <ConfirmStep />}
        </div>
    );
}