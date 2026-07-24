/**
 * FILE: resources/js/components/layout/Sidebar.jsx
 *
 * Changes from original:
 *  - Financial group now lists Capitation as its own sidebar entry (no longer
 *    only reachable via a tab inside FinancePage)
 *  - FFS Providers entry added under Financial (permission-gated: finance.ffs)
 *  - Payment-model badge on HCPs nav item removed (kept clean); badge logic
 *    stays at HCP detail level
 */
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Building2,
    Users,
    Building,
    FileText,
    CreditCard,
    BarChart3,
    Settings,
    Settings2,
    Shield,
    ShieldCheck,
    Upload,
    ChevronRight,
    GitBranch,
    ScrollText,
    CalendarDays,
    Bell,
    Sparkles,
    Activity,
    Layers,
    Key,
    MessageSquare,
    FileCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchPAStats, fetchNotificationCount } from "../api/index";

// ─── Nav items ───────────────────────────────────────────────────────────────

const navItems = [
    // Core Operations
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/",
        exact: true,
        permission: null,
        group: "core",
    },
    {
        label: "Pre-Authorisation",
        icon: ShieldCheck,
        path: "/pre-auth",
        permission: "pa.view",
        shortLabel: "Pre-Auth Code",
        group: "core",
    },
    {
        label: "Claims",
        icon: FileText,
        path: "/claims",
        permission: "claims.view",
        group: "core",
    },
    {
        label: "Bulk Import",
        path: "/claims/import",
        icon: Upload,
        permission: "claims.import",
        group: "core",
    },

    // Master Data
    // {
    //     label: 'Health Plans',
    //     path: '/plans',
    //     icon: ShieldCheck,
    //     permission: 'plans.view',
    //     group: 'master',
    // },

    {
        label: "Corporates/Clients",
        icon: Building2,
        path: "/corporates",
        permission: "corporates.view",
        group: "master",
    },
    {
        label: "Enrollees",
        icon: Users,
        path: "/enrollees",
        permission: "enrollees.view",
        group: "master",
    },
    {
        label: "Health Care Providers",
        icon: Building,
        path: "/hcps",
        permission: "hcps.view",
        shortLabel: "HCPs",
        group: "master",
    },

    // Financial - expanded: Finance, Capitation, FFS each get their own row
    {
        label: "Finance & Payments",
        icon: CreditCard,
        path: "/finance",
        permission: "finance.view",
        group: "financial",
        // exact match so /finance/capitation doesn't highlight this item
        exact: true,
    },
    {
        label: "Capitation",
        icon: Activity,
        path: "/finance/capitation",
        permission: "finance.capitation",
        group: "financial",
    },
    {
        label: "FFS Providers",
        icon: Layers,
        path: "/finance/ffs",
        permission: "finance.ffs",
        group: "financial",
    },
    {
        label: "Reports",
        icon: BarChart3,
        path: "/reports",
        permission: "reports.branch",
        group: "financial",
    },

    //Requests
    {
        label: "Plan Requests",
        icon: FileCheck, // Import from lucide-react
        path: "/plan-requests",
        permission: "plan_requests.review",
        group: "requests",
    },
    {
        label: "Support Tickets",
        icon: MessageSquare,
        path: "/tickets",
        permission: "tickets.view",
        group: "requests",
    },

    // System & Tools
    {
        label: "AI Tools",
        icon: Sparkles,
        path: "/ai-tools",
        permission: "ai.tools",
        shortLabel: "AI Tools",
        group: "system",
    },
    {
        label: "Alerts Center",
        icon: Bell,
        path: "/alerts",
        permission: null,
        badgeKey: "alerts",
        group: "system",
    },
    {
        label: "Import / Export",
        icon: Upload,
        path: "/import",
        permission: "import.enrollees",
        shortLabel: "Import / Export",
        group: "system",
    },
    {
        label: "Compliance",
        icon: CalendarDays,
        path: "/compliance",
        permission: "compliance.view",
        group: "system",
    },
];

