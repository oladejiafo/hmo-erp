import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Building2, Users, Building, FileText,
    CreditCard, BarChart3, Settings, Shield, ShieldCheck, Upload, // ← add ShieldCheck
    ChevronRight, GitBranch, ScrollText, CalendarDays, Bell, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchPAStats, fetchNotificationCount } from '../api/index';

const navItems = [
    {
        label:      'Dashboard',
        icon:       LayoutDashboard,
        path:       '/',
        exact:      true,
        permission: null, // Everyone sees the dashboard
    },
    {
        label:      'Corporates',
        icon:       Building2,
        path:       '/corporates',
        permission: 'corporates.view',
    },
    {
        label:      'Enrollees',
        icon:       Users,
        path:       '/enrollees',
        permission: 'enrollees.view',
    },
    {
        label:      'Health Care Providers',
        icon:       Building,
        path:       '/hcps',
        permission: 'hcps.view',
        shortLabel: 'HCPs',
    },
    {
        label:      'Pre-Authorisation',
        icon:       ShieldCheck,
        path:       '/pre-auth',
        permission: 'pa.view',
        shortLabel: 'Pre-Auth',
    },

    {
        label:      'Claims',
        icon:       FileText,
        path:       '/claims',
        permission: 'claims.view',
    },
    {
        label:      'Finance',
        icon:       CreditCard,
        path:       '/finance',
        permission: 'finance.view',
    },
    {
        label:      'Compliance',        // ← NEW
        icon:       CalendarDays,        // ← NEW
        path:       '/compliance',       // ← NEW
        permission: 'compliance.view',   // ← NEW
    },
    {
        label:      'AI Tools',              // ← NEW
        icon:       Sparkles,                 // ← Import Sparkles from lucide-react
        path:       '/ai-tools',              // ← NEW
        permission: 'ai.tools',                // ← NEW
        shortLabel: 'AI Tools',
    },
    {
        label:      'Alerts',             // ← NEW
        icon:       Bell,                 // ← NEW
        path:       '/alerts',            // ← NEW
        permission: null,                 // ← NEW - All authenticated staff see their own alerts
        badgeKey:   'alerts',              // ← NEW - for notification badges
    },
    {
        label:      'Import / Export',  // ← NEW
        icon:       Upload,              // ← Import Upload from lucide-react
        path:       '/import',           // ← NEW
        permission: 'import.enrollees',  // ← Uses any import permission
        shortLabel: 'Import',
    },
    {
        label:      'Reports',
        icon:       BarChart3,
        path:       '/reports',
        permission: 'reports.branch',
    },
];

const settingsItems = [
    {
        label:      'Users',
        icon:       Users,
        path:       '/settings/users',
        permission: 'users.view',
    },
    {
        label:      'Roles',
        icon:       Shield,
        path:       '/settings/roles',
        permission: 'roles.view',
    },
    {
        label:      'Branches',
        icon:       GitBranch,
        path:       '/settings/branches',
        permission: 'branches.view',
    },
    {
        label:      'Audit Log',
        icon:       ScrollText,
        path:       '/reports/audit-logs',
        permission: 'reports.audit_logs',
    },
];

