/**
 * NEW FILE - resources/js/pages/portals/provider/ProviderClaimImportPage.jsx
 * 4-step wizard: upload -> map columns -> review rows -> push to review queue.
 * Same shape as your staff-side import wizard, just talking to the
 * provider-scoped endpoints instead.
 */
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    uploadProviderClaimImport,
    confirmProviderImportMapping,
    fetchProviderImportRows,
    pushProviderImportBatch,
} from '../../../api/index';
import { UploadCloud, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

const STEPS = ['Upload', 'Map columns', 'Review', 'Submit'];

export default function ProviderClaimImportPage() {
    const [step, setStep] = useState(0);
    const [file, setFile] = useState(null);
    const [claimPeriod, setClaimPeriod] = useState('');
    const [uploadResult, setUploadResult] = useState(null);
    const [mapping, setMapping] = useState({});
    const [batchSummary, setBatchSummary] = useState(null);

    const uploadMutation = useMutation({
        mutationFn: () => uploadProviderClaimImport(file, claimPeriod),
        onSuccess: (res) => {
            setUploadResult(res);
            setMapping(res.auto_mapping);
            setStep(1);
        },
    });

    const mapMutation = useMutation({
        mutationFn: () => confirmProviderImportMapping(uploadResult.batch_id, mapping),
        onSuccess: (res) => {
            setBatchSummary(res.batch);
            setStep(2);
        },
    });

    const { data: rowsData } = useQuery({
        queryKey: ['provider-import-rows', uploadResult?.batch_id],
        queryFn: () => fetchProviderImportRows(uploadResult.batch_id),
        enabled: step === 2 && !!uploadResult,
    });

    const pushMutation = useMutation({
        mutationFn: () => pushProviderImportBatch(uploadResult.batch_id),
        onSuccess: () => setStep(3),
    });

    return (
        <div>
            <h1 style={titleStyle}>Bulk claim upload</h1>

            <div style={stepperStyle}>
                {STEPS.map((s, i) => (
                    <div key={s} style={{ ...stepPillStyle, background: i <= step ? '#0f4c81' : '#e2e8f0', color: i <= step ? '#fff' : '#718096' }}>
                        {i + 1}. {s}
                    </div>
                ))}
            </div>

            {step === 0 && (
                <div style={cardStyle}>
                    <label style={labelStyle}>Claim period (YYYY-MM)</label>
                    <input value={claimPeriod} onChange={e => setClaimPeriod(e.target.value)} placeholder="2026-07" style={inputStyle} />

                    <label style={labelStyle}>File (Excel or CSV)</label>
                    <div style={dropzoneStyle}>
                        <UploadCloud size={28} color="#a0aec0" />
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] ?? null)} style={fileInputStyle} />
                        {file && <div style={fileNameStyle}>{file.name}</div>}
                    </div>

                    <button
                        onClick={() => uploadMutation.mutate()}
                        disabled={!file || !claimPeriod.match(/^\d{4}-(0[1-9]|1[0-2])$/) || uploadMutation.isPending}
                        style={primaryButtonStyle}
                    >
                        {uploadMutation.isPending ? 'Uploading…' : 'Upload & continue'} <ArrowRight size={14} />
                    </button>
                    {uploadMutation.isError && (
                        <div style={errorStyle}>{uploadMutation.error?.response?.data?.message || 'Upload failed.'}</div>
                    )}
                </div>
            )}

            {step === 1 && uploadResult && (
                <div style={cardStyle}>
                    <p style={helpTextStyle}>
                        We matched {Object.values(mapping).filter(Boolean).length} of {uploadResult.source_headers.length} columns automatically. Check the rest.
                    </p>
                    {uploadResult.source_headers.map(header => (
                        <div key={header} style={mapRowStyle}>
                            <span style={mapSourceStyle}>{header}</span>
                            <ArrowRight size={14} color="#a0aec0" />
                            <select
                                value={mapping[header] || ''}
                                onChange={e => setMapping({ ...mapping, [header]: e.target.value || null })}
                                style={inputStyle}
                            >
                                <option value="">- Skip this column -</option>
                                {uploadResult.system_fields.map(f => (
                                    <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <button onClick={() => mapMutation.mutate()} disabled={mapMutation.isPending} style={primaryButtonStyle}>
                        {mapMutation.isPending ? 'Validating…' : 'Confirm mapping & validate'} <ArrowRight size={14} />
                    </button>
                    {mapMutation.isError && (
                        <div style={errorStyle}>{mapMutation.error?.response?.data?.message || 'Mapping failed.'}</div>
                    )}
                </div>
            )}

            {step === 2 && batchSummary && (
                <div style={cardStyle}>
                    <div style={summaryRowStyle}>
                        <SummaryStat label="Valid" value={batchSummary.valid_rows} color="#137333" />
                        <SummaryStat label="Errors" value={batchSummary.error_rows} color="#c5221f" />
                        <SummaryStat label="Duplicates" value={batchSummary.duplicate_rows} color="#e65100" />
                    </div>

                    <div style={rowsListStyle}>
                        {(rowsData?.data ?? []).map(row => (
                            <div key={row.id} style={importRowStyle}>
                                <div>
                                    <span style={rowNumberStyle}>Row {row.row_number}</span>
                                    <span style={rowStatusBadge(row.status)}>{row.status}</span>
                                </div>
                                <div style={rowMetaStyle}>{row.enrollee_name_raw || row.enrollee_id_raw} · ₦{Number(row.amount_submitted || 0).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => pushMutation.mutate()}
                        disabled={batchSummary.valid_rows === 0 || pushMutation.isPending}
                        style={primaryButtonStyle}
                    >
                        {pushMutation.isPending ? 'Submitting…' : `Submit ${batchSummary.valid_rows} valid claims for review`}
                    </button>
                </div>
            )}

            {step === 3 && (
                <div style={successCardStyle}>
                    <CheckCircle size={40} color="#137333" />
                    <div style={successTextStyle}>
                        {pushMutation.data?.pushed_rows} claims submitted for review.
                    </div>
                    <p style={helpTextStyle}>They'll move through the same review process as any other claim - you can track them under Claims.</p>
                </div>
            )}
        </div>
    );
}

function SummaryStat({ label, value, color }) {
    return (
        <div style={summaryStatStyle}>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#718096' }}>{label}</div>
        </div>
    );
}

function rowStatusBadge(status) {
    const map = {
        valid: '#e6f4ea', approved: '#e6f4ea', error: '#fce8e6',
        duplicate: '#fce4d6', skipped: '#f0f0f0', pending: '#fff3e0',
    };
    return { fontSize: 10, padding: '2px 8px', borderRadius: 8, marginLeft: 8, background: map[status] || '#f0f0f0' };
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 16 };
const stepperStyle = { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' };
const stepPillStyle = { padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
const cardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6, marginTop: 12 };
const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', width: '100%', boxSizing: 'border-box' };
const dropzoneStyle = { border: '2px dashed #e2e8f0', borderRadius: 10, padding: 20, textAlign: 'center' };
const fileInputStyle = { display: 'block', margin: '10px auto 0', fontSize: 12 };
const fileNameStyle = { marginTop: 8, fontSize: 12, fontWeight: 600, color: '#2d3748' };
const primaryButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const errorStyle = { marginTop: 10, fontSize: 12, color: '#c5221f' };
const helpTextStyle = { fontSize: 12, color: '#718096', marginBottom: 10 };
const mapRowStyle = { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, marginBottom: 8 };
const mapSourceStyle = { fontSize: 13, fontWeight: 600, color: '#2d3748' };
const summaryRowStyle = { display: 'flex', gap: 20, marginBottom: 16 };
const summaryStatStyle = { textAlign: 'center' };
const rowsListStyle = { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', marginBottom: 16 };
const importRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f7fafc', borderRadius: 8 };
const rowNumberStyle = { fontSize: 12, fontWeight: 600, color: '#4a5568' };
const rowMetaStyle = { fontSize: 12, color: '#718096' };
const successCardStyle = { textAlign: 'center', padding: 50, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const successTextStyle = { fontSize: 16, fontWeight: 700, color: '#2d3748', marginTop: 12 };