const settingsItems = [
    {
        label: "Base Tariffs",
        icon: FileText,
        path: "/settings/base-tariffs",
        permission: "hcps.tariffs",
        group: "admin",
    },
    {
        label: 'Base Plans',
        icon: ShieldCheck,
        path: '/settings/base-plans',
        permission: 'plans.view',
        group: 'admin',
    },
    {
        label: "Users",
        icon: Users,
        path: "/settings/users",
        permission: "users.view",
        group: "admin",
    },
    {
        label: "Roles",
        icon: Shield,
        path: "/settings/roles",
        permission: "roles.view",
        group: "admin",
    },
    {
        label: "Branches",
        icon: GitBranch,
        path: "/settings/branches",
        permission: "branches.view",
        group: "admin",
    },
    {
        label: "Audit Log",
        icon: ScrollText,
        path: "/reports/audit-logs",
        permission: "reports.audit_logs",
        group: "admin",
    },
    {
        label: 'System Settings',
        icon: Settings2, // or CogIcon
        path: '/settings/system',
        permission: 'settings.system',
        group: "admin",
    },
    { 
        label: 'Licence', 
        icon: Key, 
        path: '/settings/license', 
        permission: 'settings.system',
        group: "admin", 
    }
];

const groupTitles = {
    core: "Core Operations",
    master: "Master Data",
    financial: "Financial",
    requests: "Requests & Support",
    system: "System & Tools",
    admin: "Administration",
};

