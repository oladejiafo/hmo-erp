/**
 * NEW FILE — resources/js/pages/portals/enrollee/TelemedicineRoomPage.jsx
 *
 * PHASE 1 — Telemedicine.
 * REQUIRES A NEW DEPENDENCY: @daily-co/daily-js. Not in your package.json —
 * checked. Run: npm install @daily-co/daily-js
 *
 * Deliberately rendered OUTSIDE EnrolleeLayout (see AppRouter.jsx wiring
 * notes) — a video call needs the full viewport, not the portal sidebar.
 * Not tested against a live Daily.co room; the createFrame/join contract
 * matches their published SDK docs exactly, but run one real test call
 * before trusting this for an actual consultation.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DailyIframe from '@daily-co/daily-js';
import { PhoneOff, AlertTriangle } from 'lucide-react';

export default function TelemedicineRoomPage() {
    const { encounterId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef(null);
    const callFrameRef = useRef(null);
    const [error, setError] = useState(null);

    // The join URL is passed via router state from MyTelemedicinePage's
    // join mutation - it's single-use, so a hard refresh of THIS page
    // won't work. That's intentional: re-fetch a fresh one from the list.
    const joinUrl = location.state?.joinUrl;

    useEffect(() => {
        if (!joinUrl) {
            setError('Your session link expired. Go back and press Join again.');
            return;
        }

        const callFrame = DailyIframe.createFrame(containerRef.current, {
            showLeaveButton: false, // we render our own leave control below
            iframeStyle: {
                width: '100%',
                height: '100%',
                border: '0',
            },
        });
        callFrameRef.current = callFrame;

        callFrame.join({ url: joinUrl }).catch(() => {
            setError('Could not connect to the video session. Please try again.');
        });

        callFrame.on('left-meeting', () => {
            navigate('/enrollee/telemedicine');
        });

        return () => {
            callFrame.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinUrl]);

    const handleLeave = () => {
        callFrameRef.current?.leave();
        navigate('/enrollee/telemedicine');
    };

    if (error) {
        return (
            <div style={fullScreenStyle}>
                <div style={errorBoxStyle}>
                    <AlertTriangle size={32} color="#c5221f" />
                    <p style={errorTextStyle}>{error}</p>
                    <button onClick={() => navigate('/enrollee/telemedicine')} style={backButtonStyle}>
                        Back to Telemedicine
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={fullScreenStyle}>
            <div ref={containerRef} style={frameContainerStyle} />
            <button onClick={handleLeave} style={leaveButtonStyle}>
                <PhoneOff size={16} /> Leave consultation
            </button>
        </div>
    );
}

const fullScreenStyle = { position: 'fixed', inset: 0, background: '#1a202c', zIndex: 1000, display: 'flex', flexDirection: 'column' };
const frameContainerStyle = { flex: 1 };
const leaveButtonStyle = { position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 24, border: 'none', background: '#c5221f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' };
const errorBoxStyle = { margin: 'auto', textAlign: 'center', padding: 40, background: '#fff', borderRadius: 14, maxWidth: 360 };
const errorTextStyle = { color: '#4a5568', fontSize: 14, margin: '16px 0' };
const backButtonStyle = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0f4c81', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
