/**
 * FILE LOCATION: resources/js/layouts/portals/CorporateLayout.jsx
 *
 * Corporate Self-Service Portal shell.
 * Rendered for /corporate and /corporate/* routes.
 *
 * IMPORTANT: Access control (corporate_user only) is enforced upstream
 * in ProtectedRoute. This layout does NOT need to repeat that check.
 * Previous version used <Navigate> without importing it — that's been removed.
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, CreditCard,
    LogOut, Menu, X, Bell, User, Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
    { path: '/corporate',            label: 'Dashboard',         icon: LayoutDashboard, exact: true },
    { path: '/corporate/enrollees',  label: 'Staff & Enrollees', icon: Users },
    { path: '/corporate/claims',     label: 'Claims',            icon: FileText },
    { path: '/corporate/invoices',   label: 'Invoices',          icon: CreditCard },
    { path: '/corporate/profile',    label: 'Company Profile',   icon: Building2 },
];

export default function CorporateLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const firstName   = user?.name?.split(' ')[0] || 'User';
    const companyName = user?.corporate?.name || 'Your Company';

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

            {/* ── Top navigation ──────────────────────────────────────── */}
            <nav style={{
                background:    'linear-gradient(135deg, #0f4c81 0%, #1a6fad 100%)',
                boxShadow:     '0 2px 12px rgba(15,76,129,0.3)',
                position:      'sticky',
                top:           0,
                zIndex:        200,
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>

                        {/* Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                                    <path d="M16 2L28 8V16C28 22.6 22.8 28.6 16 30C9.2 28.6 4 22.6 4 16V8L16 2Z"
                                          fill="white" fillOpacity="0.9"/>
                                    <path d="M13 16H19M16 13V19" stroke="#0f4c81" strokeWidth="2.5" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                                    Corporate Portal
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                                    {companyName}
                                </div>
                            </div>
                        </div>

                        {/* Desktop nav */}
                        <div style={{ display: 'flex', gap: 4, flex: 1 }} className="d-none d-lg-flex">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    style={({ isActive }) => ({
                                        display:        'flex',
                                        alignItems:     'center',
                                        gap:            7,
                                        padding:        '6px 14px',
                                        borderRadius:   8,
                                        textDecoration: 'none',
                                        fontSize:       13,
                                        fontWeight:     500,
                                        color:          isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                                        background:     isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                                    })}
                                >
                                    <item.icon size={15} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>

                        {/* Right actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                            <button style={iconBtnStyle} aria-label="Notifications">
                                <Bell size={18} color="rgba(255,255,255,0.8)" />
                            </button>
                            <div style={{
                                display:    'flex',
                                alignItems: 'center',
                                gap:        8,
                                padding:    '6px 12px',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.12)',
                            }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <User size={14} color="#fff" />
                                </div>
                                <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                                    {firstName}
                                </span>
                            </div>
                            <button onClick={handleLogout} style={iconBtnStyle} title="Sign out">
                                <LogOut size={18} color="rgba(255,255,255,0.8)" />
                            </button>
                            <button
                                onClick={() => setMenuOpen(o => !o)}
                                style={iconBtnStyle}
                                className="d-lg-none"
                                aria-label="Toggle menu"
                            >
                                {menuOpen ? <X size={20} color="#fff" /> : <Menu size={20} color="#fff" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile nav */}
                    {menuOpen && (
                        <div
                            style={{ padding: '12px 0 16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}
                            className="d-lg-none"
                        >
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    onClick={() => setMenuOpen(false)}
                                    style={({ isActive }) => ({
                                        display:        'flex',
                                        alignItems:     'center',
                                        gap:            10,
                                        padding:        '10px 16px',
                                        textDecoration: 'none',
                                        color:          isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                                        background:     isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                                        borderRadius:   8,
                                        marginBottom:   2,
                                        fontSize:       14,
                                    })}
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Page content ────────────────────────────────────────── */}
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
                <Outlet />
            </main>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <footer style={{
                textAlign:    'center',
                padding:      '16px 24px',
                color:        '#94a3b8',
                fontSize:     12,
                borderTop:    '1px solid #e2e8f0',
                marginTop:    32,
            }}>
                Corporate Self-Service Portal · Powered by HMO ERP · {new Date().getFullYear()}
            </footer>
        </div>
    );
}

const iconBtnStyle = {
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    padding:     6,
    borderRadius: 6,
    display:     'flex',
    alignItems:  'center',
};