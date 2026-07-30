/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderConsultRoomPage.jsx
 *
 * PHASE 1 — Telemedicine (provider side).
 * Same @daily-co/daily-js dependency as the enrollee room page — already
 * flagged there, only needs installing once.
 *
 * Split screen: video call on top, a close-consultation form below it that
 * stays reachable throughout the call (a doctor should be able to jot
 * notes mid-consult, not only at the very end).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import DailyIframe from '@daily-co/daily-js';
import { closeProviderTelemedicineEncounter } from '../../../api/index';
import Icd10Picker from '../../../components/emr/Icd10Picker'; // PHASE 3
import { PhoneOff, Plus, Trash2, CheckCircle } from 'lucide-react';

export default function ProviderConsultRoomPage() {
    const { encounterId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const callFrameRef = useRef(null);
    const [error, setError] = useState(null);

    const [notes, setNotes] = useState('');
    const [followUpAdvice, setFollowUpAdvice] = useState('');
    const [prescriptions, setPrescriptions] = useState([]);
    const [diagnoses, setDiagnoses] = useState([]); // PHASE 3

    const joinUrl = location.state?.joinUrl;

    useEffect(() => {
        if (!joinUrl) {
            setError('Your session link expired. Go back and press Start consultation again.');
            return;
        }

        const callFrame = DailyIframe.createFrame(containerRef.current, {
            showLeaveButton: false,
            iframeStyle: { width: '100%', height: '100%', border: '0' },
        });
        callFrameRef.current = callFrame;

        callFrame.join({ url: joinUrl }).catch(() => {
            setError('Could not connect to the video session. Please try again.');
        });

        return () => callFrame.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinUrl]);

    const closeMutation = useMutation({
        mutationFn: () => closeProviderTelemedicineEncounter(encounterId, {
            notes,
            follow_up_advice: followUpAdvice,
            prescriptions: prescriptions.filter(p => p.drug_name.trim()),
            diagnoses: diagnoses.map(d => ({ icd10_code: d.icd10_code, type: d.type, notes: d.notes || null })), // PHASE 3
        }),
        onSuccess: () => {
            callFrameRef.current?.leave();
            navigate('/provider/telemedicine');
        },
    });

    const addPrescriptionRow = () => {
        setPrescriptions([...prescriptions, { drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
    };

    const updatePrescriptionRow = (index, field, value) => {
        const next = [...prescriptions];
        next[index] = { ...next[index], [field]: value };
        setPrescriptions(next);
    };

    const removePrescriptionRow = (index) => {
        setPrescriptions(prescriptions.filter((_, i) => i !== index));
    };

    if (error) {
        return (
            <div style={pageStyle}>
                <div style={errorBoxStyle}>{error}</div>
                <button onClick={() => navigate('/provider/telemedicine')} style={backButtonStyle}>
                    Back to queue
                </button>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <div style={videoWrapStyle}>
                <div ref={containerRef} style={frameContainerStyle} />
            </div>

            <div style={panelStyle}>
                <h2 style={panelTitleStyle}>Close consultation</h2>

                <label style={labelStyle}>Diagnoses</label>
                <Icd10Picker diagnoses={diagnoses} onChange={setDiagnoses} />

                <label style={labelStyle}>Consultation notes</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="What did you observe and discuss?"
                    style={textareaStyle}
                    rows={4}
                />

                <label style={labelStyle}>Follow-up advice</label>
                <textarea
                    value={followUpAdvice}
                    onChange={e => setFollowUpAdvice(e.target.value)}
                    placeholder="What should the member do next?"
                    style={textareaStyle}
                    rows={3}
                />

                <div style={rxHeaderRowStyle}>
                    <label style={labelStyle}>Prescriptions</label>
                    <button onClick={addPrescriptionRow} style={addRxButtonStyle}>
                        <Plus size={13} /> Add drug
                    </button>
                </div>

                {prescriptions.map((rx, i) => (
                    <div key={i} style={rxRowStyle}>
                        <input
                            placeholder="Drug name"
                            value={rx.drug_name}
                            onChange={e => updatePrescriptionRow(i, 'drug_name', e.target.value)}
                            style={rxInputStyle}
                        />
                        <input
                            placeholder="Dosage"
                            value={rx.dosage}
                            onChange={e => updatePrescriptionRow(i, 'dosage', e.target.value)}
                            style={{ ...rxInputStyle, maxWidth: 100 }}
                        />
                        <input
                            placeholder="Frequency"
                            value={rx.frequency}
                            onChange={e => updatePrescriptionRow(i, 'frequency', e.target.value)}
                            style={{ ...rxInputStyle, maxWidth: 100 }}
                        />
                        <input
                            placeholder="Duration"
                            value={rx.duration}
                            onChange={e => updatePrescriptionRow(i, 'duration', e.target.value)}
                            style={{ ...rxInputStyle, maxWidth: 100 }}
                        />
                        <button onClick={() => removePrescriptionRow(i)} style={removeRxButtonStyle}>
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}

                <div style={footerRowStyle}>
                    <button onClick={() => callFrameRef.current?.leave()} style={leaveButtonStyle}>
                        <PhoneOff size={14} /> Leave call
                    </button>
                    <button
                        onClick={() => closeMutation.mutate()}
                        disabled={closeMutation.isPending}
                        style={submitButtonStyle}
                    >
                        <CheckCircle size={14} /> {closeMutation.isPending ? 'Saving…' : 'Close & share with member'}
                    </button>
                </div>

                {closeMutation.isError && (
                    <div style={errorTextStyle}>
                        {closeMutation.error?.response?.data?.message || 'Could not save. Please try again.'}
                    </div>
                )}
            </div>
        </div>
    );
}

const pageStyle = { display: 'flex', height: '100vh', background: '#1a202c' };
const videoWrapStyle = { flex: 1.4, position: 'relative' };
const frameContainerStyle = { position: 'absolute', inset: 0 };
const panelStyle = { flex: 1, background: '#fff', padding: 24, overflowY: 'auto' };
const panelTitleStyle = { fontSize: 16, fontWeight: 700, color: '#1a202c', margin: '0 0 16px' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6, marginTop: 12 };
const textareaStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' };
const rxHeaderRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const addRxButtonStyle = { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const rxRowStyle = { display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' };
const rxInputStyle = { flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box' };
const removeRxButtonStyle = { padding: 8, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', color: '#c5221f', cursor: 'pointer' };
const footerRowStyle = { display: 'flex', gap: 10, marginTop: 24 };
const leaveButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff5f5', color: '#c5221f', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const submitButtonStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const errorTextStyle = { marginTop: 10, fontSize: 12, color: '#c5221f' };
const errorBoxStyle = { margin: 'auto', color: '#fff', fontSize: 14, textAlign: 'center' };
const backButtonStyle = { margin: '0 auto', display: 'block', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
