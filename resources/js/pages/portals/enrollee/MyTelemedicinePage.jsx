/**
 * NEW FILE — resources/js/pages/portals/enrollee/MyTelemedicinePage.jsx
 *
 * PHASE 1 — Telemedicine.
 * Mirrors the visual pattern of MyAppointmentsPage.jsx in this same folder.
 * Lists video/audio encounters, lets the member join a live consult, and
 * shows notes + prescriptions once a consult is completed.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchEnrolleeEncounters, joinEnrolleeTelemedicine, fetchEnrolleePrescriptions } from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { Video, Phone, Calendar, Pill, Loader } from 'lucide-react';

const STATUS_MAP = {
    scheduled: ['Scheduled', '#e8f0fe', '#1967d2'],
    waiting: ['Waiting for doctor', '#fff3e0', '#e65100'],
    in_progress: ['In progress', '#e6f4ea', '#137333'],
    completed: ['Completed', '#f0f0f0', '#555'],
    cancelled: ['Cancelled', '#fce8e6', '#c5221f'],
    no_show: ['No-show', '#fce8e6', '#c5221f'],
};

export default function MyTelemedicinePage() {
    const [tab, setTab] = useState('upcoming'); // upcoming | history | prescriptions
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-encounters', tab],
        queryFn: () => fetchEnrolleeEncounters(tab === 'upcoming'),
        enabled: tab !== 'prescriptions',
    });

    const { data: rxData, isLoading: rxLoading } = useQuery({
        queryKey: ['enrollee-prescriptions'],
        queryFn: fetchEnrolleePrescriptions,
        enabled: tab === 'prescriptions',
    });

    const joinMutation = useMutation({
        mutationFn: (encounterId) => joinEnrolleeTelemedicine(encounterId),
        onSuccess: (res, encounterId) => {
            // Full-page video room, not part of the portal layout chrome
            navigate(`/enrollee/telemedicine/${encounterId}/room`, {
                state: { joinUrl: res.data.join_url },
            });
        },
    });

    const encounters = data?.data ?? [];
    const prescriptions = rxData?.data ?? [];

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Telemedicine</h1>
                    <p style={subtitleStyle}>Book, join, and review your virtual consultations</p>
                </div>
                <button onClick={() => navigate('/enrollee/find-hcp')} style={bookButtonStyle}>
                    <Video size={14} /> Book a consult
                </button>
            </div>

            <div style={tabRowStyle}>
                <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming</TabButton>
                <TabButton active={tab === 'history'} onClick={() => setTab('history')}>History</TabButton>
                <TabButton active={tab === 'prescriptions'} onClick={() => setTab('prescriptions')}>Prescriptions</TabButton>
            </div>

            {tab === 'prescriptions' ? (
                rxLoading ? (
                    <div style={loadingStyle}>Loading…</div>
                ) : !prescriptions.length ? (
                    <EmptyState icon={Pill} text="No prescriptions yet" />
                ) : (
                    <div style={listStyle}>
                        {prescriptions.map(rx => (
                            <div key={rx.id} style={cardStyle}>
                                <div style={cardHeaderStyle}>
                                    <div style={hcpNameStyle}>{rx.drug_name}</div>
                                    <div style={dateValueStyle}>{formatDate(rx.issued_at)}</div>
                                </div>
                                <div style={reasonStyle}>
                                    {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ') || 'See instructions'}
                                </div>
                                {rx.instructions && <div style={metaStyle}>{rx.instructions}</div>}
                                {rx.doctor_name && <div style={dependentStyle}>Prescribed by Dr. {rx.doctor_name}</div>}
                            </div>
                        ))}
                    </div>
                )
            ) : isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !encounters.length ? (
                <EmptyState icon={Video} text={tab === 'upcoming' ? 'No upcoming consultations' : 'No past consultations'} />
            ) : (
                <div style={listStyle}>
                    {encounters.map(e => (
                        <div key={e.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <div>
                                    <StatusBadge status={e.status} />
                                    <div style={hcpNameStyle}>
                                        {e.doctor_name ? `Dr. ${e.doctor_name}` : e.hcp_name}
                                    </div>
                                    {e.doctor_specialty && <div style={metaStyle}>{e.doctor_specialty}</div>}
                                </div>
                                <div style={dateBlockStyle}>
                                    <div style={dateValueStyle}>{formatDate(e.scheduled_at)}</div>
                                    <div style={timeStyle}>
                                        {e.type === 'video' ? <Video size={11} /> : <Phone size={11} />} {e.type}
                                    </div>
                                </div>
                            </div>

                            {e.is_joinable && (
                                <button
                                    onClick={() => joinMutation.mutate(e.id)}
                                    disabled={joinMutation.isPending && joinMutation.variables === e.id}
                                    style={joinButtonStyle}
                                >
                                    {joinMutation.isPending && joinMutation.variables === e.id
                                        ? <><Loader size={13} className="spin" /> Connecting…</>
                                        : <><Video size={13} /> Join consultation</>}
                                </button>
                            )}

                            {e.status === 'completed' && (e.consultation_notes || e.follow_up_advice) && (
                                <div style={notesBoxStyle}>
                                    {e.follow_up_advice && (
                                        <div><strong>Follow-up advice:</strong> {e.follow_up_advice}</div>
                                    )}
                                </div>
                            )}

                            {joinMutation.isError && joinMutation.variables === e.id && (
                                <div style={errorTextStyle}>
                                    {joinMutation.error?.response?.data?.message || 'Could not join right now.'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, children }) {
    return (
        <button onClick={onClick} style={{ ...tabButtonStyle, ...(active ? tabButtonActiveStyle : {}) }}>
            {children}
        </button>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

function EmptyState({ icon: Icon, text }) {
    return (
        <div style={emptyStyle}>
            <Icon size={40} color="#a0aec0" style={emptyIconStyle} />
            <div style={emptyTextStyle}>{text}</div>
        </div>
    );
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const bookButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const tabRowStyle = { display: 'flex', gap: 8, marginBottom: 16 };
const tabButtonStyle = { padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#718096', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const tabButtonActiveStyle = { background: '#0f4c81', borderColor: '#0f4c81', color: '#fff' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '16px 20px' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600 };
const hcpNameStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748', marginTop: 6 };
const metaStyle = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#718096', marginTop: 2 };
const dateBlockStyle = { textAlign: 'right' };
const dateValueStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
const timeStyle = { fontSize: 11, color: '#a0aec0', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 };
const reasonStyle = { fontSize: 13, color: '#4a5568', marginTop: 10 };
const dependentStyle = { fontSize: 12, color: '#718096', marginTop: 4 };
const joinButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const notesBoxStyle = { marginTop: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#4a5568' };
const errorTextStyle = { marginTop: 8, fontSize: 12, color: '#c5221f' };
