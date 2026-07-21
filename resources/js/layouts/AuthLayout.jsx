import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

const HERO = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwaGVhbHRoJTIwdGVsZW1lZGljaW5lfGVufDB8fHx8MTc4MzA0MDcxNXww&ixlib=rb-4.1.0&q=85';

export default function AuthLayout() {
    const navigate = useNavigate();

    return (
        <div
            className="d-flex align-items-center justify-content-center"
            style={{ 
                minHeight: '100vh',
                padding: '2rem 1rem',
                position: 'relative',
                background: `
                    linear-gradient(135deg, rgba(30, 58, 95, 0.85) 0%, rgba(45, 106, 159, 0.85) 100%),
                    url(${HERO}) center center / cover no-repeat
                `,
            }}
        >
            {/* Optional scrim */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
            }} />

            <div style={{ 
                width: '100%', 
                maxWidth: '500px',
                margin: 'auto',
                position: 'relative',
                zIndex: 2
            }}>
                {/* Brand */}
                <div className="text-center mb-3 mb-md-4 mb-lg-5">
                    <div
                        className="d-inline-flex align-items-center justify-content-center rounded-3 mb-2 mb-md-3"
                        style={{ 
                            width: 60, 
                            height: 60, 
                            background: 'rgba(255,255,255,0.15)'
                        }}
                    >
                        <img 
                            src="/images/g8-nexum-logo.png"
                            alt="G8 Nexum"
                            width="40"
                            height="40"
                            className="rounded-2 flex-shrink-0"
                            style={{ background: "#2d6a9f" }}
                        />
                    </div>
                    <h4 className="text-white fw-bold mb-1">G8 Nexum - HMO ERP</h4>
                    <p className="text-white-50 small">Health Management Operations Platform</p>
                </div>

                {/* 🆕 TEST NAVIGATION - Remove after testing */}
                <div className="text-center mb-3" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/login" className="btn btn-sm btn-outline-light">Login</Link>
                    <Link to="/join" className="btn btn-sm btn-outline-light">Calculator</Link>
                    <Link to="/join/signup" className="btn btn-sm btn-outline-light">Signup</Link>
                    <Link to="/privacy-policy" className="btn btn-sm btn-outline-light">Privacy</Link>
                    <Link to="/support" className="btn btn-sm btn-outline-light">Support</Link>
                    <Link to="/terms" className="btn btn-sm btn-outline-light">Terms</Link>
                </div>

                {/* Card */}
                <div className="card border-0 shadow-lg" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                    <div className="card-body p-3 p-sm-4 p-md-5">
                        <Outlet />
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white-50 small mt-3 mt-md-4">
                    © {new Date().getFullYear()} G8 NEXUM - HMO ERP System. All rights reserved.
                </p>
            </div>
        </div>
    );
}