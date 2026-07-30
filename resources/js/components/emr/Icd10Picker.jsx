/**
 * NEW FILE — resources/js/components/emr/Icd10Picker.jsx
 *
 * PHASE 3 — Mini EMR.
 * Reusable diagnosis picker. Used by ProviderConsultRoomPage.jsx
 * (telemedicine) and EmrEncounterPage.jsx (physical visits) - same
 * component, same behaviour, so a doctor doesn't relearn UI switching
 * between visit types.
 *
 * Controlled component: parent owns the `diagnoses` array and passes
 * `onChange`. Shape of each item:
 *   { icd10_code: string, description: string, type: 'primary'|'secondary', notes: string }
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchIcd10 } from '../../api/index';
import { Search, X, Star } from 'lucide-react';

export default function Icd10Picker({ diagnoses, onChange }) {
    const [term, setTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [showResults, setShowResults] = useState(false);
    const boxRef = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(term), 300);
        return () => clearTimeout(t);
    }, [term]);

    const { data, isFetching } = useQuery({
        queryKey: ['icd10-search', debouncedTerm],
        queryFn: () => searchIcd10(debouncedTerm),
        enabled: debouncedTerm.trim().length >= 2,
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const results = (data?.data ?? []).filter(
        r => !diagnoses.some(d => d.icd10_code === r.code)
    );

    const addDiagnosis = (code, description) => {
        const isFirst = diagnoses.length === 0;
        onChange([...diagnoses, {
            icd10_code: code,
            description,
            type: isFirst ? 'primary' : 'secondary', // first pick defaults to primary
            notes: '',
        }]);
        setTerm('');
        setShowResults(false);
    };

    const removeDiagnosis = (code) => {
        onChange(diagnoses.filter(d => d.icd10_code !== code));
    };

    const setPrimary = (code) => {
        onChange(diagnoses.map(d => ({ ...d, type: d.icd10_code === code ? 'primary' : 'secondary' })));
    };

    return (
        <div ref={boxRef} style={wrapStyle}>
            <div style={searchBoxStyle}>
                <Search size={14} color="#a0aec0" />
                <input
                    value={term}
                    onChange={e => { setTerm(e.target.value); setShowResults(true); }}
                    onFocus={() => setShowResults(true)}
                    placeholder="Search ICD-10, e.g. E11 or diabetes"
                    style={searchInputStyle}
                />
            </div>

            {showResults && debouncedTerm.trim().length >= 2 && (
                <div style={dropdownStyle}>
                    {isFetching ? (
                        <div style={dropdownEmptyStyle}>Searching…</div>
                    ) : !results.length ? (
                        <div style={dropdownEmptyStyle}>No matching codes</div>
                    ) : (
                        results.map(r => (
                            <button
                                key={r.code}
                                type="button"
                                onClick={() => addDiagnosis(r.code, r.description)}
                                style={dropdownItemStyle}
                            >
                                <span style={codeChipStyle}>{r.code}</span> {r.description}
                            </button>
                        ))
                    )}
                </div>
            )}

            {diagnoses.length > 0 && (
                <div style={selectedListStyle}>
                    {diagnoses.map(d => (
                        <div key={d.icd10_code} style={selectedRowStyle}>
                            <button
                                type="button"
                                onClick={() => setPrimary(d.icd10_code)}
                                title={d.type === 'primary' ? 'Primary diagnosis' : 'Set as primary'}
                                style={{ ...starButtonStyle, color: d.type === 'primary' ? '#e65100' : '#cbd5e0' }}
                            >
                                <Star size={14} fill={d.type === 'primary' ? '#e65100' : 'none'} />
                            </button>
                            <div style={{ flex: 1 }}>
                                <span style={codeChipStyle}>{d.icd10_code}</span> {d.description}
                                {d.type === 'primary' && <span style={primaryLabelStyle}>Primary</span>}
                            </div>
                            <button type="button" onClick={() => removeDiagnosis(d.icd10_code)} style={removeButtonStyle}>
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const wrapStyle = { position: 'relative' };
const searchBoxStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' };
const searchInputStyle = { flex: 1, border: 'none', outline: 'none', fontSize: 13 };
const dropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
const dropdownEmptyStyle = { padding: '10px 12px', fontSize: 12, color: '#a0aec0' };
const dropdownItemStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', fontSize: 12, color: '#4a5568', cursor: 'pointer' };
const codeChipStyle = { fontWeight: 700, color: '#0f4c81', marginRight: 4 };
const selectedListStyle = { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 };
const selectedRowStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#4a5568' };
const starButtonStyle = { border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex' };
const primaryLabelStyle = { marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#e65100', background: '#fff3e0', padding: '1px 6px', borderRadius: 4 };
const removeButtonStyle = { border: 'none', background: 'none', color: '#a0aec0', cursor: 'pointer', padding: 2, display: 'flex' };
