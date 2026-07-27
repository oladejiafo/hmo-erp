/**
 * FILE LOCATION: resources/js/layouts/portals/EnrolleeLayout.jsx
 *
 * Enrollee Self-Service Portal shell.
 * Rendered for /enrollee and /enrollee/* routes.
 *
 * IMPORTANT: Access control (enrollee_user only) is enforced upstream
 * in ProtectedRoute. This layout does NOT need to repeat that check.
 * Previous version used <Navigate> without importing it - that's been removed.
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate,useLocation } from 'react-router-dom';
import {
    LayoutDashboard, CreditCard, Activity, FileText,
    MapPin, MessageSquare, LogOut, Menu, X, Bell,
    Receipt, Calendar, ChevronDown, Video,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

// Primary — used constantly, stays directly on the bar
const primaryNavItems = [
    { path: '/enrollee',                 label: 'Home',          icon: LayoutDashboard, exact: true },
    { path: '/enrollee/id-card',         label: 'ID Card',       icon: CreditCard },
    { path: '/enrollee/find-hcp',        label: 'Hospitals',     icon: MapPin },
    { path: '/enrollee/appointments',    label: 'Appointments',  icon: Calendar },
    { path: '/enrollee/telemedicine',    label: 'Telemedicine',  icon: Video }, // PHASE 1
    { path: '/enrollee/reimbursements',  label: 'Reimburse',     icon: Receipt },

];

// Secondary — grouped under "More" dropdown
const moreNavItems = [
    { path: '/enrollee/claims',          label: 'Claims',        icon: FileText },
    { path: '/enrollee/benefits',       label: 'Benefits',      icon: Activity },
    { path: '/enrollee/complaints',     label: 'Complaints',    icon: MessageSquare },
];

const allNavItems = [...primaryNavItems, ...moreNavItems];

export default function EnrolleeLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const firstName = user?.name?.split(' ')[0] || 'Member';
    const initials  = user?.name
        ?.split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase() || '?';

    const isMoreActive = moreNavItems.some(item => location.pathname.startsWith(item.path));

    return (
        <div style={{ minHeight: '100vh', background: '#f7fafc' }}>

            {/* ── Top bar ─────────────────────────────────────────────── */}
            <nav style={{
                background:   '#fff',
                borderBottom: '1px solid #e8ecf0',
                boxShadow:    '0 1px 8px rgba(0,0,0,0.06)',
                position:     'sticky',
                top:          0,
                zIndex:       200,
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: 60, gap: 20 }}>

                        {/* Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 8,
                                background: 'linear-gradient(135deg, #0f4c81, #1a6fad)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <img 
                                    src="/images/g8-nexum-logo.png"
                                    alt="G8 Nexum"
                                    width="20"
                                    height="20"
                                    className="rounded-2 flex-shrink-0"
                                    style={{ background: "#2d6a9f" }}
                                />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#1a202c', lineHeight: 1.2 }}>
                                    Member Portal
                                </div>
                                <div style={{ color: '#718096', fontSize: 11 }}>
                                    Health Insurance
                                </div>
                            </div>
                        </div>

                        {/* Desktop nav */}
                        <div style={{ display: 'flex', gap: 2, flex: 1 }} className="d-none d-md-flex">
                            {primaryNavItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    style={({ isActive }) => ({
                                        display:        'flex',
                                        alignItems:     'center',
                                        gap:            6,
                                        padding:        '6px 12px',
                                        borderRadius:   8,
                                        textDecoration: 'none',
                                        fontSize:       13,
                                        fontWeight:     500,
                                        color:          isActive ? '#0f4c81' : '#4a5568',
                                        background:     isActive ? '#e8f0fe' : 'transparent',
                                    })}
                                >
                                    <item.icon size={14} />
                                    {item.label}
                                </NavLink>
                            ))}

                            {/* More dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setMoreOpen(o => !o)}
                                    onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '6px 10px', borderRadius: 8, border: 'none',
                                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                        color: isMoreActive ? '#0f4c81' : '#4a5568',
                                        background: isMoreActive ? '#e8f0fe' : 'transparent',
                                    }}
                                >
                                    More <ChevronDown size={13} style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                </button>
                                {moreOpen && (
                                    <div style={{
                                        position: 'absolute', top: '110%', left: 0, background: '#fff',
                                        borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        minWidth: 180, padding: 6, zIndex: 300,
                                    }}>
                                        {moreNavItems.map(item => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setMoreOpen(false)}
                                                style={({ isActive }) => ({
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '8px 12px', borderRadius: 7, textDecoration: 'none',
                                                    fontSize: 13, fontWeight: 500,
                                                    color: isActive ? '#0f4c81' : '#4a5568',
                                                    background: isActive ? '#e8f0fe' : 'transparent',
                                                })}
                                            >
                                                <item.icon size={14} />
                                                {item.label}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                            <button style={iconBtn} aria-label="Notifications">
                                <Bell size={18} color="#718096" />
                            </button>
                            <div style={{
                                display:      'flex',
                                alignItems:   'center',
                                gap:          8,
                                padding:      '5px 10px',
                                borderRadius: 20,
                                background:   '#f0f4f8',
                                border:       '1px solid #e2e8f0',
                            }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0f4c81, #1a6fad)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, color: '#fff',
                                }}>
                                    {initials}
                                </div>
                                <span style={{ color: '#2d3748', fontSize: 13, fontWeight: 500 }}>
                                    {firstName}
                                </span>
                            </div>
                            <button onClick={handleLogout} style={iconBtn} title="Sign out">
                                <LogOut size={17} color="#718096" />
                            </button>
                            <button
                                onClick={() => setMenuOpen(o => !o)}
                                style={iconBtn}
                                className="d-md-none"
                                aria-label="Toggle menu"
                            >
                                {menuOpen ? <X size={20} color="#4a5568" /> : <Menu size={20} color="#4a5568" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile nav */}
                    {menuOpen && (
                        <div
                            style={{ borderTop: '1px solid #e8ecf0', padding: '10px 0 12px' }}
                            className="d-md-none"
                        >
                            {allNavItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    onClick={() => setMenuOpen(false)}
                                    style={({ isActive }) => ({
                                        display:        'flex',
                                        alignItems:     'center',
                                        gap:            10,
                                        padding:        '10px 4px',
                                        textDecoration: 'none',
                                        color:          isActive ? '#0f4c81' : '#4a5568',
                                        borderBottom:   '1px solid #f0f4f8',
                                        fontSize:       14,
                                        fontWeight:     isActive ? 600 : 400,
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

            {/* ── Content ─────────────────────────────────────────────── */}
            <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
                {children ?? <Outlet />}
            </main>

            {/* ── Mobile bottom nav ────────────────────────────────────── */}
            <div className="d-md-none" style={{
                position:   'fixed',
                bottom:     0,
                left:       0,
                right:      0,
                background: '#fff',
                borderTop:  '1px solid #e8ecf0',
                display:    'flex',
                zIndex:     200,
            }}>
                {primaryNavItems.concat(moreNavItems.slice(0, 2)).map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        style={({ isActive }) => ({
                            flex:           1,
                            display:        'flex',
                            flexDirection:  'column',
                            alignItems:     'center',
                            padding:        '8px 4px',
                            textDecoration: 'none',
                            fontSize:       10,
                            color:          isActive ? '#0f4c81' : '#718096',
                            gap:            3,
                        })}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </NavLink>
                ))}
            </div>

            {/* Spacer so content isn't hidden behind fixed bottom nav on mobile */}
            <div style={{ height: 72 }} className="d-md-none" />

            <footer style={{
                textAlign:  'center',
                padding:    '14px 20px',
                color:      '#a0aec0',
                fontSize:   11,
                marginTop:  20,
            }}>
                Member Self-Service · Powered by G8 NEXUM - HMO ERP · {new Date().getFullYear()}
            </footer>
        </div>
    );
}

const iconBtn = {
    background:   'none',
    border:       'none',
    cursor:       'pointer',
    padding:      6,
    borderRadius: 6,
    display:      'flex',
    alignItems:   'center',
};