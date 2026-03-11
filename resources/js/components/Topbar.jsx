import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, User, ChevronDown, Download, Upload, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getBranches, setActiveBranch } from '../api/branches';
import { fetchNotificationCount } from '../api/index';

export default function Topbar({ onToggleSidebar }) {
    const { user, logout, isHQ, activeBranchId, setActiveBranchId, hasPermission } = useAuth();
    const navigate        = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef         = useRef(null);

    const [showExportMenu, setShowExportMenu] = useState(false);

    // Close dropdown when clicking anywhere outside it
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    // HQ branch switcher — only fetch when user is HQ
    const { data: branchesData } = useQuery({
        queryKey: ['branches'],
        queryFn:  getBranches,
        enabled:  isHQ(),
        staleTime: 5 * 60 * 1000,
    });
    const branches = branchesData?.data ?? [];

    // Notification count — poll every 30s
    const { data: notifData } = useQuery({
        queryKey:        ['notification-count'],
        queryFn:         fetchNotificationCount,
        refetchInterval: 30000,
        staleTime:       15000,
        // enabled:         !!user, 
        retry:           false,
    });
    const unreadCount   = notifData?.data?.count ?? 0;
    const criticalCount = notifData?.data?.critical ?? 0;

    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
        navigate('/login');
    };

    const goToProfile = () => {
        setMenuOpen(false);
        navigate('/settings/profile');
    };

    const initials = user?.name
        ?.split(' ')
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase())
        .join('') ?? '?';

    return (
        <header
            className="d-flex align-items-center px-4 border-bottom bg-white"
            style={{ height: 64, minHeight: 64, zIndex: 110, position: 'relative' }}
        >
            {/* Sidebar toggle */}
            <button
                className="btn btn-light btn-sm me-3 flex-shrink-0"
                onClick={onToggleSidebar}
                title="Toggle sidebar"
            >
                <Menu size={18} />
            </button>

            {/* HQ: Branch context switcher */}
            {isHQ() && branches.length > 0 && (
                <div className="me-4">
                    <select
                        className="form-select form-select-sm"
                        style={{ minWidth: 210 }}
                        value={activeBranchId ?? ''}
                        onChange={e => setActiveBranchId(e.target.value || null)}
                    >
                        <option value="">All Branches (HQ View)</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name} ({b.code})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Non-HQ: show branch badge */}
            {!isHQ() && (
                <span className="badge bg-primary-subtle text-primary me-3 fw-semibold" style={{ fontSize: 12 }}>
                    {user?.branch?.name}
                </span>
            )}

            <div className="flex-grow-1" />

{/* Notification bell */}
<button
    className="btn btn-light btn-sm position-relative me-3"
    title="Notifications"
    onClick={() => navigate('/alerts')}
>
    <Bell size={18} />
    {unreadCount > 0 && (
        <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
            style={{
                fontSize:   9,
                background: criticalCount > 0 ? '#dc2626' : '#f59e0b',
                color:      '#fff',
            }}
            title={`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`}
        >
            {unreadCount > 99 ? '99+' : unreadCount}
        </span>
    )}
</button>

{/* AI Tools button */}
{hasPermission('ai.tools') && (
    <button
        className="btn btn-light btn-sm position-relative me-3"
        title="AI Tools - Document classification, smart routing, OCR, and more"
        onClick={() => navigate('/ai-tools')}
    >
        <Sparkles size={18} className="text-primary" />
    </button>
)}
            {hasPermission('reports.export') && (
                <div className="position-relative me-3">
                    <button
                        className="btn btn-light btn-sm d-flex align-items-center gap-1"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        title="Quick Export"
                    >
                        <Download size={16} />
                        <span className="d-none d-md-inline">Export</span>
                    </button>
                    
                    {showExportMenu && (
                        <div className="position-absolute end-0 bg-white rounded-3 shadow border py-2"
                            style={{ top: 'calc(100% + 6px)', minWidth: 200, zIndex: 500 }}>
                            <div className="px-3 py-1 text-muted small">Quick Reports</div>
                            <button className="dropdown-item small py-1" onClick={() => window.location.href = '/api/export/claims-aging'}>
                                Claims Aging
                            </button>
                            <button className="dropdown-item small py-1" onClick={() => window.location.href = '/api/export/claims-by-hcp'}>
                                Claims by HCP
                            </button>
                            <button className="dropdown-item small py-1" onClick={() => window.location.href = '/api/export/cost-by-corporate'}>
                                Cost per Corporate
                            </button>
                            <div className="dropdown-divider my-1"></div>
                            <div className="px-3 py-1 text-muted small">Data Export</div>
                            <button className="dropdown-item small py-1" onClick={() => navigate('/import')}>
                                <Upload size={12} className="me-2" />Import Data
                            </button>
                            <button className="dropdown-item small py-1" onClick={() => window.location.href = '/api/export/enrollees'}>
                                Enrollees (CSV)
                            </button>
                            <button className="dropdown-item small py-1" onClick={() => window.location.href = '/api/export/hcps'}>
                                HCPs (CSV)
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* User dropdown — ref-based close, no backdrop div needed */}
            <div className="position-relative" ref={menuRef}>
                <button
                    className="btn btn-light btn-sm d-flex align-items-center gap-2"
                    onClick={() => setMenuOpen(p => !p)}
                    type="button"
                >
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                        style={{ width: 30, height: 30, background: '#1e3a5f', fontSize: 12 }}
                    >
                        {initials}
                    </div>
                    <span
                        className="d-none d-md-inline text-truncate"
                        style={{ fontSize: 13, maxWidth: 130 }}
                    >
                        {user?.name}
                    </span>
                    <ChevronDown
                        size={14}
                        style={{
                            transition: 'transform 0.2s',
                            transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                    />
                </button>

                {menuOpen && (
                    <div
                        className="position-absolute end-0 bg-white rounded-3 shadow border py-1"
                        style={{ top: 'calc(100% + 6px)', minWidth: 220, zIndex: 500 }}
                    >
                        {/* User info header */}
                        <div className="px-3 py-2 border-bottom mb-1">
                            <div className="fw-semibold text-truncate" style={{ fontSize: 13 }}>
                                {user?.name}
                            </div>
                            <div className="text-muted text-truncate" style={{ fontSize: 11 }}>
                                {user?.email}
                            </div>
                            <div className="mt-1 d-flex flex-wrap gap-1">
                                {(user?.roles ?? []).map(role => (
                                    <span
                                        key={role}
                                        className="badge bg-secondary-subtle text-secondary"
                                        style={{ fontSize: 10 }}
                                    >
                                        {role.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Profile link */}
                        <button
                            type="button"
                            className="btn btn-sm w-100 text-start px-3 py-2 d-flex align-items-center gap-2 rounded-0"
                            style={{ fontSize: 13 }}
                            onClick={goToProfile}
                        >
                            <User size={14} className="text-muted" />
                            My Profile
                        </button>

                        <div className="border-top my-1" />

                        {/* Sign out */}
                        <button
                            type="button"
                            className="btn btn-sm w-100 text-start px-3 py-2 d-flex align-items-center gap-2 rounded-0 text-danger"
                            style={{ fontSize: 13 }}
                            onClick={handleLogout}
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
