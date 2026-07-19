/**
 * NEW FILE — resources/js/components/portals/TierUpgradeWidget.jsx
 * Standalone component, same reasoning as Phase 2b's
 * EnrolleeCheckInWidget.jsx — haven't seen CorpEnrolleesPage.jsx, so this
 * is ready to drop in rather than a guessed rewrite of a file not yet seen.
 *
 * Usage: <TierUpgradeWidget enrolleeId={e.id} currentPlanName={e.plan_name} />
 * Most natural spot: a small "Change plan" button/icon next to each
 * enrollee row in the roster table.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCorpAvailablePlans, upgradeEnrolleeTier } from '../../api/index';
import { Repeat, X } from 'lucide-react';

export default function TierUpgradeWidget({ enrolleeId, currentPlanName }) {
    const [open, setOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ['corp-available-plans'],
        queryFn: fetchCorpAvailablePlans,
        enabled: open,
    });

    const upgradeMutation = useMutation({
        mutationFn: () => upgradeEnrolleeTier(enrolleeId, selectedPlanId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['corp-enrollees'] });
            setOpen(false);
        },
    });

    const plans = data?.data ?? [];

    if (!open) {
        return (
            <button onClick={() => setOpen(true)} style={triggerStyle}>
                <Repeat size={12} /> Change plan
            </button>
        );
    }

    return (
        <div style={popoverStyle}>
            <div style={popoverHeaderStyle}>
                <span>Move from {currentPlanName}</span>
                <button onClick={() => setOpen(false)} style={closeStyle}><X size={14} /></button>
            </div>
            <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} style={selectStyle}>
                <option value="">Select new plan…</option>
                {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.plan_name} ({p.tier})</option>
                ))}
            </select>
            <button
                onClick={() => upgradeMutation.mutate()}
                disabled={!selectedPlanId || upgradeMutation.isPending}
                style={confirmStyle}
            >
                {upgradeMutation.isPending ? 'Moving…' : 'Confirm move'}
            </button>
        </div>
    );
}

const triggerStyle = { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const popoverStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, minWidth: 220, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
const popoverHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 8 };
const closeStyle = { background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0' };
const selectStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' };
const confirmStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: 'none', background: '#137333', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
