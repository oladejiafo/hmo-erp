import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div
            className="d-flex align-items-center justify-content-center vh-100"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)' }}
        >
            <div style={{ width: '100%', maxWidth: '50%' }}>
                {/* Brand */}
                <div className="text-center mb-4">
                    <div
                        className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                        style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.15)' }}
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

                {/* Card */}
                <div className="card border-0 shadow-lg">
                    <div className="card-body p-4">
                        <Outlet />
                    </div>
                </div>

                <p className="text-center text-white-50 small mt-4">
                    © {new Date().getFullYear()} HMO ERP System. All rights reserved.
                </p>
            </div>
        </div>
    );
}