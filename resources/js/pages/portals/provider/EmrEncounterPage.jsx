/**
 * NEW FILE — resources/js/pages/portals/provider/EmrEncounterPage.jsx
 *
 * PHASE 3 — Mini EMR.
 * The in-progress workspace for a physical/walk-in encounter, created by
 * ProviderStartEncounterPage.jsx. No video panel — this is the same
 * documentation surface as ProviderConsultRoomPage.jsx minus the call,
 * reusing the same Icd10Picker component so diagnosis capture behaves
 * identically across visit types.
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { closeEmrEncounter, saveTreatmentPlan } from '../../../api/index';
import Icd10Picker from '../../../components/emr/Icd10Picker';
import { Plus, Trash2, CheckCircle, ClipboardList } from 'lucide-react';

export default function EmrEncounterPage() {
    const { encounterId } = useParams();
    const navigate = useNavigate();

    const [notes, setNotes] = useState('');
    const [followUpAdvice, setFollowUpAdvice] = useState('');
    const [diagnoses, setDiagnoses] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);

    const [planText, setPlanText] = useState('');
    const [targetOutcomes, setTargetOutcomes] = useState('');
    const [reviewDate, setReviewDate] = useState('');
    const [planSaved, setPlanSaved] = useState(false);

    const planMutation = useMutation({
        mutationFn: () => saveTreatmentPlan(encounterId, {
            plan_text: planText,
            target_outcomes: targetOutcomes || null,
            review_date: reviewDate || null,
        }),
        onSuccess: () => setPlanSaved(true),
    });

    const closeMutation = useMutation({
        mutationFn: () => closeEmrEncounter(encounterId, {
            notes,
            follow_up_advice: followUpAdvice,
            prescriptions: prescriptions.filter(p => p.drug_name.trim()),
            diagnoses: diagnoses.map(d => ({ icd10_code: d.icd10_code, type: d.type, notes: d.notes || null })),
        }),
        onSuccess: () => navigate('/provider'),
    });

    const addPrescriptionRow = () =>
        setPrescriptions([...prescriptions, { drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);

    const updatePrescriptionRow = (index, field, value) => {
        const next = [...prescriptions];
        next[index] = { ...next[index], [field]: value };
        setPrescriptions(next);
    };

    const removePrescriptionRow = (index) =>
        setPrescriptions(prescriptions.filter((_, i) => i !== index));

    return (
        <div style={pageStyle}>
            <h1 style={titleStyle}>Consultation in progress</h1>
            <p style={subtitleStyle}>Encounter #{encounterId}</p>

            <div style={sectionStyle}>
                <label style={labelStyle}>Diagnoses</label>
                <Icd10Picker diagnoses={diagnoses} onChange={setDiagnoses} />
            </div>

            <div style={sectionStyle}>
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
            </div>

            <div style={sectionStyle}>
                <div style={sectionHeaderRowStyle}>
                    <label style={labelStyle}><ClipboardList size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Treatment plan</label>
                    {planSaved && <span style={savedBadgeStyle}>Saved</span>}
                </div>
                <textarea
                    value={planText}
                    onChange={e => { setPlanText(e.target.value); setPlanSaved(false); }}
                    placeholder="Ongoing plan for this condition (e.g. lifestyle changes, monitoring schedule)"
                    style={textareaStyle}
                    rows={3}
                />
                <div style={planRowStyle}>
                    <input
                        value={targetOutcomes}
                        onChange={e => { setTargetOutcomes(e.target.value); setPlanSaved(false); }}
                        placeholder="Target outcome (optional)"
                        style={{ ...rxInputStyle, flex: 2 }}
                    />
                    <input
                        type="date"
                        value={reviewDate}
                        onChange={e => { setReviewDate(e.target.value); setPlanSaved(false); }}
                        style={{ ...rxInputStyle, flex: 1 }}
                    />
                    <button
                        onClick={() => planMutation.mutate()}
                        disabled={!planText.trim() || planMutation.isPending}
                        style={savePlanButtonStyle}
                    >
                        {planMutation.isPending ? 'Saving…' : 'Save plan'}
                    </button>
                </div>
            </div>

            <div style={sectionStyle}>
                <div style={sectionHeaderRowStyle}>
                    <label style={labelStyle}>Prescriptions</label>
                    <button onClick={addPrescriptionRow} style={addRxButtonStyle}>
                        <Plus size={13} /> Add drug
                    </button>
                </div>

                {prescriptions.map((rx, i) => (
                    <div key={i} style={rxRowStyle}>
                        <input placeholder="Drug name" value={rx.drug_name} onChange={e => updatePrescriptionRow(i, 'drug_name', e.target.value)} style={rxInputStyle} />
                        <input placeholder="Dosage" value={rx.dosage} onChange={e => updatePrescriptionRow(i, 'dosage', e.target.value)} style={{ ...rxInputStyle, maxWidth: 100 }} />
                        <input placeholder="Frequency" value={rx.frequency} onChange={e => updatePrescriptionRow(i, 'frequency', e.target.value)} style={{ ...rxInputStyle, maxWidth: 100 }} />
                        <input placeholder="Duration" value={rx.duration} onChange={e => updatePrescriptionRow(i, 'duration', e.target.value)} style={{ ...rxInputStyle, maxWidth: 100 }} />
                        <button onClick={() => removePrescriptionRow(i)} style={removeRxButtonStyle}><Trash2 size={13} /></button>
                    </div>
                ))}
            </div>

            <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                style={submitButtonStyle}
            >
                <CheckCircle size={14} /> {closeMutation.isPending ? 'Saving…' : 'Close & share with member'}
            </button>

            {closeMutation.isError && (
                <div style={errorTextStyle}>
                    {closeMutation.error?.response?.data?.message || 'Could not save. Please try again.'}
                </div>
            )}
        </div>
    );
}

const pageStyle = { maxWidth: 680 };
const titleStyle = { fontSize: 20, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 12, margin: '4px 0 20px' };
const sectionStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 18, marginBottom: 14 };
const sectionHeaderRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 };
const savedBadgeStyle = { fontSize: 10, fontWeight: 700, color: '#137333', background: '#e6f4ea', padding: '2px 8px', borderRadius: 10 };
const textareaStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 4 };
const planRowStyle = { display: 'flex', gap: 6, marginTop: 8 };
const savePlanButtonStyle = { padding: '8px 14px', borderRadius: 6, border: '1px solid #0f4c81', background: '#fff', color: '#0f4c81', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 };
const rxRowStyle = { display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' };
const rxInputStyle = { flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box' };
const addRxButtonStyle = { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const removeRxButtonStyle = { padding: 8, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', color: '#c5221f', cursor: 'pointer' };
const submitButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const errorTextStyle = { marginTop: 10, fontSize: 12, color: '#c5221f', textAlign: 'center' };
