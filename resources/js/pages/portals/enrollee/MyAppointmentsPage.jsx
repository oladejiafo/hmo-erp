/**
 * NEW FILE — resources/js/pages/portals/enrollee/MyAppointmentsPage.jsx
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEnrolleeAppointments, cancelEnrolleeAppointment } from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { Calendar, MapPin, Phone, X } from 'lucide-react';

const STATUS_MAP = {
    requested: ['Requested', '#fff3e0', '#e65100'],
    confirmed: ['Confirmed', '#e6f4ea', '#137333'],
    rescheduled: ['Rescheduled', '#e8f0fe', '#1967d2'],
    completed: ['Completed', '#f0f0f0', '#555'],
    cancelled: ['Cancelled', '#fce8e6', '#c5221f'],
    no_show: ['No-show', '#fce8e6', '#c5221f'],
};

export default function MyAppointmentsPage() {
    const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-appointments', showUpcomingOnly],
        queryFn: () => fetchEnrolleeAppointments(showUpcomingOnly),
    });

    const cancelMutation = useMutation({
        mutationFn: (id) => cancelEnrolleeAppointment(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollee-appointments'] }),
    });

    const appointments = data?.data ?? [];

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>My Appointments</h1>
                    <p style={subtitleStyle}>Track appointment requests and history</p>
                </div>
                <button onClick={() => setShowUpcomingOnly(!showUpcomingOnly)} style={toggleButtonStyle}>
                    {showUpcomingOnly ? 'Show all' : 'Show upcoming only'}
                </button>
            </div>

            {isLoading ? (
                <div style={loadingStyle}>Loading…</div>
            ) : !appointments.length ? (
                <div style={emptyStyle}>
                    <Calendar size={40} color="#a0aec0" style={emptyIconStyle} />
                    <div style={emptyTextStyle}>No appointments yet — find a hospital and book one</div>
                </div>
            ) : (
                <div style={listStyle}>
                    {appointments.map(a => (
                        <div key={a.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <div>
                                    <StatusBadge status={a.status} />
                                    <div style={hcpNameStyle}>{a.hcp_name}</div>
                                    {a.hcp_address && (
                                        <div style={metaStyle}><MapPin size={11} /> {a.hcp_address}</div>
                                    )}
                                    {a.hcp_phone && (
                                        <div style={metaStyle}><Phone size={11} /> {a.hcp_phone}</div>
                                    )}
                                </div>
                                <div style={dateBlockStyle}>
                                    <div style={dateLabelStyle}>{a.confirmed_date ? 'Confirmed' : 'Requested'}</div>
                                    <div style={dateValueStyle}>
                                        {formatDate(a.confirmed_date || a.preferred_date)}
                                    </div>
                                    <div style={timeStyle}>{a.confirmed_time || a.preferred_time_slot}</div>
                                </div>
                            </div>
                            <div style={reasonStyle}>{a.reason}</div>
                            {a.dependent_name && <div style={dependentStyle}>For: {a.dependent_name}</div>}
                            {a.cancellation_reason && (
                                <div style={cancelledNoteStyle}>Cancelled: {a.cancellation_reason}</div>
                            )}
                            {a.is_cancellable && (
                                <button onClick={() => cancelMutation.mutate(a.id)} style={cancelButtonStyle}>
                                    <X size={12} /> Cancel
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const [label, bg, color] = STATUS_MAP[status] ?? [status, '#f0f0f0', '#555'];
    return <span style={{ ...badgeStyle, background: bg, color }}>{label}</span>;
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const toggleButtonStyle = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
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
const dateLabelStyle = { fontSize: 11, color: '#718096' };
const dateValueStyle = { fontSize: 14, fontWeight: 700, color: '#2d3748' };
const timeStyle = { fontSize: 11, color: '#a0aec0', textTransform: 'capitalize' };
const reasonStyle = { fontSize: 13, color: '#4a5568', marginTop: 10 };
const dependentStyle = { fontSize: 12, color: '#718096', marginTop: 4 };
const cancelledNoteStyle = { fontSize: 12, color: '#c5221f', marginTop: 8, background: '#fce8e6', borderRadius: 6, padding: '6px 10px' };
const cancelButtonStyle = { display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', color: '#c5221f', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
