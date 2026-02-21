/**
 * FILE LOCATION: resources/js/components/common/StatCard.jsx
 *
 * Stat card for dashboard KPI metrics.
 *
 * USAGE:
 *   import StatCard from '../components/common/StatCard';
 *   <StatCard
 *     title="Total Claims"
 *     value="1,234"
 *     subtitle="42 pending"
 *     icon={FileText}       ← pass the COMPONENT REFERENCE, not JSX
 *     color="primary"
 *     loading={isLoading}
 *   />
 *
 * IMPORTANT — the `icon` prop must be a React component (e.g. from lucide-react),
 * NOT a JSX element. This component calls it as <Icon size={18} />.
 * Passing <FileText /> (with angle brackets) will cause:
 *   "Objects are not valid as a React child (found: object with keys {$$typeof, render})"
 */

import React from 'react';

const colorMap = {
    primary:  { bg: '#e8f0fe', icon: '#1967d2' },
    success:  { bg: '#e6f4ea', icon: '#137333' },
    warning:  { bg: '#fef7e0', icon: '#b05e00' },
    danger:   { bg: '#fce8e6', icon: '#c5221f' },
    info:     { bg: '#e3f2fd', icon: '#0277bd' },
};

export default function StatCard({ title, value, subtitle, icon, color = 'primary', loading }) {
    const colors = colorMap[color] ?? colorMap.primary;

    // `icon` must be a component constructor, not a JSX element.
    // We assign it to Icon (capital I) so JSX knows to call it as a component.
    const Icon = icon;

    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-muted" style={{ fontSize: 13 }}>{title}</span>

                    {Icon && (
                        <div
                            className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: 36, height: 36, background: colors.bg }}
                        >
                            {/* Call Icon as a component — NOT as {Icon} which renders the object */}
                            <Icon size={18} color={colors.icon} />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="placeholder-glow">
                        <span className="placeholder col-5 rounded" style={{ height: 28 }} />
                        {subtitle && <span className="placeholder col-7 rounded mt-1" style={{ height: 14 }} />}
                    </div>
                ) : (
                    <>
                        <div className="fw-bold" style={{ fontSize: 26 }}>
                            {value ?? '—'}
                        </div>
                        {subtitle && (
                            <p className="text-muted mb-0 mt-1" style={{ fontSize: 12 }}>
                                {subtitle}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}