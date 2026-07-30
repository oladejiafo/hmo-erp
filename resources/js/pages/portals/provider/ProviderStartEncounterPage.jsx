/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderStartEncounterPage.jsx
 *
 * PHASE 3 — Mini EMR.
 * The entry point for a walk-in / in-clinic visit — no appointment
 * exists yet, front-desk or the doctor starts one directly. Reuses the
 * same member lookup as Verify and Patient History for consistency.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { verifyProviderEnrollee, fetchProviderDoctors, createEmrEncounter } from '../../../api/index';
import { useQuery } from '@tanstack/react-query';
import { Search, User, AlertCircle, Stethoscope } from 'lucide-react';

export default function ProviderStartEncounterPage() {
    const navigate = useNavigate();
    const [memberNumber, setMemberNumber] = useState('');
    const [member, setMember] = useState(null);
    const [doctorId, setDoctorId] = useState('');
    const [chiefComplaint, setChiefComplaint] = useState('');

    const lookupMutation = useMutation({
        mutationFn: () => verifyProviderEnrollee(memberNumber),
        onSuccess: (res) => setMember(res.data),
    });

    const { data: doctorsData } = useQuery({
        queryKey: ['provider-doctors-list'],
        queryFn: () => fetchProviderDoctors(),
    });
    const doctors = doctorsData?.data ?? [];

    const startMutation = useMutation({
        mutationFn: () => createEmrEncounter({
            enrollee_id: member.type === 'dependent' ? member.enrollee_id : member.id,
            dependent_id: member.type === 'dependent' ? member.id : null,
            doctor_id: doctorId || null,
            chief_complaint: chiefComplaint,
        }),
        onSuccess: (res) => {
            navigate(`/provider/emr/encounters/${res.data.id}`);
        },
    });

    return (
        <div style={pageStyle}>
            <h1 style={titleStyle}>Start a Consultation</h1>
            <p style={subtitleStyle}>For members physically present at the facility</p>

            <div style={cardStyle}>
                <label style={labelStyle}>Member number</label>
                <div style={searchRowStyle}>
                    <input
                        value={memberNumber}
                        onChange={e => { setMemberNumber(e.target.value); setMember(null); }}
                        onKeyDown={e => e.key === 'Enter' && memberNumber && lookupMutation.mutate()}
                        placeholder="e.g. AKF-0001234"
                        style={inputStyle}
                    />
                    <button
                        onClick={() => lookupMutation.mutate()}
                        disabled={!memberNumber || lookupMutation.isPending}
                        style={lookupButtonStyle}
                    >
                        <Search size={14} /> {lookupMutation.isPending ? 'Checking…' : 'Look up'}
                    </button>
                </div>

                {lookupMutation.isError && (
                    <div style={errorBannerStyle}>
                        <AlertCircle size={14} /> {lookupMutation.error?.response?.data?.message || 'Member not found.'}
                    </div>
                )}

                {member && (
                    <div style={memberFoundStyle}>
                        <User size={16} color="#137333" />
                        <div>
                            <div style={memberNameStyle}>{member.full_name}</div>
                            <div style={memberMetaStyle}>{member.member_number} · {member.plan_name} · {member.status}</div>
                        </div>
                    </div>
                )}

                {member && (
                    <>
                        <label style={labelStyle}>Attending doctor (optional)</label>
                        <select value={doctorId} onChange={e => setDoctorId(e.target.value)} style={inputStyle}>
                            <option value="">Not assigned yet</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                            ))}
                        </select>

                        <label style={labelStyle}>Chief complaint</label>
                        <textarea
                            value={chiefComplaint}
                            onChange={e => setChiefComplaint(e.target.value)}
                            placeholder="What is the member here for?"
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        />

                        <button
                            onClick={() => startMutation.mutate()}
                            disabled={startMutation.isPending}
                            style={startButtonStyle}
                        >
                            <Stethoscope size={14} /> {startMutation.isPending ? 'Starting…' : 'Start consultation'}
                        </button>

                        {startMutation.isError && (
                            <div style={errorBannerStyle}>
                                <AlertCircle size={14} /> {startMutation.error?.response?.data?.message || 'Could not start the visit.'}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const pageStyle = { maxWidth: 520 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 16px' };
const cardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6, marginTop: 14 };
const searchRowStyle = { display: 'flex', gap: 8 };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const lookupButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 };
const errorBannerStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fce8e6', color: '#c5221f', borderRadius: 8, fontSize: 12, marginTop: 10 };
const memberFoundStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#e6f4ea', borderRadius: 8, marginTop: 10 };
const memberNameStyle = { fontSize: 13, fontWeight: 700, color: '#2d3748' };
const memberMetaStyle = { fontSize: 11, color: '#4a5568', marginTop: 2 };
const startButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 20, padding: '12px 16px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
