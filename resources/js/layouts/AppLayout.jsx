/**
 * FILE LOCATION: resources/js/layouts/AppLayout.jsx
 *
 * The main authenticated application shell.
 *
 * Structure:
 *   ┌──────────┬──────────────────────────────────┐
 *   │          │  Topbar (64px)                   │
 *   │ Sidebar  ├──────────────────────────────────┤
 *   │ (260px)  │  <Outlet /> — page content       │
 *   │          │  (scrollable)                    │
 *   └──────────┴──────────────────────────────────┘
 *
 * Sidebar is collapsible to 64px (icon-only mode) via the hamburger in Topbar.
 *
 * IMPORTANT: Sidebar and Topbar are in components/layout/ (not components/)
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar  from '../components/Topbar';
import Footer from '../components/Footer';
import HelpDrawer from '../components/help/HelpDrawer';
import LicenseBanner from '../components/LicenseBanner';

export default function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="d-flex vh-100 overflow-hidden" style={{ background: '#f4f6fa' }}>

            {/* ── Sidebar (left column) ──────────────────────────── */}
            <Sidebar collapsed={sidebarCollapsed} />

            {/* ── Main column (Topbar + page content) ──────────── */}
            <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                <Topbar
                    onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
                />
                <LicenseBanner /> 
                <main
                    className="flex-grow-1 overflow-auto p-4"
                    id="main-content"
                >
                    <Outlet />
                </main>
                <HelpDrawer />
                <Footer />
            </div>

        </div>
    );
}