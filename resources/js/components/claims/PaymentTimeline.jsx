/**
 * NEW FILE — resources/js/components/claims/PaymentTimeline.jsx
 * Payment timeline showing events only (stats are shown separately)
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchClaimPaymentTimeline } from '../../api/index';
import { formatCurrency } from '../../utils/format';
import { CheckCircle, Clock, XCircle, CreditCard, FileText } from 'lucide-react';

const ICONS = {
    status_change: FileText,
    payment_batched: Clock,
    payment_completed: CheckCircle,
};

function iconFor(type) {
    if (type.startsWith('gateway_confirmed_success')) return CheckCircle;
    if (type.startsWith('gateway_confirmed_failed') || type.startsWith('gateway_failed')) return XCircle;
    if (type.startsWith('gateway_')) return CreditCard;
    return ICONS[type] || Clock;
}

function colorFor(type) {
    if (type.includes('failed')) return '#c5221f';
    if (type.includes('completed') || type.includes('success')) return '#137333';
    return '#0f4c81';
}

export default function PaymentTimeline({ claimId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['claim-payment-timeline', claimId],
        queryFn: () => fetchClaimPaymentTimeline(claimId),
    });

    const d = data?.data;

    if (isLoading) return <div style={loadingStyle}>Loading timeline…</div>;
    if (!d || !d.timeline || d.timeline.length === 0) {
        return <div style={emptyStyle}>No payment activity yet.</div>;
    }

    return (
        <div style={timelineStyle}>
            {d.timeline.map((event, i) => {
                const Icon = iconFor(event.type);
                const color = colorFor(event.type);
                return (
                    <div key={i} style={eventRowStyle}>
                        <div style={{ ...iconWrapStyle, background: `${color}15` }}>
                            <Icon size={14} color={color} />
                        </div>
                        <div style={eventContentStyle}>
                            <div style={eventTitleStyle}>
                                {event.title}
                                {event.amount && (
                                    <span style={{ marginLeft: 8, fontWeight: 600, color: '#0f4c81' }}>
                                        {formatCurrency(event.amount)}
                                    </span>
                                )}
                            </div>
                            {event.detail && <div style={eventDetailStyle}>{event.detail}</div>}
                            <div style={eventMetaStyle}>
                                {event.timestamp}{event.by && ` · ${event.by}`}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const loadingStyle = { padding: 20, color: '#a0aec0', fontSize: 13 };
const emptyStyle = { padding: 20, color: '#a0aec0', fontSize: 13, textAlign: 'center' };
const timelineStyle = { display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '2px solid #e8ecf0', marginLeft: 14, paddingLeft: 20 };
const eventRowStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', marginLeft: -34, marginBottom: 14 };
const iconWrapStyle = { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const eventContentStyle = { paddingTop: 3 };
const eventTitleStyle = { fontSize: 13, fontWeight: 600, color: '#2d3748' };
const eventDetailStyle = { fontSize: 12, color: '#718096', marginTop: 2 };
const eventMetaStyle = { fontSize: 11, color: '#a0aec0', marginTop: 3 };