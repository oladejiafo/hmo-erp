/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/FindHCPPage.jsx
 * Member self-service: search for accredited healthcare providers.
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchEnrolleePortalHCPs, bookEnrolleeAppointment, checkInAtProvider, 
    searchDoctors, fetchDoctorSlots
} from '../../../api/index';
import { Search, MapPin, Phone, Star, Building2, CalendarPlus, X, CheckCircle, MapPinned } from 'lucide-react';

export default function FindHCPPage() {
    const [search, setSearch] = useState('');
    const [tier, setTier]     = useState('');
    const [type, setType]     = useState('');
    const [bookingHcp, setBookingHcp] = useState(null);
    const [checkedInIds, setCheckedInIds] = useState([]);

    const checkInMutation = useMutation({
        mutationFn: (hcpId) => checkInAtProvider(hcpId),
        onSuccess: (_, hcpId) => setCheckedInIds(prev => [...prev, hcpId]),
    });

    const { data, isLoading } = useQuery({
        queryKey: ['enrollee-find-hcp', search, tier, type],
        queryFn:  () => fetchEnrolleePortalHCPs({ search, tier, type }),
        enabled:  search.length > 1 || tier !== '' || type !== '',
    });

    const hcps = data?.data ?? [];

    return (
        <div>
            <div style={headerStyle}>
                <h1 style={titleStyle}>Find a Hospital</h1>
                <p style={subtitleStyle}>
                    Search for accredited healthcare providers in our network
                </p>
            </div>

            {/* Search bar */}
            <div style={searchCardStyle}>
                <div style={searchInputContainerStyle}>
                    <Search size={16} style={searchIconStyle} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by hospital name, address, or area…"
                        style={{ ...inputStyle, paddingLeft: 38, fontSize: 14 }}
                    />
                </div>
                <div style={filterContainerStyle}>
                    <select value={tier} onChange={e=>setTier(e.target.value)} style={inputStyle}>
                        <option value="">All Tiers</option>
                        <option value="primary">Primary Care (GP/Clinic)</option>
                        <option value="secondary">Secondary (General Hospital)</option>
                        <option value="tertiary">Tertiary (Teaching/Specialist)</option>
                    </select>
                    <select value={type} onChange={e=>setType(e.target.value)} style={inputStyle}>
                        <option value="">All Types</option>
                        <option value="general">General Hospital</option>
                        <option value="specialist">Specialist Centre</option>
                        <option value="clinic">Clinic</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="diagnostic">Diagnostic Centre</option>
                    </select>
                </div>
            </div>

            {/* Initial prompt */}
            {!search && !tier && !type && (
                <div style={initialPromptStyle}>
                    <MapPin size={40} style={initialPromptIconStyle} />
                    <div style={initialPromptTextStyle}>Type a name or location to search for providers</div>
                </div>
            )}

            {/* Results */}
            {isLoading && <div style={loadingStyle}>Searching…</div>}
            
            {!isLoading && (search || tier || type) && !hcps.length && (
                <div style={noResultsStyle}>
                    No providers found. Try a different search.
                </div>
            )}
            
            <div style={resultsContainerStyle}>
                {hcps.map(hcp => (
                    <div key={hcp.id} style={hcpCardStyle}>
                        <div style={hcpCardHeaderStyle}>
                            <div style={hcpInfoContainerStyle}>
                                <div style={hcpIconContainerStyle}>
                                    <Building2 size={22} color="#0f4c81" />
                                </div>
                                <div>
                                    <div style={hcpNameStyle}>{hcp.name}</div>
                                    <div style={hcpAddressStyle}>
                                        <MapPin size={11} /> {hcp.address}
                                    </div>
                                    {hcp.phone && (
                                        <div style={hcpPhoneStyle}>
                                            <Phone size={11} /> {hcp.phone}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={hcpBadgeContainerStyle}>
                                <TierBadge tier={hcp.tier} />
                                {hcp.performance_score && (
                                    <div style={performanceStyle}>
                                        <Star size={12} /> {parseFloat(hcp.performance_score).toFixed(0)}/100
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {hcp.services_available && (
                            <div style={servicesContainerStyle}>
                                {hcp.services_available.slice(0,5).map(s => (
                                    <span key={s} style={serviceTagStyle}>{s}</span>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setBookingHcp(hcp)} style={bookButtonStyle}>
                                <CalendarPlus size={14} /> Book appointment
                            </button>
                            {checkedInIds.includes(hcp.id) ? (
                                <span style={checkedInBadgeStyle}><CheckCircle size={13} /> Checked in</span>
                            ) : (
                                <button
                                    onClick={() => checkInMutation.mutate(hcp.id)}
                                    disabled={checkInMutation.isPending}
                                    style={checkInButtonStyle}
                                >
                                    <MapPinned size={13} /> I'm here
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {bookingHcp && (
                <BookAppointmentModal hcp={bookingHcp} onClose={() => setBookingHcp(null)} />
            )}
        </div>
    );
}

function BookAppointmentModal({ hcp, onClose }) {
    const [date, setDate] = useState('');
    const [timeSlot, setTimeSlot] = useState('morning');
    const [reason, setReason] = useState('');
    const [done, setDone] = useState(false);

    // ── Doctor and slot selection ──
    const [doctorId, setDoctorId] = useState(null);
    const [slotTime, setSlotTime] = useState(null);

    // PHASE 1 - Telemedicine: only offered once a doctor+slot is picked,
    // since video/audio consults require instant confirmation.
    const [consultationType, setConsultationType] = useState('in_person');

    const { data: doctorsData } = useQuery({
        queryKey: ['hcp-doctors', hcp.id],
        queryFn: () => searchDoctors({ hcp_id: hcp.id }),
        enabled: !!hcp.id,
    });
    const doctors = doctorsData?.data ?? [];

    const { data: slotsData } = useQuery({
        queryKey: ['doctor-slots', doctorId, date],
        queryFn: () => fetchDoctorSlots(doctorId, date),
        enabled: !!doctorId && !!date,
    });
    const slots = slotsData?.data ?? [];

    // ── Booking mutation ──
    const bookMutation = useMutation({
        mutationFn: () => {
            const payload = {
                hcp_id: hcp.id,
                preferred_date: date,
                preferred_time_slot: timeSlot,
                reason,
            };
            // If a doctor and slot are selected, include them for instant confirmation
            if (doctorId) {
                payload.doctor_id = doctorId;
            }
            if (slotTime) {
                payload.slot_time = slotTime;
                payload.consultation_type = consultationType; // PHASE 1
            }
            return bookEnrolleeAppointment(payload);
        },
        onSuccess: () => setDone(true),
    });

    const canBook = date && reason.trim().length > 0;

    return (
        <>
            <div style={modalBackdropStyle} onClick={onClose} />
            <div style={modalStyle}>
                <div style={modalHeaderStyle}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                        {done ? 'Appointment requested' : `Book at ${hcp.name}`}
                    </h3>
                    <button onClick={onClose} style={modalCloseStyle}><X size={16} /></button>
                </div>

                {done ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle size={36} color="#137333" style={{ marginBottom: 10 }} />
                        <p style={{ fontSize: 13, color: '#4a5568' }}>
                            {hcp.name} will confirm your slot. You'll see it under My Appointments.
                        </p>
                    </div>
                ) : (
                    <>
                        <label style={modalLabelStyle}>Preferred date</label>
                        <input
                            type="date" value={date} onChange={e => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            style={modalInputStyle}
                        />

                        {/* ── Doctor selection ── */}
                        {doctors.length > 0 && (
                            <>
                                <label style={modalLabelStyle}>
                                    Doctor (optional, pick one for instant confirmation)
                                </label>
                                <select 
                                    value={doctorId ?? ''} 
                                    onChange={e => { 
                                        setDoctorId(e.target.value || null); 
                                        setSlotTime(null); 
                                    }} 
                                    style={modalInputStyle}
                                >
                                    <option value="">No preference (request only)</option>
                                    {doctors.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.name} - {d.specialty}
                                        </option>
                                    ))}
                                </select>

                                {/* ── Slot selection ── */}
                                {doctorId && date && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                        {slots.length === 0 && (
                                            <span style={{ fontSize: 12, color: '#a0aec0' }}>No slots this day</span>
                                        )}
                                        {slots.map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => setSlotTime(s)} 
                                                style={{
                                                    padding: '5px 10px', 
                                                    borderRadius: 6, 
                                                    fontSize: 12, 
                                                    cursor: 'pointer',
                                                    border: slotTime === s ? '1px solid #0f4c81' : '1px solid #e2e8f0',
                                                    background: slotTime === s ? '#0f4c81' : '#fff', 
                                                    color: slotTime === s ? '#fff' : '#4a5568',
                                                }}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        <label style={modalLabelStyle}>Preferred time</label>
                        <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} style={modalInputStyle}>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="evening">Evening</option>
                        </select>

                        {/* PHASE 1 - Telemedicine: only offered on instant-confirm bookings */}
                        {slotTime && (
                            <>
                                <label style={modalLabelStyle}>How would you like to consult?</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    {[
                                        { value: 'in_person', label: 'In person' },
                                        { value: 'video', label: 'Video call' },
                                        { value: 'audio', label: 'Audio call' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setConsultationType(opt.value)}
                                            style={{
                                                flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: 12,
                                                cursor: 'pointer',
                                                border: consultationType === opt.value ? '1px solid #0f4c81' : '1px solid #e2e8f0',
                                                background: consultationType === opt.value ? '#0f4c81' : '#fff',
                                                color: consultationType === opt.value ? '#fff' : '#4a5568',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <label style={modalLabelStyle}>Reason for visit</label>
                        <input
                            value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="e.g. General checkup"
                            style={modalInputStyle}
                        />

                        {/* ── Submit button ── */}
                        <button
                            onClick={() => bookMutation.mutate()}
                            disabled={!canBook || bookMutation.isPending}
                            style={modalSubmitStyle}
                        >
                            {bookMutation.isPending ? 'Requesting…' : 'Request appointment'}
                        </button>
                        {bookMutation.isError && (
                            <div style={{ marginTop: 8, fontSize: 12, color: '#c5221f' }}>
                                {bookMutation.error?.response?.data?.message || 'Something went wrong.'}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

function TierBadge({ tier }) {
    const map = { 
        primary: ['Primary', '#e6f4ea', '#137333'], 
        secondary: ['Secondary', '#e8f0fe', '#0f4c81'], 
        tertiary: ['Tertiary', '#f3e5f5', '#5e35b1'] 
    };
    const [label, bg, color] = map[tier] ?? [tier, '#f0f0f0', '#555'];
    return <span style={{ ...tierBadgeStyle, background: bg, color }}>{label}</span>;
}

// Style constants
const headerStyle = {
    marginBottom: 24,
};

const titleStyle = {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
};

const subtitleStyle = {
    color: '#718096',
    fontSize: 14,
    margin: '4px 0 0',
};

const searchCardStyle = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
    padding: '16px',
    marginBottom: 20,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
};

const searchInputContainerStyle = {
    position: 'relative',
    marginBottom: 12,
};

const searchIconStyle = {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#a0aec0',
};

const filterContainerStyle = {
    display: 'flex',
    gap: 10,
};

const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    background: '#f7fafc',
    boxSizing: 'border-box',
};

const initialPromptStyle = {
    textAlign: 'center',
    padding: '40px 0',
    color: '#a0aec0',
};

const initialPromptIconStyle = {
    marginBottom: 12,
    display: 'block',
    margin: '0 auto 12px',
};

const initialPromptTextStyle = {
    fontSize: 14,
};

const loadingStyle = {
    textAlign: 'center',
    padding: 40,
    color: '#a0aec0',
};

const noResultsStyle = {
    textAlign: 'center',
    padding: 40,
    color: '#a0aec0',
    fontSize: 14,
};

const resultsContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
};

const hcpCardStyle = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
    padding: '16px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const hcpCardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
};

const hcpInfoContainerStyle = {
    display: 'flex',
    gap: 12,
};

const hcpIconContainerStyle = {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: '#e8f0fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
};

const hcpNameStyle = {
    fontSize: 15,
    fontWeight: 600,
    color: '#2d3748',
};

const hcpAddressStyle = {
    fontSize: 12,
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
};

const hcpPhoneStyle = {
    fontSize: 12,
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
};

const hcpBadgeContainerStyle = {
    textAlign: 'right',
    flexShrink: 0,
};

const tierBadgeStyle = {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 10,
    fontWeight: 600,
};

const performanceStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    justifyContent: 'flex-end',
    marginTop: 6,
    fontSize: 12,
    color: '#b45309',
};

const servicesContainerStyle = {
    marginTop: 10,
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
};

const serviceTagStyle = {
    background: '#f0f4f8',
    color: '#4a5568',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 6,
};

const bookButtonStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 12, 
    padding: '7px 14px', 
    borderRadius: 8, 
    border: '1px solid #0f4c81', 
    background: '#fff', 
    color: '#0f4c81', 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: 'pointer' 
};

const modalBackdropStyle = { 
    position: 'fixed', 
    inset: 0, 
    background: 'rgba(0,0,0,0.45)', 
    zIndex: 1000 
};

const modalStyle = { 
    position: 'fixed', 
    top: '50%', 
    left: '50%', 
    transform: 'translate(-50%,-50%)', 
    background: '#fff', 
    borderRadius: 14, 
    padding: 20, 
    width: 380, 
    maxWidth: '90vw', 
    zIndex: 1001, 
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)' 
};

const modalHeaderStyle = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14 
};

const modalCloseStyle = { 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer', 
    color: '#718096' 
};

const modalLabelStyle = { 
    display: 'block', 
    fontSize: 11, 
    fontWeight: 600, 
    color: '#4a5568', 
    marginTop: 10, 
    marginBottom: 4 
};

const modalInputStyle = { 
    width: '100%', 
    padding: '8px 12px', 
    border: '1px solid #e2e8f0', 
    borderRadius: 8, 
    fontSize: 13, 
    boxSizing: 'border-box', 
    background: '#f7fafc' 
};

const modalSubmitStyle = { 
    width: '100%', 
    marginTop: 16, 
    padding: '9px 0', 
    borderRadius: 8, 
    border: 'none', 
    background: '#137333', 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: 700, 
    cursor: 'pointer' 
};

const checkInButtonStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 5, 
    marginTop: 12, 
    padding: '7px 14px', 
    borderRadius: 8, 
    border: '1px solid #137333', 
    background: '#fff', 
    color: '#137333', 
    fontSize: 12, 
    fontWeight: 600, 
    cursor: 'pointer' 
};

const checkedInBadgeStyle = { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 5, 
    marginTop: 12, 
    padding: '7px 14px', 
    fontSize: 12, 
    fontWeight: 600, 
    color: '#137333' 
};