/**
 * FILE LOCATION: resources/js/pages/portal/enrollee/FindHCPPage.jsx
 * Member self-service: search for accredited healthcare providers.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEnrolleePortalHCPs } from '../../../api/index';
import { Search, MapPin, Phone, Star, Building2 } from 'lucide-react';

export default function FindHCPPage() {
    const [search, setSearch] = useState('');
    const [tier, setTier]     = useState('');
    const [type, setType]     = useState('');

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
                    </div>
                ))}
            </div>
        </div>
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