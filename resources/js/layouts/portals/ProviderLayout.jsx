/**
 * NEW FILE — resources/js/layouts/portals/ProviderLayout.jsx
 * Mirrors resources/js/layouts/portals/CorporateLayout.jsx exactly —
 * same nav shell shape, same auth/logout wiring, same style conventions.
 */
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FileText, ShieldCheck, UploadCloud,
    Wallet, Scale, MessageSquare, ScanLine,
    LogOut, Menu, X, Bell, Stethoscope, Video,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
    { path: '/provider',                label: 'Dashboard',           icon: LayoutDashboard, exact: true },
    { path: '/provider/verify',         label: 'Verify',              icon: ScanLine, exact: true },
    { path: '/provider/telemedicine',   label: 'Telemedicine',        icon: Video, exact: true }, // PHASE 1
    { path: '/provider/claims',         label: 'Claims',              icon: FileText, exact: true },  // ← ADD exact: true
    { path: '/provider/claims/import',  label: 'Bulk Upload',         icon: UploadCloud },
    { path: '/provider/pre-auths',      label: 'Pre-Authorisations',  icon: ShieldCheck, exact: true },
    { path: '/provider/payments',       label: 'Payments',            icon: Wallet, exact: true },
    { path: '/provider/reconciliation', label: 'Reconciliation',      icon: Scale, exact: true },
    { path: '/provider/tickets',        label: 'Support',             icon: MessageSquare, exact: true },
];

export default function ProviderLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const hcpName = user?.hcp?.name || 'Provider';

    return (
        <div style={shellStyle}>
            {/* Sidebar */}
            <aside style={{ ...sidebarStyle, transform: menuOpen ? 'translateX(0)' : undefined }}>
                <div style={brandRowStyle}>
                    <Stethoscope size={20} color="#0f4c81" />
                    <span style={brandTextStyle}>Provider Portal</span>
                    <button onClick={() => setMenuOpen(false)} style={closeBtnStyle}><X size={18} /></button>
                </div>

                <nav style={navStyle}>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            style={({ isActive }) => ({
                                ...navItemStyle,
                                background: isActive ? '#e8f0fe' : 'transparent',
                                color: isActive ? '#0f4c81' : '#4a5568',
                                fontWeight: isActive ? 600 : 500,
                            })}
                            onClick={() => setMenuOpen(false)}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <button onClick={handleLogout} style={logoutStyle}>
                    <LogOut size={16} /> Log out
                </button>
            </aside>

            {/* Main content area */}
            <div style={mainStyle}>
                <header style={headerStyle}>
                    <button onClick={() => setMenuOpen(true)} style={menuBtnStyle}><Menu size={20} /></button>
                    <div style={headerTitleStyle}>{hcpName}</div>
                    <button style={bellStyle}><Bell size={18} /></button>
                </header>

                {/* Content - flex grow to push footer down */}
                <div style={{ flex: 1, padding: '24px' }}>
                    {children ?? <Outlet />}
                </div>

                {/* Footer - stays at bottom */}
                <footer style={{
                    textAlign: 'center',
                    padding: '12px 24px',
                    color: '#94a3b8',
                    fontSize: 12,
                    borderTop: '1px solid #e2e8f0',
                    flexShrink: 0,
                }}>
                    Provider Self-Service Portal · Powered by G8 NEXUM - HMO ERP · {new Date().getFullYear()}
                </footer>
            </div>
        </div>
    );
}

const shellStyle = { display: 'flex', minHeight: '100vh', background: '#f7fafc' };
const sidebarStyle = { width: 240, background: '#fff', borderRight: '1px solid #e8ecf0', display: 'flex', flexDirection: 'column', padding: '16px 12px' };
const brandRowStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 20px' };
const brandTextStyle = { fontWeight: 700, fontSize: 15, color: '#1a202c' };
const closeBtnStyle = { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'none' };
const navStyle = { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 };
const navItemStyle = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 14 };
const logoutStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: 'none', background: 'none', color: '#c5221f', fontSize: 14, cursor: 'pointer', marginTop: 12 };
const mainStyle = { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' };
const headerStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e8ecf0', flexShrink: 0 };
const menuBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', display: 'none' };
const headerTitleStyle = { fontWeight: 600, fontSize: 15, color: '#2d3748' };
const bellStyle = { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568' };
const contentStyle = { padding: 24, flex: 1 };