const groupOrder = ["core", "master", "financial","requests", "system", "admin"];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed }) {
    const { hasPermission, user } = useAuth();
    const location = useLocation();
    

    const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const visibleNavItems = navItems.filter(
        (i) => !i.permission || hasPermission(i.permission)
    );
    const visibleSettings = settingsItems.filter(
        (i) => !i.permission || hasPermission(i.permission)
    );
    const allVisibleItems = [...visibleNavItems, ...visibleSettings];

    const groupedItems = allVisibleItems.reduce((acc, item) => {
        const g = item.group || "other";
        if (!acc[g]) acc[g] = [];
        acc[g].push(item);
        return acc;
    }, {});

    const sidebarStyle = {
        width: collapsed ? 64 : 260,
        minWidth: collapsed ? 64 : 260,
        background: "#1e3a5f",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflowX: "hidden",
        overflowY: "auto",
        zIndex: 100,
    };

    return (
        <nav className="d-flex flex-column text-white" style={sidebarStyle}>
            {/* Logo */}
            <div
                className="d-flex align-items-center px-3 border-bottom border-white border-opacity-10"
                style={{ height: 64, minHeight: 64 }}
            >
                <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 36, height: 36, background: "#2d6a9f" }}
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
                {!collapsed && (
                    <div className="ms-3 overflow-hidden">
                        <div
                            className="fw-bold text-truncate"
                            style={{ fontSize: 14 }}
                        >
                            G8 Nexum - HMO ERP
                        </div>
                        <div
                            className="text-white-50 text-truncate"
                            style={{ fontSize: 11 }}
                        >
                            {user?.branch?.name}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation groups */}
            <div className="flex-grow-1 py-3">
                {groupOrder.map((groupKey) => {
                    const items = groupedItems[groupKey];
                    if (!items || items.length === 0) return null;

                    return (
                        <React.Fragment key={groupKey}>
                            {!collapsed && (
                                <div className="px-3 pt-3 pb-1">
                                    <span
                                        className="text-uppercase text-white-50"
                                        style={{
                                            fontSize: 10,
                                            letterSpacing: 1,
                                        }}
                                    >
                                        {groupTitles[groupKey] || groupKey}
                                    </span>
                                </div>
                            )}
                            {items.map((item) => (
                                <SidebarItem
                                    key={item.path}
                                    item={item}
                                    active={isActive(item.path, item.exact)}
                                    collapsed={collapsed}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Profile */}
            <div className="border-top border-white border-opacity-10 p-3">
                <NavLink
                    to="/settings/profile"
                    className="d-flex align-items-center text-decoration-none text-white-50 rounded-2 px-2 py-2"
                    style={({ isActive }) => ({
                        background: isActive
                            ? "rgba(255,255,255,0.1)"
                            : "transparent",
                    })}
                >
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold"
                        style={{
                            width: 32,
                            height: 32,
                            background: "#2d6a9f",
                            fontSize: 13,
                        }}
                    >
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="ms-2 overflow-hidden">
                            <div
                                className="text-white text-truncate"
                                style={{ fontSize: 13 }}
                            >
                                {user?.name}
                            </div>
                            <div
                                className="text-truncate"
                                style={{ fontSize: 11 }}
                            >
                                {user?.roles?.[0] ?? "User"}
                            </div>
                        </div>
                    )}
                </NavLink>
            </div>
        </nav>
    );
}

// ─── SidebarItem ─────────────────────────────────────────────────────────────

function SidebarItem({ item, active, collapsed }) {
    const Icon = item.icon;

    const { data: paStats } =
        item.path === "/pre-auth"
            ? useQuery({
                  queryKey: ["pa-stats"],
                  queryFn: fetchPAStats,
                  refetchInterval: 60000,
                  staleTime: 30000,
              })
            : { data: null };

    const { data: notifData } =
        item.badgeKey === "alerts"
            ? useQuery({
                  queryKey: ["notification-count"],
                  queryFn: fetchNotificationCount,
                  refetchInterval: 30000,
                  staleTime: 15000,
                //   enabled: !!user,
                  retry: false,
              })
            : { data: null };

    const pendingCount = paStats?.data?.pending_count ?? 0;
    const overdueCount = paStats?.data?.overdue_count ?? 0;
    const showPABadge = item.path === "/pre-auth" && pendingCount > 0;
    const unreadCount = notifData?.data?.count ?? 0;
    const criticalCount = notifData?.data?.critical ?? 0;
    const showAlertBadge = item.badgeKey === "alerts" && unreadCount > 0;

    // FFS Providers item gets a distinct accent colour
    const isFFS = item.path === "/finance/ffs";

    return (
        <NavLink
            to={item.path}
            end={item.exact}
            title={collapsed ? item.label : undefined}
            style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                margin: "2px 8px",
                borderRadius: 8,
                textDecoration: "none",
                color: active
                    ? "#ffffff"
                    : isFFS
                    ? "rgba(255,255,255,0.75)"
                    : "rgba(255,255,255,0.6)",
                background: active
                    ? isFFS
                        ? "rgba(99,102,241,0.25)"
                        : "rgba(255,255,255,0.12)"
                    : "transparent",
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                transition: "all 0.15s",
                position: "relative",
                borderLeft:
                    isFFS && !active
                        ? "2px solid rgba(99,102,241,0.4)"
                        : undefined,
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.background = isFFS
                        ? "rgba(99,102,241,0.15)"
                        : "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "#ffffff";
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = isFFS
                        ? "rgba(255,255,255,0.75)"
                        : "rgba(255,255,255,0.6)";
                }
            }}
        >
            {/* Icon + optional badge */}
            <div
                style={{
                    position: "relative",
                    flexShrink: 0,
                    color: isFFS && !active ? "#a5b4fc" : "inherit",
                }}
            >
                <Icon size={18} />
                {showPABadge && (
                    <span
                        style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            minWidth: 16,
                            height: 16,
                            borderRadius: 8,
                            background:
                                overdueCount > 0 ? "#ef4444" : "#f59e0b",
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 3px",
                            border: "1.5px solid #1e3a5f",
                        }}
                    >
                        {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                )}
                {showAlertBadge && (
                    <span
                        style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            minWidth: 16,
                            height: 16,
                            borderRadius: 8,
                            background:
                                criticalCount > 0 ? "#ef4444" : "#f59e0b",
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 3px",
                            border: "1.5px solid #1e3a5f",
                        }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </div>

            {/* Label */}
            {!collapsed && (
                <span
                    className="ms-3 flex-grow-1"
                    style={{ color: isFFS && !active ? "#a5b4fc" : "inherit" }}
                >
                    {item.shortLabel ?? item.label}
                </span>
            )}

            {/* Inline count badges */}
            {!collapsed && showPABadge && !active && (
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 8,
                        marginLeft: 4,
                        background:
                            overdueCount > 0
                                ? "rgba(239,68,68,0.2)"
                                : "rgba(245,158,11,0.2)",
                        color: overdueCount > 0 ? "#fca5a5" : "#fde68a",
                    }}
                >
                    {pendingCount}
                </span>
            )}
            {!collapsed && showAlertBadge && !active && (
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 8,
                        marginLeft: 4,
                        background:
                            criticalCount > 0
                                ? "rgba(239,68,68,0.2)"
                                : "rgba(245,158,11,0.2)",
                        color: criticalCount > 0 ? "#fca5a5" : "#fde68a",
                    }}
                >
                    {unreadCount}
                </span>
            )}
        </NavLink>
    );
}
