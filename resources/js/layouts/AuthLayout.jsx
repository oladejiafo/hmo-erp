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
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M16 2L28 8V16C28 22.6 22.8 28.6 16 30C9.2 28.6 4 22.6 4 16V8L16 2Z"
                                  fill="white" fillOpacity="0.9"/>
                            <path d="M13 16H19M16 13V19" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <h4 className="text-white fw-bold mb-1">HMO ERP</h4>
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