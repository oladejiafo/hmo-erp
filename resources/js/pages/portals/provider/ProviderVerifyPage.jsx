/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderVerifyPage.jsx
 *
 * REQUIRES A NEW DEPENDENCY: html5-qrcode. Not in your package.json —
 * checked. Run: npm install html5-qrcode
 *
 * No QR-scanning library exists in this codebase (qrcode.react, already
 * installed, only GENERATES codes, it can't read a camera feed). Chose
 * html5-qrcode because it's actively maintained, handles camera
 * permissions/device selection itself, and needs no build config changes
 * — worth confirming it plays nicely with your Vite setup before relying
 * on it for a live front-desk workflow.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchProviderCheckins, acknowledgeProviderCheckin,
    fetchProviderAppointments, confirmProviderAppointment,
    verifyProviderEnrollee, verifyProviderQrCode,
} from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { QrCode, Search, UserCheck, Calendar, CheckCircle, XCircle, X } from 'lucide-react';

export default function ProviderVerifyPage() {
    const [scannerOpen, setScannerOpen] = useState(false);
    const [manualNumber, setManualNumber] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifyError, setVerifyError] = useState(null);
    const qc = useQueryClient();

    const { data: checkinsData } = useQuery({
        queryKey: ['provider-checkins'],
        queryFn: fetchProviderCheckins,
        refetchInterval: 15000,
    });

    const { data: appointmentsData } = useQuery({
        queryKey: ['provider-appointments-today'],
        queryFn: () => fetchProviderAppointments(),
    });

    const acknowledgeMutation = useMutation({
        mutationFn: (id) => acknowledgeProviderCheckin(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-checkins'] }),
    });

    const confirmApptMutation = useMutation({
        mutationFn: ({ id, date }) => confirmProviderAppointment(id, date),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-appointments-today'] }),
    });

    const manualVerifyMutation = useMutation({
        mutationFn: (num) => verifyProviderEnrollee(num),
        onSuccess: (res) => { setVerifyResult(res.data); setVerifyError(null); },
        onError: (e) => { setVerifyError(e.response?.data?.message || 'Member not found'); setVerifyResult(null); },
    });

    const qrVerifyMutation = useMutation({
        mutationFn: (qrData) => verifyProviderQrCode(qrData),
        onSuccess: (res) => { setVerifyResult(res.data); setVerifyError(null); setScannerOpen(false); },
        onError: (e) => { setVerifyError(e.response?.data?.message || 'Could not verify this card'); setVerifyResult(null); },
    });

    const checkins = checkinsData?.data ?? [];
    const appointments = appointmentsData?.data ?? [];

    return (
        <div>
            <h1 style={titleStyle}>Verification Dashboard</h1>
            <p style={subtitleStyle}>Verify members, see who's checked in, and confirm today's appointments</p>

            {/* Verify a member */}
            <div style={verifyCardStyle}>
                <div style={verifyRowStyle}>
                    <button onClick={() => setScannerOpen(true)} style={scanButtonStyle}>
                        <QrCode size={16} /> Scan ID card
                    </button>
                    <div style={orDividerStyle}>or</div>
                    <input
                        value={manualNumber}
                        onChange={e => setManualNumber(e.target.value)}
                        placeholder="Type member number"
                        style={manualInputStyle}
                    />
                    <button
                        onClick={() => manualVerifyMutation.mutate(manualNumber)}
                        disabled={!manualNumber}
                        style={manualButtonStyle}
                    >
                        <Search size={14} />
                    </button>
                </div>

                {verifyError && (
                    <div style={verifyErrorStyle}><XCircle size={14} /> {verifyError}</div>
                )}

                {verifyResult && (
                    <div style={verifyResultStyle}>
                        <CheckCircle size={18} color="#137333" />
                        <div>
                            <div style={verifyNameStyle}>{verifyResult.full_name}</div>
                            <div style={verifyMetaStyle}>
                                {verifyResult.plan_name} · Status: {verifyResult.status}
                                {verifyResult.verified_via === 'qr_scan' && ' · Verified via QR'}
                                {!verifyResult.can_make_claim && ' · ⚠ Cannot currently claim'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {scannerOpen && (
                <QrScannerModal
                    onDecode={(qrText) => qrVerifyMutation.mutate(qrText)}
                    onClose={() => setScannerOpen(false)}
                />
            )}

            {/* Two-column: check-ins + appointments */}
            <div style={columnsStyle}>
                <div>
                    <h2 style={sectionTitleStyle}><UserCheck size={16} /> Checked in ({checkins.length})</h2>
                    {!checkins.length ? (
                        <div style={emptyColStyle}>No one checked in right now</div>
                    ) : checkins.map(c => (
                        <div key={c.id} style={rowCardStyle}>
                            <div>
                                <div style={rowNameStyle}>{c.member_name}</div>
                                <div style={rowMetaStyle}>{c.checked_in_at} · {c.minutes_ago}m ago</div>
                            </div>
                            <button onClick={() => acknowledgeMutation.mutate(c.id)} style={ackButtonStyle}>Seen</button>
                        </div>
                    ))}
                </div>

                <div>
                    <h2 style={sectionTitleStyle}><Calendar size={16} /> Upcoming appointments ({appointments.length})</h2>
                    {!appointments.length ? (
                        <div style={emptyColStyle}>No appointments booked</div>
                    ) : appointments.map(a => (
                        <div key={a.id} style={rowCardStyle}>
                            <div>
                                <div style={rowNameStyle}>{a.member_name}</div>
                                <div style={rowMetaStyle}>{formatDate(a.preferred_date)} · {a.preferred_time_slot} · {a.reason}</div>
                            </div>
                            {a.status === 'requested' && (
                                <button
                                    onClick={() => confirmApptMutation.mutate({ id: a.id, date: a.preferred_date })}
                                    style={ackButtonStyle}
                                >
                                    Confirm
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function QrScannerModal({ onDecode, onClose }) {
    const scannerRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let html5QrCode;
        // Dynamic import — keeps this dependency out of the main bundle
        // for everyone who never opens this page.
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            html5QrCode = new Html5Qrcode('qr-reader');
            html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: 250 },
                (decodedText) => {
                    html5QrCode.stop();
                    onDecode(decodedText);
                },
                () => { /* per-frame decode failure, ignore — expected until a code is in view */ }
            ).catch(() => setError('Could not access camera. Check permissions, or use manual entry instead.'));
        }).catch(() => setError('QR scanner library not installed. Run: npm install html5-qrcode'));

        return () => { html5QrCode?.stop().catch(() => {}); };
    }, []);

    return (
        <>
            <div style={modalBackdropStyle} onClick={onClose} />
            <div style={scannerModalStyle}>
                <div style={scannerHeaderStyle}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Scan member ID card</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                {error ? (
                    <div style={{ padding: 20, fontSize: 12, color: '#c5221f', textAlign: 'center' }}>{error}</div>
                ) : (
                    <div id="qr-reader" style={{ width: '100%' }} />
                )}
            </div>
        </>
    );
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 20px' };
const verifyCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, marginBottom: 24 };
const verifyRowStyle = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' };
const scanButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const orDividerStyle = { fontSize: 12, color: '#a0aec0' };
const manualInputStyle = { flex: 1, minWidth: 180, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#f7fafc' };
const manualButtonStyle = { padding: '9px 12px', borderRadius: 8, border: 'none', background: '#4a5568', color: '#fff', cursor: 'pointer' };
const verifyErrorStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: '#c5221f' };
const verifyResultStyle = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, background: '#e6f4ea', borderRadius: 8, padding: '10px 14px' };
const verifyNameStyle = { fontSize: 14, fontWeight: 700, color: '#137333' };
const verifyMetaStyle = { fontSize: 12, color: '#2d3748', marginTop: 2 };
const columnsStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 };
const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#2d3748', marginBottom: 10 };
const emptyColStyle = { fontSize: 12, color: '#a0aec0', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: 20, textAlign: 'center' };
const rowCardStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '10px 14px', marginBottom: 8 };
const rowNameStyle = { fontSize: 13, fontWeight: 600, color: '#2d3748' };
const rowMetaStyle = { fontSize: 11, color: '#718096', marginTop: 2 };
const ackButtonStyle = { padding: '6px 12px', borderRadius: 6, border: 'none', background: '#137333', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const modalBackdropStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 };
const scannerModalStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 14, padding: 16, width: 340, maxWidth: '90vw', zIndex: 1001 };
const scannerHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
