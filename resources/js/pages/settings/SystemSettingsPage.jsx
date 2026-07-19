/**
 * FILE LOCATION: resources/js/pages/settings/SystemSettingsPage.jsx
 *
 * Super-admin settings management panel.
 * Tabs: HMO Info | Financial & Limits | SLA Targets | Pre-Auth TAT | Fraud Detection | Notifications | Operational
 *
 * Route: /settings/system  (permission: settings.system)
 * Add to AppRouter.jsx inside the <Route path="settings"> block:
 *   import SystemSettingsPage from '../pages/settings/SystemSettingsPage';
 *   <Route path="system" element={
 *       <PermissionRoute permission="settings.system">
 *           <SystemSettingsPage />
 *       </PermissionRoute>
 *   } />
 *
 * Add to Sidebar.jsx settingsItems:
 *   { label:'System Settings', icon: Settings2, path:'/settings/system', permission:'settings.system' }
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Building2, Banknote, Clock, ShieldCheck, AlertTriangle,
    Bell, Settings2, Save, RotateCcw, Info, CheckCircle,
    ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

// ── API helpers ────────────────────────────────────────────────────────────────
// const fetchSettings = () =>
//     axios.get('/api/settings/system').then(r => r.data);

// const saveSettings = (payload) =>
//     axios.put('/api/settings/system', payload).then(r => r.data);

// const resetSetting = (key) =>
//     axios.post(`/api/settings/system/reset/${key}`).then(r => r.data);

// ── API helpers ────────────────────────────────────────────────────────────────
const fetchSettings = () =>
    apiClient.get('/settings/system').then(r => r.data);

const saveSettings = (payload) =>
    apiClient.put('/settings/system', payload).then(r => r.data);

const resetSetting = (key) =>
    apiClient.post(`/settings/system/reset/${key}`).then(r => r.data);

// ── Group metadata (matches backend) ──────────────────────────────────────────
const GROUP_META = {
    hmo_info:      { label: 'HMO Information',         Icon: Building2,     color: '#0F4C81' },
    financial:     { label: 'Financial & Limits',       Icon: Banknote,      color: '#047857' },
    sla:           { label: 'SLA Targets',              Icon: Clock,         color: '#0369A1' },
    pre_auth:      { label: 'Pre-Auth TAT',             Icon: ShieldCheck,   color: '#7C3AED' },
    fraud:         { label: 'Fraud Detection',          Icon: AlertTriangle, color: '#B45309' },
    notifications: { label: 'Notifications',            Icon: Bell,          color: '#0891B2' },
    operational:   { label: 'Operational',              Icon: Settings2,     color: '#64748B' },
};

const GROUP_ORDER = ['hmo_info', 'financial', 'sla', 'pre_auth', 'fraud', 'notifications', 'operational'];

// ── Currency format helper (doesn't depend on the context since super-admin page) ─
function fmtCurrency(val) {
    if (!val) return '';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN',
        maximumFractionDigits: 0 }).format(val);
}

// ── Single setting input ───────────────────────────────────────────────────────
function SettingInput({ setting, value, onChange, onReset, saving }) {
    const isCurrency = setting.unit === 'currency';
    const rules = setting.validation_rules || {};

    function handleChange(e) {
        let v = e.target.value;
        onChange(setting.key, v);
    }

    const inputStyle = {
        width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
        borderRadius: 6, fontSize: 14, color: '#1E293B',
        background: setting.is_readonly ? '#F8FAFC' : '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {setting.label}
                    {setting.unit && setting.unit !== 'currency' && (
                        <span style={{ fontWeight: 400, color: '#6B7280', marginLeft: 4 }}>
                            ({setting.unit})
                        </span>
                    )}
                </label>
                <button
                    onClick={() => onReset(setting.key)}
                    disabled={saving}
                    title="Reset to default"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9CA3AF', padding: 2, display: 'flex', alignItems: 'center',
                        fontSize: 11, gap: 3,
                    }}
                >
                    <RotateCcw size={12} /> reset
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {setting.type === 'boolean' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={e => onChange(setting.key, e.target.checked)}
                            disabled={setting.is_readonly}
                            style={{ width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13, color: '#374151' }}>{value ? 'Enabled' : 'Disabled'}</span>
                    </label>
                ) : (
                    <>
                        {isCurrency && (
                            <span style={{ fontSize: 14, color: '#6B7280', flexShrink: 0 }}>
                                {window.__HMO_SETTINGS__?.currency_symbol || '₦'}
                            </span>
                        )}
                        <input
                            type={setting.type === 'integer' || setting.type === 'decimal' ? 'number' : 'text'}
                            step={setting.type === 'decimal' ? '0.01' : '1'}
                            min={rules.min}
                            max={rules.max}
                            value={value ?? ''}
                            onChange={handleChange}
                            disabled={setting.is_readonly}
                            style={inputStyle}
                            placeholder={`Default: ${setting.default_value}`}
                        />
                    </>
                )}
            </div>

            {setting.description && (
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                    {setting.description}
                </p>
            )}

            {rules.min !== undefined && rules.max !== undefined && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                    Range: {isCurrency ? fmtCurrency(rules.min) : rules.min} – {isCurrency ? fmtCurrency(rules.max) : rules.max}
                    {setting.unit && setting.unit !== 'currency' ? ` ${setting.unit}` : ''}
                </p>
            )}
        </div>
    );
}

// ── Group panel ────────────────────────────────────────────────────────────────
function GroupPanel({ groupKey, settings, values, onChange, onReset, onSave, saving, dirty }) {
    const [collapsed, setCollapsed] = useState(false);
    const meta = GROUP_META[groupKey] || { label: groupKey, Icon: Settings2, color: '#64748B' };
    const { Icon } = meta;
    const groupDirty = settings.some(s => dirty.has(s.key));

    return (
        <div style={{
            border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden',
            marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
            {/* Header */}
            <div
                onClick={() => setCollapsed(c => !c)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 20px', cursor: 'pointer',
                    background: collapsed ? '#F9FAFB' : '#FFFFFF',
                    borderBottom: collapsed ? 'none' : '1px solid #E5E7EB',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: meta.color + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon size={18} color={meta.color} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>
                            {meta.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                            {settings.length} setting{settings.length !== 1 ? 's' : ''}
                            {groupDirty && (
                                <span style={{ marginLeft: 8, color: '#B45309', fontWeight: 600 }}>
                                    - unsaved changes
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {groupDirty && !collapsed && (
                        <button
                            onClick={e => { e.stopPropagation(); onSave(groupKey); }}
                            disabled={saving}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 6, border: 'none',
                                background: meta.color, color: '#FFFFFF',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            Save {meta.label}
                        </button>
                    )}
                    {collapsed ? <ChevronDown size={18} color="#9CA3AF" /> : <ChevronUp size={18} color="#9CA3AF" />}
                </div>
            </div>

            {/* Settings grid */}
            {!collapsed && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: groupKey === 'hmo_info' ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: 24, padding: 24,
                }}>
                    {settings.map(s => (
                        <SettingInput
                            key={s.key}
                            setting={s}
                            value={values[s.key] ?? s.value}
                            onChange={onChange}
                            onReset={onReset}
                            saving={saving}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SystemSettingsPage() {
    const qc = useQueryClient();
    const [localValues, setLocalValues] = useState({});
    const [dirty, setDirty] = useState(new Set());
    const [toast, setToast] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['system-settings'],
        queryFn: fetchSettings,
        staleTime: 5 * 60 * 1000,
    });

    console.log('API Response:', data);
    // Initialise local values when data loads
    useEffect(() => {
        if (!data) return;
        const initial = {};
        Object.values(data.groups).flat().forEach(s => {
            initial[s.key] = s.value;
        });
        setLocalValues(initial);
    }, [data]);

    const showToast = useCallback((msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    
    const saveMutation = useMutation({
        mutationFn: saveSettings,
        onSuccess: (_, payload) => {
            qc.invalidateQueries({ queryKey: ['system-settings'] });
            setDirty(prev => {
                const next = new Set(prev);
                Object.keys(payload).forEach(k => next.delete(k));
                return next;
            });
            // Refresh the public settings cache
            // axios.get('/api/settings/system/public').then(({ data: pub }) => {
            //     window.__HMO_SETTINGS__ = {
            //         currency_code:   pub.currency_code,
            //         currency_symbol: pub.currency_symbol,
            //         locale:          pub.locale,
            //     };
            // });
            apiClient.get('/settings/system/public').then(({ data: pub }) => {
                window.__HMO_SETTINGS__ = {
                    currency_code:   pub.currency_code,
                    currency_symbol: pub.currency_symbol,
                    locale:          pub.locale,
                };
            });
            showToast('Settings saved successfully.');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'Failed to save settings.';
            showToast(msg, 'error');
        },
    });

    const resetMutation = useMutation({
        mutationFn: resetSetting,
        onSuccess: (data, key) => {
            setLocalValues(prev => ({ ...prev, [key]: data.default_value }));
            setDirty(prev => { const n = new Set(prev); n.delete(key); return n; });
            qc.invalidateQueries({ queryKey: ['system-settings'] });
            showToast(`Reset to default: ${data.default_value}`);
        },
        onError: () => showToast('Reset failed.', 'error'),
    });

    function handleChange(key, value) {
        setLocalValues(prev => ({ ...prev, [key]: value }));
        setDirty(prev => new Set(prev).add(key));
    }

    function handleSaveGroup(groupKey) {
        const groupSettings = data.groups[groupKey] || [];
        const payload = {};
        groupSettings.forEach(s => {
            if (dirty.has(s.key)) {
                payload[s.key] = localValues[s.key];
            }
        });
        if (Object.keys(payload).length === 0) return;
        saveMutation.mutate(payload);
    }

    function handleSaveAll() {
        const payload = {};
        dirty.forEach(key => { payload[key] = localValues[key]; });
        if (Object.keys(payload).length === 0) return;
        saveMutation.mutate(payload);
    }

    const saving = saveMutation.isPending || resetMutation.isPending;

    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <Loader2 size={32} color="#0F4C81" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
    );

    if (error) return (
        <div style={{ padding: 32, color: '#DC2626', textAlign: 'center' }}>
            Failed to load settings. Make sure you have super-admin access.
        </div>
    );

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', fontFamily: 'Arial, sans-serif' }}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${toast.type === 'error' ? '#FCA5A5' : '#86EFAC'}`,
                    borderRadius: 8, padding: '12px 20px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 400,
                }}>
                    <CheckCircle size={16} color={toast.type === 'error' ? '#DC2626' : '#16A34A'} />
                    <span style={{ fontSize: 14, color: '#1E293B' }}>{toast.msg}</span>
                </div>
            )}

            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0F4C81' }}>
                        System Settings
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
                        Configure HMO information, financial limits, SLA targets, and fraud detection thresholds.
                        Changes take effect immediately - the system cache is cleared on save.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {dirty.size > 0 && (
                        <div style={{ fontSize: 13, color: '#B45309', fontWeight: 600 }}>
                            {dirty.size} unsaved change{dirty.size !== 1 ? 's' : ''}
                        </div>
                    )}
                    <button
                        onClick={handleSaveAll}
                        disabled={dirty.size === 0 || saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 20px', borderRadius: 8, border: 'none',
                            background: dirty.size > 0 ? '#0F4C81' : '#E5E7EB',
                            color: dirty.size > 0 ? '#FFFFFF' : '#9CA3AF',
                            fontSize: 14, fontWeight: 700,
                            cursor: dirty.size > 0 ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {saving ? <Loader2 size={16} /> : <Save size={16} />}
                        Save All Changes
                    </button>
                </div>
            </div>

            {/* Notice */}
            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                borderRadius: 8, padding: '12px 16px', marginBottom: 24,
            }}>
                <Info size={16} color="#1D6DB5" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                    All changes are logged in the audit trail with your name and timestamp.
                    Currency and HMO name changes affect printed documents, reports, and the member portal immediately.
                    SLA and fraud threshold changes apply to new claims from the moment of saving - existing claims are not re-evaluated.
                </p>
            </div>

            {/* Group panels */}
            {GROUP_ORDER.map(groupKey => {
                const settings = data.groups[groupKey];
                if (!settings?.length) return null;
                return (
                    <GroupPanel
                        key={groupKey}
                        groupKey={groupKey}
                        settings={settings}
                        values={localValues}
                        onChange={handleChange}
                        onReset={(key) => resetMutation.mutate(key)}
                        onSave={handleSaveGroup}
                        saving={saving}
                        dirty={dirty}
                    />
                );
            })}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}