export default function Sidebar({ collapsed }) {
    const { hasPermission, user } = useAuth();
    const location = useLocation();

    const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const visibleItems      = navItems.filter(i => !i.permission || hasPermission(i.permission));
    const visibleSettings   = settingsItems.filter(i => !i.permission || hasPermission(i.permission));

    const sidebarStyle = {
        width:      collapsed ? 64 : 260,
        minWidth:   collapsed ? 64 : 260,
        background: '#1e3a5f',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflowX:  'hidden',
        overflowY:  'auto',
        zIndex:     100,
    };

    // Add this debug line

    return (
        <nav className="d-flex flex-column text-white" style={sidebarStyle}>
            {/* Logo */}
            <div
                className="d-flex align-items-center px-3 border-bottom border-white border-opacity-10"
                style={{ height: 64, minHeight: 64 }}
            >
                <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 36, height: 36, background: '#2d6a9f' }}
                >
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                        <path d="M16 2L28 8V16C28 22.6 22.8 28.6 16 30C9.2 28.6 4 22.6 4 16V8L16 2Z"
                              fill="white" fillOpacity="0.9"/>
                        <path d="M13 16H19M16 13V19" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                </div>
                {!collapsed && (
                    <div className="ms-3 overflow-hidden">
                        <div className="fw-bold text-truncate" style={{ fontSize: 14 }}>HMO ERP</div>
                        <div className="text-white-50 text-truncate" style={{ fontSize: 11 }}>
                            {user?.branch?.name}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Navigation */}
            <div className="flex-grow-1 py-3">
                {visibleItems.map(item => (
                    <SidebarItem
                        key={item.path}
                        item={item}
                        active={isActive(item.path, item.exact)}
                        collapsed={collapsed}
                    />
                ))}

                {/* Settings group */}
                {visibleSettings.length > 0 && (
                    <>
                        <div className="px-3 pt-3 pb-1">
                            {!collapsed && (
                                <span className="text-uppercase text-white-50"
                                      style={{ fontSize: 10, letterSpacing: 1 }}>
                                    Administration
                                </span>
                            )}
                        </div>
                        {visibleSettings.map(item => (
                            <SidebarItem
                                key={item.path}
                                item={item}
                                active={isActive(item.path)}
                                collapsed={collapsed}
                            />
                        ))}
                    </>
                )}
            </div>

            {/* Profile link at bottom */}
            <div className="border-top border-white border-opacity-10 p-3">
                <NavLink
                    to="/settings/profile"
                    className="d-flex align-items-center text-decoration-none text-white-50 rounded-2 px-2 py-2"
                    style={({ isActive }) => ({
                        background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    })}
                >
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold"
                        style={{ width: 32, height: 32, background: '#2d6a9f', fontSize: 13 }}
                    >
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="ms-2 overflow-hidden">
                            <div className="text-white text-truncate" style={{ fontSize: 13 }}>
                                {user?.name}
                            </div>
                            <div className="text-truncate" style={{ fontSize: 11 }}>
                                {user?.roles?.[0] ?? 'User'}
                            </div>
                        </div>
                    )}
                </NavLink>
            </div>
        </nav>
    );
}

function SidebarItem({ item, active, collapsed }) {
    const Icon = item.icon;

    // PA pending badge
    const { data: paStats } = item.path === '/pre-auth'
        ? useQuery({ 
            queryKey: ['pa-stats'], 
            queryFn: fetchPAStats, 
            refetchInterval: 60000, 
            staleTime: 30000 
          })
        : { data: null };

    // Alerts/notification count badge
    const { data: notifData } = item.badgeKey === 'alerts'
        ? useQuery({
            queryKey:       ['notification-count'],
            queryFn:        fetchNotificationCount,
            refetchInterval: 30000,
            staleTime:       15000,
          })
        : { data: null };

    const pendingCount  = paStats?.data?.pending_count ?? 0;
    const overdueCount  = paStats?.data?.overdue_count ?? 0;
    const showPABadge   = item.path === '/pre-auth' && pendingCount > 0;

    const unreadCount   = notifData?.data?.count ?? 0;
    const criticalCount = notifData?.data?.critical ?? 0;
    const showAlertBadge = item.badgeKey === 'alerts' && unreadCount > 0;

    return (
        <NavLink
            to={item.path}
            end={item.exact}
            title={collapsed ? item.label : undefined}
            style={{
                display:         'flex',
                alignItems:      'center',
                padding:         '10px 12px',
                margin:          '2px 8px',
                borderRadius:    8,
                textDecoration:  'none',
                color:           active ? '#ffffff' : 'rgba(255,255,255,0.6)',
                background:      active ? 'rgba(255,255,255,0.12)' : 'transparent',
                fontWeight:      active ? 600 : 400,
                fontSize:        14,
                whiteSpace:      'nowrap',
                overflow:        'hidden',
                transition:      'all 0.15s',
                position:        'relative',
            }}
            onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                if (!active) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent';
                if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
        >
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={18} />
                {showPABadge && (
                    <span style={{
                        position: 'absolute', top: -6, right: -6,
                        minWidth: 16, height: 16, borderRadius: 8,
                        background: overdueCount > 0 ? '#ef4444' : '#f59e0b',
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px', border: '1.5px solid #1e3a5f',
                    }}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                )}
                {showAlertBadge && (
                    <span style={{
                        position: 'absolute', top: -6, right: -6,
                        minWidth: 16, height: 16, borderRadius: 8,
                        background: criticalCount > 0 ? '#ef4444' : '#f59e0b',
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px', border: '1.5px solid #1e3a5f',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>
            {!collapsed && (
                <span className="ms-3 flex-grow-1">{item.shortLabel ?? item.label}</span>
            )}
            {!collapsed && showPABadge && !active && (
                <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 8, marginLeft: 4,
                    background: overdueCount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    color: overdueCount > 0 ? '#fca5a5' : '#fde68a',
                }}>
                    {pendingCount}
                </span>
            )}
            {!collapsed && showAlertBadge && !active && (
                <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 8, marginLeft: 4,
                    background: criticalCount > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                    color: criticalCount > 0 ? '#fca5a5' : '#fde68a',
                }}>
                    {unreadCount}
                </span>
            )}
        </NavLink>
    );
}