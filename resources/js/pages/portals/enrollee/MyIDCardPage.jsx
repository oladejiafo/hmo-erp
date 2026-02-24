/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/MyIDCardPage.jsx
 * Member self-service: view digital ID card, download PDF, see member details.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEnrolleePortalIDCard } from '../../../api/index';
import { Download, Share2, CreditCard, Shield } from 'lucide-react';
import { formatDate } from '../../../utils/format';

export default function MyIDCardPage() {
    const { data, isLoading } = useQuery({ 
        queryKey: ['enrollee-id-card'], 
        queryFn: fetchEnrolleePortalIDCard 
    });
    
    // const token = localStorage.getItem('auth_token');
    // const downloadUrl = `/api/v1/portal/enrollee/id-card/download?token=${token}`;  

    const d = data?.data;

    if (isLoading) {
        return <div style={loadingStyle}>Loading your ID card…</div>;
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1 style={titleStyle}>My ID Card</h1>
                <p style={subtitleStyle}>
                    Show this card at any accredited healthcare provider
                </p>
            </div>

            {/* Digital ID Card */}
            <div style={cardContainerStyle}>
                {/* Decorative circles */}
                <div style={decorCircle1Style} />
                <div style={decorCircle2Style} />

                {/* Header */}
                <div style={cardHeaderStyle}>
                    <div style={cardHeaderLeftStyle}>
                        <div style={iconContainerStyle}>
                            <Shield size={20} color="#fff" />
                        </div>
                        <div>
                            <div style={cardTitleStyle}>Health Insurance Card</div>
                            <div style={cardSubtitleStyle}>NHIA Accredited HMO</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={statusLabelStyle}>Status</div>
                        <div style={{
                            ...statusBadgeStyle,
                            background: d?.status === 'active' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
                        }}>
                            {d?.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}
                        </div>
                    </div>
                </div>

                {/* Member info */}
                <div style={memberInfoStyle}>
                    <div style={memberNameLabelStyle}>Member Name</div>
                    <div style={memberNameStyle}>{d?.full_name}</div>
                    <div style={memberDetailsStyle}>
                        {d?.gender} · DOB: {formatDate(d?.date_of_birth)}
                    </div>
                </div>

                {/* Card details grid */}
                <div style={detailsGridStyle}>
                    {[
                        ['Member No.', d?.member_number, true],
                        ['Plan',       d?.plan_name,    false],
                        ['Company',    d?.corporate_name, false],
                        ['Valid Until', formatDate(d?.expiry_date), false],
                    ].map(([label, value, mono]) => (
                        <div key={label}>
                            <div style={detailLabelStyle}>{label}</div>
                            <div style={{
                                ...detailValueStyle,
                                fontFamily: mono ? 'monospace' : 'inherit',
                            }}>
                                {value ?? '—'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Primary HCP */}
                {d?.primary_hcp && (
                    <div style={hcpContainerStyle}>
                        <div style={hcpLabelStyle}>Primary Healthcare Provider</div>
                        <div style={hcpNameStyle}>{d.primary_hcp}</div>
                        {d.primary_hcp_phone && (
                            <div style={hcpPhoneStyle}>📞 {d.primary_hcp_phone}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={actionsContainerStyle}>
                <a
                    href={`/api/v1/portal/enrollee/id-card/download`}
                    target="_blank" rel="noreferrer"
                    style={downloadButtonStyle}
                >
                    <Download size={16} /> Download PDF
                </a>
                {/* <a
                    href={downloadUrl}
                    target="_self" rel="noreferrer"
                    style={downloadButtonStyle}
                >
                    <Download size={16} /> Download PDF
                </a> */}
                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({ 
                                title: 'My Health Insurance ID Card', 
                                text: `Member No: ${d?.member_number}` 
                            });
                        }
                    }}
                    style={shareButtonStyle}
                >
                    <Share2 size={16} /> Share
                </button>
            </div>

            {/* Dependants cards */}
            {d?.dependants?.length > 0 && (
                <div style={dependantsSectionStyle}>
                    <div style={dependantsTitleStyle}>Dependant Cards</div>
                    {d.dependants.map(dep => (
                        <div key={dep.id} style={dependantCardStyle}>
                            <div style={dependantCardContentStyle}>
                                <div>
                                    <div style={dependantNameStyle}>
                                        {dep.first_name} {dep.last_name}
                                    </div>
                                    <div style={dependantDetailsStyle}>
                                        {dep.relationship} · {dep.gender} · DOB: {formatDate(dep.date_of_birth)}
                                    </div>
                                </div>
                                <div style={dependantMemberNumberStyle}>{dep.member_number}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* HMO helpline */}
            <div style={helplineContainerStyle}>
                <div style={helplineLabelStyle}>HMO 24/7 Helpline</div>
                <div style={helplineNumberStyle}>{d?.hmo_phone ?? '0800-HMO-HELP'}</div>
                <div style={helplineNoteStyle}>Always call before visiting a new provider</div>
            </div>
        </div>
    );
}

// Style constants
const containerStyle = {
    maxWidth: 560,
    margin: '0 auto',
};

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

const loadingStyle = {
    textAlign: 'center',
    padding: 60,
    color: '#a0aec0',
};

const cardContainerStyle = {
    background: 'linear-gradient(135deg, #0f4c81 0%, #1565c0 40%, #0288d1 100%)',
    borderRadius: 18,
    padding: '28px',
    color: '#fff',
    boxShadow: '0 12px 40px rgba(15,76,129,0.4)',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
};

const decorCircle1Style = {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
};

const decorCircle2Style = {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
};

const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
    zIndex: 1,
};

const cardHeaderLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
};

const iconContainerStyle = {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const cardTitleStyle = {
    fontSize: 13,
    fontWeight: 700,
};

const cardSubtitleStyle = {
    fontSize: 10,
    opacity: 0.7,
};

const statusLabelStyle = {
    fontSize: 10,
    opacity: 0.65,
    marginBottom: 2,
};

const statusBadgeStyle = {
    fontSize: 12,
    padding: '2px 10px',
    borderRadius: 10,
    fontWeight: 600,
};

const memberInfoStyle = {
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
};

const memberNameLabelStyle = {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const memberNameStyle = {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 2,
};

const memberDetailsStyle = {
    fontSize: 13,
    opacity: 0.8,
};

const detailsGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 20px',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
};

const detailLabelStyle = {
    fontSize: 10,
    opacity: 0.65,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const detailValueStyle = {
    fontSize: 13,
    fontWeight: 600,
};

const hcpContainerStyle = {
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '10px 14px',
    position: 'relative',
    zIndex: 1,
};

const hcpLabelStyle = {
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
    textTransform: 'uppercase',
};

const hcpNameStyle = {
    fontSize: 13,
    fontWeight: 600,
};

const hcpPhoneStyle = {
    fontSize: 11,
    opacity: 0.8,
};

const actionsContainerStyle = {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
};

const downloadButtonStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px',
    background: '#0f4c81',
    color: '#fff',
    borderRadius: 10,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
};

const shareButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    background: '#fff',
    color: '#0f4c81',
    border: '1px solid #c5d5e8',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
};

const dependantsSectionStyle = {
    marginTop: 24,
};

const dependantsTitleStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: 12,
};

const dependantCardStyle = {
    background: 'linear-gradient(135deg, #374151, #4b5563)',
    borderRadius: 14,
    padding: '18px 22px',
    marginBottom: 10,
    color: '#fff',
    boxShadow: '0 4px 14px rgba(55,65,81,0.3)',
};

const dependantCardContentStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const dependantNameStyle = {
    fontSize: 16,
    fontWeight: 700,
};

const dependantDetailsStyle = {
    fontSize: 12,
    opacity: 0.75,
    textTransform: 'capitalize',
};

const dependantMemberNumberStyle = {
    fontSize: 11,
    fontFamily: 'monospace',
    opacity: 0.9,
};

const helplineContainerStyle = {
    marginTop: 20,
    background: '#f7fafc',
    borderRadius: 10,
    padding: '14px 16px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
};

const helplineLabelStyle = {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
};

const helplineNumberStyle = {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f4c81',
};

const helplineNoteStyle = {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
};