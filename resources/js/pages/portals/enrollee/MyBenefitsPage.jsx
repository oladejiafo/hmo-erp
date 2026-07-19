/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/MyBenefitsPage.jsx
 * Member self-service: what's covered, limits, waiting periods, exclusions.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEnrolleePortalBenefits } from '../../../api/index';
import { formatCurrency, formatDate } from '../../../utils/format';
import { CheckCircle, XCircle, Clock, Activity, ChevronDown, ChevronUp } from 'lucide-react';

export default function MyBenefitsPage() {
    const { data, isLoading } = useQuery({ 
        queryKey: ['enrollee-benefits'], 
        queryFn: fetchEnrolleePortalBenefits 
    });
    
    const [expanded, setExpanded] = useState({});
    const d = data?.data;

    const toggleSection = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

    const coverageItems = [
        { key:'gp',         label:'GP / Primary Care',       icon:'🏥', covered:true,  note:'Unlimited visits at your designated provider' },
        { key:'emergency',  label:'Emergency Care',           icon:'🚑', covered:true,  note:'Any accredited hospital, no prior authorisation needed' },
        { key:'specialist', label:'Specialist Consultation',  icon:'👨‍⚕️', covered: d?.plan_tier !== 'basic', note:'Requires GP referral on standard plans' },
        { key:'inpatient',  label:'Inpatient / Hospitalisation', icon:'🏨', covered:true, note:`${d?.ward_class ?? 'Standard'} ward` },
        { key:'maternity',  label:'Maternity',                icon:'👶', covered:true,  note:`10-month waiting period. Normal delivery included${d?.plan_tier === 'premium' ? ', C-section included' : ''}` },
        { key:'dental',     label:'Dental',                   icon:'🦷', covered: d?.plan_tier !== 'basic', note:'Basic extractions and fillings. Cosmetic excluded.' },
        { key:'optical',    label:'Optical',                  icon:'👓', covered: d?.plan_tier !== 'basic', note:'Lenses and frames. Laser surgery excluded.' },
        { key:'pharmacy',   label:'Pharmacy / Drugs',         icon:'💊', covered:true,  note:'Formulary drugs on OPD visits. Chronic drugs after 2–3 months.' },
        { key:'physio',     label:'Physiotherapy',            icon:'🏃', covered: d?.plan_tier === 'premium', note:'Requires pre-authorisation.' },
        { key:'lab',        label:'Lab & Diagnostics',        icon:'🔬', covered:true,  note:'Standard tests. Advanced imaging (MRI/CT) requires pre-auth.' },
    ];

    if (isLoading) {
        return <div style={loadingStyle}>Loading your benefits…</div>;
    }

    return (
        <div>
            <div style={headerStyle}>
                <h1 style={titleStyle}>My Benefits</h1>
                <p style={subtitleStyle}>What's covered under your health plan</p>
            </div>

            {/* Plan banner */}
            {d && (
                <div style={planBannerStyle}>
                    <div>
                        <div style={planLabelStyle}>Your Plan</div>
                        <div style={planNameStyle}>{d.plan_name}</div>
                    </div>
                    <div style={planStatsStyle}>
                        <div style={planStatStyle}>
                            <div style={planStatLabelStyle}>Annual Limit</div>
                            <div style={planStatValueStyle}>{formatCurrency(d.max_benefit ?? 0, false)}</div>
                        </div>
                        <div style={planStatStyle}>
                            <div style={planStatLabelStyle}>Remaining</div>
                            <div style={{ ...planStatValueStyle, color: '#4ade80' }}>{formatCurrency(d.benefit_balance ?? 0, false)}</div>
                        </div>
                        <div style={planStatStyle}>
                            <div style={planStatLabelStyle}>Expires</div>
                            <div style={planStatValueStyle}>{formatDate(d.coverage_end)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Coverage items */}
            <div style={coverageCardStyle}>
                <div style={coverageHeaderStyle}>
                    Coverage Details
                </div>
                {coverageItems.map((item, i) => (
                    <div key={item.key} style={{ borderBottom: i < coverageItems.length-1 ? borderBottomStyle : 'none' }}>
                        <div
                            style={coverageItemStyle}
                            onClick={() => toggleSection(item.key)}
                        >
                            <span style={iconStyle}>{item.icon}</span>
                            <div style={itemLabelStyle}>{item.label}</div>
                            {item.covered ? (
                                <CheckCircle size={18} color="#137333" />
                            ) : (
                                <XCircle size={18} color="#a0aec0" />
                            )}
                            {expanded[item.key] ? 
                                <ChevronUp size={16} color="#718096" /> : 
                                <ChevronDown size={16} color="#718096" />
                            }
                        </div>
                        {expanded[item.key] && (
                            <div style={itemNoteStyle}>
                                {item.covered ? item.note : 'Not included in your current plan. Ask your HR about upgrading.'}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Waiting periods */}
            <div style={waitingPeriodsCardStyle}>
                <div style={waitingPeriodsHeaderStyle}>
                    <Clock size={16} color="#b45309" />
                    <div style={waitingPeriodsTitleStyle}>Waiting Periods</div>
                </div>
                {[
                    { service:'General / OPD',       period:'None - immediate access' },
                    { service:'Maternity / Obstetric',period:'10 months from enrolment' },
                    { service:'Chronic disease drugs',period:'2–3 months from enrolment' },
                    { service:'Dental (non-emergency)',period:'14–90 days (plan-dependent)' },
                    { service:'Optical (non-emergency)',period:'14–30 days' },
                    { service:'Pre-existing conditions', period:'3–12 months or as specified in policy' },
                ].map(row => (
                    <div key={row.service} style={waitingPeriodRowStyle}>
                        <span style={waitingPeriodServiceStyle}>{row.service}</span>
                        <span style={{
                            ...waitingPeriodValueStyle,
                            color: row.period.startsWith('None') ? '#137333' : '#b45309'
                        }}>
                            {row.period}
                        </span>
                    </div>
                ))}
            </div>

            {/* Key exclusions */}
            <div style={exclusionsCardStyle}>
                <div style={exclusionsHeaderStyle}>
                    <XCircle size={16} color="#ef4444" />
                    <div style={exclusionsTitleStyle}>Standard Exclusions</div>
                </div>
                <div style={exclusionsGridStyle}>
                    {[
                        'Cosmetic surgery', 
                        'IVF & fertility treatment', 
                        'Self-inflicted injuries', 
                        'War/civil unrest injuries', 
                        'Experimental treatment', 
                        'HIV HAART (plan-specific)', 
                        'Overseas treatment', 
                        'Non-NHIA accredited providers'
                    ].map(e => (
                        <div key={e} style={exclusionItemStyle}>
                            <XCircle size={12} color="#ef4444" />
                            <span>{e}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
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

const loadingStyle = {
    textAlign: 'center',
    padding: 60,
    color: '#a0aec0',
};

const planBannerStyle = {
    background: 'linear-gradient(135deg, #0f4c81, #1565c0)',
    borderRadius: 14,
    padding: '20px 24px',
    marginBottom: 22,
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
};

const planLabelStyle = {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 3,
    textTransform: 'uppercase',
};

const planNameStyle = {
    fontSize: 20,
    fontWeight: 700,
};

const planStatsStyle = {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
};

const planStatStyle = {
    textAlign: 'center',
};

const planStatLabelStyle = {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 2,
};

const planStatValueStyle = {
    fontSize: 16,
    fontWeight: 700,
};

const coverageCardStyle = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
    overflow: 'hidden',
    marginBottom: 20,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
};

const coverageHeaderStyle = {
    padding: '14px 18px',
    background: '#f7fafc',
    borderBottom: '1px solid #e8ecf0',
    fontSize: 13,
    fontWeight: 600,
    color: '#2d3748',
};

const borderBottomStyle = {
    borderBottom: '1px solid #f0f4f8',
};

const coverageItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 18px',
    cursor: 'pointer',
};

const iconStyle = {
    fontSize: 20,
};

const itemLabelStyle = {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: '#2d3748',
};

const itemNoteStyle = {
    padding: '0 18px 14px 52px',
    fontSize: 13,
    color: '#718096',
    background: '#fafbfc',
};

const waitingPeriodsCardStyle = {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e8ecf0',
    padding: '18px',
    marginBottom: 20,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
};

const waitingPeriodsHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
};

const waitingPeriodsTitleStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d3748',
};

const waitingPeriodRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f4f8',
    fontSize: 13,
};

const waitingPeriodServiceStyle = {
    color: '#4a5568',
};

const waitingPeriodValueStyle = {
    fontWeight: 500,
};

const exclusionsCardStyle = {
    background: '#fff5f5',
    borderRadius: 14,
    border: '1px solid #fca5a5',
    padding: '18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const exclusionsHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
};

const exclusionsTitleStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#7b0000',
};

const exclusionsGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px 20px',
};

const exclusionItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#9b1c1c',
};