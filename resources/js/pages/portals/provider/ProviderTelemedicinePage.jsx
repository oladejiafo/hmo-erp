/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderTelemedicinePage.jsx
 *
 * PHASE 1 — Telemedicine (provider side).
 * Mirrors the visual pattern of ProviderVerifyPage.jsx in this same folder.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchProviderTelemedicineQueue, joinProviderTelemedicine } from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { Video, Phone, Loader, Users } from 'lucide-react';

export default function ProviderTelemedicinePage() {
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['provider-telemedicine-queue'],
        queryFn: () => fetchProviderTelemedicineQueue(),
        refetchInterval: 30000, // keep the queue fresh while the doctor has this tab open
    });

    const joinMutation = useMutation({
        mutationFn: (encounterId) => joinProviderTelemedicine(encounterId),
        onSuccess: (res, encounterId) => {
            navigate(`/provider/telemedicine/${encounterId}/room`, {
                state: { joinUrl: res.data.join_url },
            });
        },
    });

    const queue = data?.data ?? [];

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Telemedicine Queue</h1>
                    <p style={subtitleStyle}>Video and audio consultations waiting for you</p>
                </div>
            </div>

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !queue.length ? (
                <div style={emptyStyle}>
                    <Users size={40} color="#a0aec0" style={emptyIconStyle} />
                    <div style={emptyTextStyle}>No consultations waiting right now</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {queue.map(e => (
                        <div key={e.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <div>
                                    <StatusBadge status={e.status} />
                                    <div style={memberNameStyle}>{e.member_name}</div>
                                    {e.member_number && <div style={metaStyle}>ID: {e.member_number}</div>}
                                    {e.doctor_name && <div style={metaStyle}>Assigned: Dr. {e.doctor_name}</div>}
                                </div>
                                <div style={dateBlockStyle}>
                                    <div style={dateValueStyle}>{formatDate(e.scheduled_at)}</div>
                                    <div style={timeStyle}>
                                        {e.type === 'video' ? <Video size={11} /> : <Phone size={11} />} {e.type}
                                    </div>
                                </div>
                            </div>

                            {e.chief_complaint && <div style={reasonStyle}>{e.chief_complaint}</div>}

                            <button
                                onClick={() => joinMutation.mutate(e.id)}
                                disabled={joinMutation.isPending && joinMutation.variables === e.id}
                                style={joinButtonStyle}
                            >
                                {joinMutation.isPending && joinMutation.variables === e.id
                                    ? <><Loader size={13} className="spin" /> Connecting…</>
                                    : <><Video size={13} /> Start consultation</>}
                            </button>

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

const STATUS_MAP = {
    scheduled: ['Scheduled', '#e8f0fe', '#1967d2'],
    waiting: ['Waiting', '#fff3e0', '#e65100'],
    in_progress: ['In progress', '#e6f4ea', '#137333'],
};

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

const headerRowStyle = { marginBottom: 16 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const loadingStyle = { textAlign: 'center', padding: 60, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0' };
const emptyIconStyle = { display: 'block', margin: '0 auto 12px' };
const emptyTextStyle = { color: '#a0aec0', fontSize: 14 };
const listStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0', padding: '16px 20px' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 };
const badgeStyle = { fontSize: 11, padding: '3px 8px', borderRadius: 10, fontWeight: 600 };
const memberNameStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748', marginTop: 6 };
const metaStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const dateBlockStyle = { textAlign: 'right' };
const dateValueStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
const timeStyle = { fontSize: 11, color: '#a0aec0', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 };
const reasonStyle = { fontSize: 13, color: '#4a5568', marginTop: 10 };
const joinButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const errorTextStyle = { marginTop: 8, fontSize: 12, color: '#c5221f' };
