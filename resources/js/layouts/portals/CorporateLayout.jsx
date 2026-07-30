/**
 * FILE LOCATION: resources/js/layouts/portals/CorporateLayout.jsx
 * PATCH NOTE: complete replacement of your real file. Two changes:
 * 1. [FIX] children/Outlet handling, see PHASE7_CORPORATELAYOUT_BUG_CHECK.md
 * 2. [PHASE 7] nav reorganized into logical groups instead of one flat
 *    growing list — Dashboard/Staff/Claims stay primary (top-level), money
 *    and plan-management items move into a "Manage" dropdown, since this
 *    is a horizontal top-bar, not a sidebar, and kept growing past what a
 *    single row comfortably holds.
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, CreditCard,
    LogOut, Menu, X, Bell, User, Building2,
    Wallet, Layers, FileCheck, Megaphone, RefreshCw, ChevronDown, BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Primary — used constantly, stays directly on the bar
const primaryNavItems = [
    { path: '/corporate',            label: 'Dashboard',         icon: LayoutDashboard, exact: true },
    { path: '/corporate/enrollees',  label: 'Staff & Enrollees', icon: Users },
    { path: '/corporate/claims',     label: 'Claims',            icon: FileText },
    { path: '/plan-requests',        label: 'Plan Requests',     icon: FileCheck }
];

// Secondary — grouped under "Manage" so the bar doesn't keep growing every
// time a self-service feature gets added
const manageNavItems = [
    { path: '/corporate/invoices',       label: 'Invoices',        icon: CreditCard },
    { path: '/corporate/budget',         label: 'Budget',          icon: Wallet },
    { path: '/corporate/utilization',    label: 'Utilization',     icon: BarChart3 }, 
    { path: '/corporate/renewals',       label: 'Renewals',        icon: RefreshCw },
    { path: '/corporate/available-plans', label: 'Plan Builder',   icon: Layers },
    { path: '/corporate/broadcast',      label: 'Broadcast',       icon: Megaphone },
    { path: '/corporate/profile',        label: 'Company Profile', icon: Building2 },
];

const allNavItems = [...primaryNavItems, ...manageNavItems]; // used for mobile menu, flat

export default function CorporateLayout({ children }) { // [FIX]
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [manageOpen, setManageOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const firstName   = user?.name?.split(' ')[0] || 'User';
    const companyName = user?.corporate?.name || 'Your Company';
    const isManageActive = manageNavItems.some(item => location.pathname.startsWith(item.path));

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

            {/* Top navigation */}
            <nav style={{
                background:    'linear-gradient(135deg, #0f4c81 0%, #1a6fad 100%)',
                boxShadow:     '0 2px 12px rgba(15,76,129,0.3)',
                position:      'sticky',
                top:           0,
                zIndex:        200,
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: 'rgba(255,255,255,0.2)',
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
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                                    Corporate Portal
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                                    {companyName}
                                </div>
                            </div>
                        </div>

                        {/* Desktop nav */}
                        <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }} className="d-none d-lg-flex">
                            {primaryNavItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    style={({ isActive }) => ({
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        padding: '6px 14px', borderRadius: 8, textDecoration: 'none',
                                        fontSize: 13, fontWeight: 500,
                                        color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                                        background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                                    })}
                                >
                                    <item.icon size={15} />
                                    {item.label}
                                </NavLink>
                            ))}

                            {/* [PHASE 7] Manage dropdown */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setManageOpen(o => !o)}
                                    onBlur={() => setTimeout(() => setManageOpen(false), 150)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        fontSize: 13, fontWeight: 500,
                                        color: isManageActive ? '#fff' : 'rgba(255,255,255,0.75)',
                                        background: isManageActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                                    }}
                                >
                                    Manage <ChevronDown size={13} style={{ transform: manageOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                </button>
                                {manageOpen && (
                                    <div style={{
                                        position: 'absolute', top: '110%', left: 0, background: '#fff',
                                        borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        minWidth: 200, padding: 6, zIndex: 300,
                                    }}>
                                        {manageNavItems.map(item => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                            <button style={iconBtnStyle} aria-label="Notifications">
                                <Bell size={18} color="rgba(255,255,255,0.8)" />
                            </button>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)',
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

                    {/* Mobile nav — flat list, all items */}
                    {menuOpen && (
                        <div style={{ padding: '12px 0 16px', borderTop: '1px solid rgba(255,255,255,0.15)' }} className="d-lg-none">
                            {allNavItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    onClick={() => setMenuOpen(false)}
                                    style={({ isActive }) => ({
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 16px', textDecoration: 'none',
                                        color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                                        background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                                        borderRadius: 8, marginBottom: 2, fontSize: 14,
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

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
                {children ?? <Outlet />} {/* [FIX] */}
            </main>

            <footer style={{
                textAlign: 'center', padding: '16px 24px', color: '#94a3b8',
                fontSize: 12, borderTop: '1px solid #e2e8f0', marginTop: 32,
            }}>
                Corporate Self-Service Portal · Powered by G8 NEXUM - HMO ERP · {new Date().getFullYear()}
            </footer>
        </div>
    );
}

const iconBtnStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center',
};
