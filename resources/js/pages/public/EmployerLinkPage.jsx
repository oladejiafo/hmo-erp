/**
 * NEW FILE — resources/js/pages/public/EmployerLinkPage.jsx
 * Public, no auth. "My company already got me insurance" flow.
 */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { searchEmployers, verifyEmployeeIdentity, claimEmployeeAccount } from '../../api/index';
import { Search, Building2, CheckCircle } from 'lucide-react';

export default function EmployerLinkPage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedCorp, setSelectedCorp] = useState(null);
    const [identifier, setIdentifier] = useState('');
    const [dob, setDob] = useState('');
    const [matchData, setMatchData] = useState(null);
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [done, setDone] = useState(false);

    const searchMutation = useMutation({
        mutationFn: () => searchEmployers(query),
        onSuccess: (res) => setResults(res.data),
    });

    const verifyMutation = useMutation({
        mutationFn: () => verifyEmployeeIdentity({ corporate_id: selectedCorp.id, identifier, date_of_birth: dob }),
        onSuccess: (res) => setMatchData(res.data),
    });

    const claimMutation = useMutation({
        mutationFn: () => claimEmployeeAccount({
            enrollee_token: matchData.enrollee_token,
            password, password_confirmation: passwordConfirm,
        }),
        onSuccess: () => setDone(true),
    });

    if (done) {
        return (
            <div style={pageStyle}>
                <CheckCircle size={48} color="#137333" />
                <h2 style={titleStyle}>You're all set</h2>
                <p style={textStyle}>Your account is linked. You can log in now.</p>
                <button onClick={() => navigate('/login')} style={ctaStyle}>Go to login</button>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            <Building2 size={32} color="#0f4c81" />
            <h1 style={titleStyle}>Find your employer's plan</h1>
            <p style={subtitleStyle}>If your company already covers you, link your account here.</p>

            {!selectedCorp && (
                <>
                    <div style={searchRowStyle}>
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Company name" style={inputStyle} />
                        <button onClick={() => searchMutation.mutate()} disabled={query.length < 2} style={searchButtonStyle}><Search size={14} /></button>
                    </div>
                    <div style={resultsStyle}>
                        {results.map(c => (
                            <button key={c.id} onClick={() => setSelectedCorp(c)} style={resultRowStyle}>
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: '#718096' }}>{c.industry} · {c.city}</div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {selectedCorp && !matchData && (
                <div style={formCardStyle}>
                    <div style={selectedCorpStyle}>{selectedCorp.name} <button onClick={() => setSelectedCorp(null)} style={changeButtonStyle}>Change</button></div>
                    <label style={labelStyle}>Work email or Staff ID</label>
                    <input value={identifier} onChange={e => setIdentifier(e.target.value)} style={inputStyle} />
                    <label style={labelStyle}>Date of birth</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
                    <button onClick={() => verifyMutation.mutate()} disabled={!identifier || !dob || verifyMutation.isPending} style={ctaStyle}>
                        {verifyMutation.isPending ? 'Checking…' : 'Verify'}
                    </button>
                    {verifyMutation.isError && (
                        <div style={errorStyle}>{verifyMutation.error?.response?.data?.message || 'Could not verify.'}</div>
                    )}
                </div>
            )}

            {matchData && (
                <div style={formCardStyle}>
                    <div style={matchStyle}><CheckCircle size={16} color="#137333" /> Found {matchData.first_name} {matchData.last_name} — {matchData.plan_name}</div>
                    <label style={labelStyle}>Create a password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
                    <label style={labelStyle}>Confirm password</label>
                    <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} style={inputStyle} />
                    <button onClick={() => claimMutation.mutate()} disabled={password.length < 8 || password !== passwordConfirm || claimMutation.isPending} style={ctaStyle}>
                        {claimMutation.isPending ? 'Creating account…' : 'Activate my account'}
                    </button>
                    {claimMutation.isError && (
                        <div style={errorStyle}>{claimMutation.error?.response?.data?.message || 'Something went wrong.'}</div>
                    )}
                </div>
            )}
        </div>
    );
}

const pageStyle = { maxWidth: 420, margin: '0 auto', padding: '40px 20px', textAlign: 'center' };
const titleStyle = { fontSize: 22, fontWeight: 800, color: '#1a202c', margin: '10px 0 4px' };
const subtitleStyle = { fontSize: 13, color: '#718096', marginBottom: 24 };
const textStyle = { fontSize: 13, color: '#718096' };
const searchRowStyle = { display: 'flex', gap: 8, marginBottom: 14 };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#f7fafc', marginBottom: 10 };
const searchButtonStyle = { padding: '10px 14px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', cursor: 'pointer' };
const resultsStyle = { display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' };
const resultRowStyle = { padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', textAlign: 'left' };
const formCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, textAlign: 'left', marginTop: 10 };
const selectedCorpStyle = { display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 14, color: '#2d3748' };
const changeButtonStyle = { background: 'none', border: 'none', color: '#0f4c81', fontSize: 11, cursor: 'pointer' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4a5568', marginBottom: 4 };
const ctaStyle = { width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: '#137333', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 6 };
const errorStyle = { marginTop: 10, fontSize: 12, color: '#c5221f' };
const matchStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#137333', marginBottom: 14 };
