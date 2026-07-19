/**
 * FILE LOCATION: resources/js/pages/portals/corporate/CorpProfilePage.jsx
 * Corporate self-service: view/edit company profile and contact info.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Building2, Save, Phone, Mail, MapPin, Calendar, Shield } from 'lucide-react';
import { fetchCorpPortalProfile, updateCorpPortalProfile } from '../../../api/index';
import { formatDate } from '../../../utils/format';

export default function CorpProfilePage() {
    const { data, isLoading } = useQuery({ 
        queryKey: ['corp-portal-profile'], 
        queryFn: fetchCorpPortalProfile 
    });
    
    const [form, setForm] = useState({});
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (data?.data) {
            const d = data.data;
            setForm({ 
                contact_person: d.contact_person ?? '', 
                contact_email: d.contact_email ?? '', 
                contact_phone: d.contact_phone ?? '', 
                address: d.address ?? '' 
            });
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: () => updateCorpPortalProfile(form),
        onSuccess: () => { 
            toast.success('Profile updated.'); 
            setEditing(false); 
        },
        onError:   (e) => toast.error(e.response?.data?.message ?? 'Update failed.'),
    });

    const d = data?.data;

    if (isLoading) return <div style={{ textAlign:'center', padding:60, color:'#a0aec0' }}>Loading…</div>;

    return (
        <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 }}>Company Profile</h1>
                <p style={{ color: '#718096', fontSize: 14, margin: '4px 0 0' }}>Your organisation's health plan details</p>
            </div>

            {/* Company header card */}
            <div style={{ 
                background: 'linear-gradient(135deg, #0f4c81, #1565c0)', 
                borderRadius: 16, 
                padding: '24px 28px', 
                marginBottom: 20, 
                color: '#fff' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 12, 
                        background: 'rgba(255,255,255,0.2)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <Building2 size={28} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{d?.name}</div>
                        <div style={{ opacity: 0.75, fontSize: 14 }}>
                            {d?.rc_number ? `RC: ${d.rc_number}` : ''} · {d?.industry ?? 'Corporate'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Plan info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
                <InfoCard icon={Shield} color="#0f4c81" bg="#e8f0fe" label="Current Plan" value={d?.plan_name ?? 'N/A'} />
                <InfoCard icon={Calendar} color="#137333" bg="#e6f4ea" label="Policy Expiry" value={formatDate(d?.policy_expiry)} />
                <InfoCard icon={Calendar} color="#b45309" bg="#fff3e0" label="Policy Start" value={formatDate(d?.policy_start)} />
                <InfoCard icon={Building2} color="#5e35b1" bg="#f3e5f5" label="HMO Branch" value={d?.branch_name ?? '-'} />
            </div>

            {/* Editable contact details */}
            <div style={{ 
                background: '#fff', 
                borderRadius: 12, 
                border: '1px solid #e8ecf0', 
                padding: '22px 24px', 
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)' 
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: 18 
                }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#2d3748' }}>Contact Information</div>
                    {!editing ? (
                        <button 
                            onClick={() => setEditing(true)} 
                            style={{ 
                                padding:'7px 16px', 
                                background:'#e8f0fe', 
                                color:'#0f4c81', 
                                border:'none', 
                                borderRadius:8, 
                                cursor:'pointer', 
                                fontSize:13, 
                                fontWeight:500 
                            }}
                        >
                            Edit
                        </button>
                    ) : (
                        <div style={{ display:'flex', gap:8 }}>
                            <button 
                                onClick={() => setEditing(false)} 
                                style={{ 
                                    padding:'7px 14px', 
                                    background:'#fff', 
                                    color:'#4a5568', 
                                    border:'1px solid #e2e8f0', 
                                    borderRadius:8, 
                                    cursor:'pointer', 
                                    fontSize:13 
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => mutation.mutate()} 
                                disabled={mutation.isPending} 
                                style={{ 
                                    display:'flex', 
                                    alignItems:'center', 
                                    gap:6, 
                                    padding:'7px 16px', 
                                    background:'#0f4c81', 
                                    color:'#fff', 
                                    border:'none', 
                                    borderRadius:8, 
                                    cursor:'pointer', 
                                    fontSize:13 
                                }}
                            >
                                <Save size={14} /> {mutation.isPending ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={labelStyle}>
                            <Mail size={11} style={{ marginRight:4 }} />Contact Person
                        </label>
                        {editing ? (
                            <input 
                                value={form.contact_person} 
                                onChange={e => setForm(f=>({...f, contact_person: e.target.value}))} 
                                style={inputStyle} 
                            />
                        ) : (
                            <div style={valueStyle}>{d?.contact_person ?? '-'}</div>
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>
                            <Mail size={11} style={{ marginRight:4 }} />Contact Email
                        </label>
                        {editing ? (
                            <input 
                                type="email" 
                                value={form.contact_email} 
                                onChange={e => setForm(f=>({...f, contact_email: e.target.value}))} 
                                style={inputStyle} 
                            />
                        ) : (
                            <div style={valueStyle}>{d?.contact_email ?? '-'}</div>
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>
                            <Phone size={11} style={{ marginRight:4 }} />Contact Phone
                        </label>
                        {editing ? (
                            <input 
                                type="tel" 
                                value={form.contact_phone} 
                                onChange={e => setForm(f=>({...f, contact_phone: e.target.value}))} 
                                style={inputStyle} 
                            />
                        ) : (
                            <div style={valueStyle}>{d?.contact_phone ?? '-'}</div>
                        )}
                    </div>
                    <div>
                        <label style={labelStyle}>
                            <MapPin size={11} style={{ marginRight:4 }} />Office Address
                        </label>
                        {editing ? (
                            <input 
                                value={form.address} 
                                onChange={e => setForm(f=>({...f, address: e.target.value}))} 
                                style={inputStyle} 
                            />
                        ) : (
                            <div style={valueStyle}>{d?.address ?? '-'}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon: Icon, color, bg, label, value }) {
    return (
        <div style={{ 
            background:'#fff', 
            borderRadius:10, 
            padding:'14px 16px', 
            border:'1px solid #e8ecf0', 
            display:'flex', 
            alignItems:'center', 
            gap:12 
        }}>
            <div style={{ 
                width:36, 
                height:36, 
                borderRadius:8, 
                background:bg, 
                display:'flex', 
                alignItems:'center', 
                justifyContent:'center', 
                flexShrink:0 
            }}>
                <Icon size={18} color={color} />
            </div>
            <div>
                <div style={{ fontSize:11, color:'#718096', marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#2d3748' }}>{value}</div>
            </div>
        </div>
    );
}

// Style constants
const labelStyle = { 
    display:'flex', 
    alignItems:'center', 
    fontSize:11, 
    fontWeight:600, 
    color:'#718096', 
    textTransform:'uppercase', 
    letterSpacing:'0.5px', 
    marginBottom:6 
};

const valueStyle = { 
    fontSize:14, 
    color:'#2d3748', 
    padding:'8px 0' 
};

const inputStyle = { 
    width:'100%', 
    padding:'9px 12px', 
    border:'1px solid #e2e8f0', 
    borderRadius:8, 
    fontSize:13, 
    outline:'none', 
    background:'#f7fafc', 
    boxSizing:'border-box' 
};