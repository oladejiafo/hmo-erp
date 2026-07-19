/**
 * NEW FILE — resources/js/pages/portal/corporate/CorpBroadcastPage.jsx
 */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendCorpBroadcast } from '../../../api/index';
import { Megaphone, Send } from 'lucide-react';

export default function CorpBroadcastPage() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [lastResult, setLastResult] = useState(null);

    const sendMutation = useMutation({
        mutationFn: () => sendCorpBroadcast({ title, body }),
        onSuccess: (res) => {
            setLastResult(res.message);
            setTitle('');
            setBody('');
        },
    });

    const canSend = title.trim() && body.trim().length >= 5;

    return (
        <div>
            <div style={headerStyle}>
                <Megaphone size={20} color="#0f4c81" />
                <div>
                    <h1 style={titleStyle}>Announcements</h1>
                    <p style={subtitleStyle}>Send a message to every active employee on your plan</p>
                </div>
            </div>

            <div style={formCardStyle}>
                <label style={labelStyle}>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Annual health checkup week" style={inputStyle} />

                <label style={labelStyle}>Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />

                <button onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending} style={sendButtonStyle}>
                    <Send size={14} /> {sendMutation.isPending ? 'Sending…' : 'Send announcement'}
                </button>

                {lastResult && <div style={successStyle}>{lastResult}</div>}
            </div>
        </div>
    );
}

const headerStyle = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const formCardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, maxWidth: 520 };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginTop: 10, marginBottom: 4 };
const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#f7fafc', width: '100%', boxSizing: 'border-box' };
const sendButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const successStyle = { marginTop: 12, fontSize: 12, color: '#137333', fontWeight: 600 };
