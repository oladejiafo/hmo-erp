/**
 * NEW FILE — resources/js/pages/portals/provider/ProviderPatientHistoryPage.jsx
 *
 * PHASE 3 — Mini EMR.
 * A doctor looks a member up by member number (same lookup used on the
 * Verify page), then sees every completed encounter they've ever had —
 * regardless of which HCP or doctor treated them. This is what makes it
 * an EMR rather than a per-visit note: the next doctor isn't starting
 * from zero.
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { verifyProviderEnrollee, fetchPatientHistory } from '../../../api/index';
import { formatDate } from '../../../utils/format';
import { Search, User, Video, Phone, Stethoscope, Pill, ClipboardList, AlertCircle } from 'lucide-react';

export default function ProviderPatientHistoryPage() {
    const [memberNumber, setMemberNumber] = useState('');
    const [member, setMember] = useState(null);

    const lookupMutation = useMutation({
        mutationFn: () => verifyProviderEnrollee(memberNumber),
        onSuccess: (res) => setMember(res.data),
    });

    // For a dependent, history is tracked against the principal enrollee_id
    const enrolleeId = member ? (member.type === 'dependent' ? member.enrollee_id : member.id) : null;

    const { data, isLoading } = useQuery({
        queryKey: ['patient-history', enrolleeId],
        queryFn: () => fetchPatientHistory(enrolleeId),
        enabled: !!enrolleeId,
    });

    const encounters = data?.data ?? [];

    return (
        <div>
            <h1 style={titleStyle}>Patient History</h1>
            <p style={subtitleStyle}>Look up a member to see their full clinical history</p>

            <div style={searchRowStyle}>
                <input
                    value={memberNumber}
                    onChange={e => setMemberNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && memberNumber && lookupMutation.mutate()}
                    placeholder="Member number, e.g. AKF-0001234"
                    style={searchInputStyle}
                />
                <button
                    onClick={() => lookupMutation.mutate()}
                    disabled={!memberNumber || lookupMutation.isPending}
                    style={searchButtonStyle}
                >
                    <Search size={14} /> {lookupMutation.isPending ? 'Looking up…' : 'Look up'}
                </button>
            </div>

            {lookupMutation.isError && (
                <div style={errorBannerStyle}>
                    <AlertCircle size={14} /> {lookupMutation.error?.response?.data?.message || 'Member not found.'}
                </div>
            )}

            {member && (
                <>
                    <div style={memberCardStyle}>
                        <User size={20} color="#0f4c81" />
                        <div>
                            <div style={memberNameStyle}>{member.full_name}</div>
                            <div style={memberMetaStyle}>{member.member_number} · {member.plan_name}</div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={loadingStyle}>Loading history…</div>
                    ) : !encounters.length ? (
                        <div style={emptyStyle}>No completed encounters on record yet.</div>
                    ) : (
                        <div style={timelineStyle}>
                            {encounters.map(e => (
                                <div key={e.id} style={timelineItemStyle}>
                                    <div style={timelineDateStyle}>{formatDate(e.scheduled_at)}</div>
                                    <div style={timelineCardStyle}>
                                        <div style={timelineHeaderStyle}>
                                            <span style={typeBadgeStyle}>
                                                {e.type === 'video' ? <Video size={11} /> : e.type === 'audio' ? <Phone size={11} /> : <Stethoscope size={11} />}
                                                {' '}{e.type}
                                            </span>
                                            <span style={doctorStyle}>
                                                {e.doctor_name ? `Dr. ${e.doctor_name}` : e.hcp_name}
                                            </span>
                                        </div>

                                        {e.chief_complaint && (
                                            <div style={fieldStyle}><strong>Complaint:</strong> {e.chief_complaint}</div>
                                        )}

                                        {e.diagnoses?.length > 0 && (
                                            <div style={fieldStyle}>
                                                <strong>Diagnoses:</strong>{' '}
                                                {e.diagnoses.map(d => (
                                                    <span key={d.code} style={dxChipStyle}>
                                                        {d.code}{d.type === 'primary' ? ' (primary)' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {e.consultation_notes && (
                                            <div style={fieldStyle}><strong>Notes:</strong> {e.consultation_notes}</div>
                                        )}

                                        {e.treatment_plans?.length > 0 && (
                                            <div style={fieldStyle}>
                                                <ClipboardList size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                                <strong>Treatment plan:</strong> {e.treatment_plans[0].plan_text}
                                            </div>
                                        )}

                                        {e.prescriptions?.length > 0 && (
                                            <div style={fieldStyle}>
                                                <Pill size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                                <strong>Prescribed:</strong> {e.prescriptions.map(rx => rx.drug_name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 16px' };
const searchRowStyle = { display: 'flex', gap: 8, marginBottom: 12, maxWidth: 480 };
const searchInputStyle = { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 };
const searchButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const errorBannerStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fce8e6', color: '#c5221f', borderRadius: 8, fontSize: 12, marginBottom: 12 };
const memberCardStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, marginBottom: 20 };
const memberNameStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748' };
const memberMetaStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const loadingStyle = { textAlign: 'center', padding: 40, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 40, color: '#a0aec0', fontSize: 13, background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0' };
const timelineStyle = { display: 'flex', flexDirection: 'column', gap: 4 };
const timelineItemStyle = { display: 'flex', gap: 16 };
const timelineDateStyle = { width: 90, flexShrink: 0, fontSize: 11, color: '#a0aec0', paddingTop: 14, textAlign: 'right' };
const timelineCardStyle = { flex: 1, background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '12px 16px', marginBottom: 12 };
const timelineHeaderStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 8 };
const typeBadgeStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0f4c81', textTransform: 'capitalize' };
const doctorStyle = { fontSize: 12, fontWeight: 600, color: '#4a5568' };
const fieldStyle = { fontSize: 12, color: '#4a5568', marginTop: 6, lineHeight: 1.5 };
const dxChipStyle = { display: 'inline-block', background: '#e8f0fe', color: '#1967d2', fontWeight: 600, fontSize: 11, padding: '2px 6px', borderRadius: 4, marginRight: 4 };
