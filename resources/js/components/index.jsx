import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// ── StatusBadge ──────────────────────────────────────────────────────────────
/**
 * Renders a Bootstrap badge using the color from the enum.
 * status: the raw enum value string e.g. 'active'
 * color:  Bootstrap variant e.g. 'success', 'danger', 'warning'
 * label:  Human-readable label
 */
export function StatusBadge({ status, color, label }) {
    const colorMap = {
        success:   { bg: '#d1e7dd', text: '#0a3622' },
        danger:    { bg: '#f8d7da', text: '#58151c' },
        warning:   { bg: '#fff3cd', text: '#664d03' },
        info:      { bg: '#cff4fc', text: '#055160' },
        primary:   { bg: '#cfe2ff', text: '#084298' },
        secondary: { bg: '#e2e3e5', text: '#41464b' },
        dark:      { bg: '#d3d3d4', text: '#141619' },
    };

    const style = colorMap[color] ?? colorMap.secondary;

    return (
        <span
            className="badge rounded-pill"
            style={{
                background: style.bg,
                color:      style.text,
                fontWeight: 600,
                fontSize:   11,
            }}
        >
            {label ?? status}
        </span>
    );
}

// ── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
    return (
        <div className="d-flex align-items-start justify-content-between mb-4">
            <div>
                {breadcrumbs && (
                    <nav aria-label="breadcrumb" className="mb-1">
                        <ol className="breadcrumb mb-0" style={{ fontSize: 12 }}>
                            {breadcrumbs.map((crumb, i) => (
                                <li
                                    key={i}
                                    className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
                                >
                                    {crumb}
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}
                <h4 className="fw-bold mb-0">{title}</h4>
                {subtitle && <p className="text-muted mb-0 mt-1" style={{ fontSize: 13 }}>{subtitle}</p>}
            </div>
            {actions && <div className="d-flex gap-2">{actions}</div>}
        </div>
    );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', loading }) {
    const colorMap = {
        primary:  { bg: '#e8f0fe', icon: '#1967d2' },
        success:  { bg: '#e6f4ea', icon: '#137333' },
        warning:  { bg: '#fef7e0', icon: '#b05e00' },
        danger:   { bg: '#fce8e6', icon: '#c5221f' },
        info:     { bg: '#e3f2fd', icon: '#0277bd' },
    };

    const colors = colorMap[color] ?? colorMap.primary;

    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <span className="text-muted" style={{ fontSize: 13 }}>{title}</span>
                    {Icon && (
                        <div
                            className="rounded-2 d-flex align-items-center justify-content-center"
                            style={{ width: 36, height: 36, background: colors.bg }}
                        >
                            <Icon size={18} color={colors.icon} />
                        </div>
                    )}
                </div>
                {loading ? (
                    <div className="placeholder-glow">
                        <span className="placeholder col-5 rounded" style={{ height: 28 }} />
                    </div>
                ) : (
                    <div className="fw-bold" style={{ fontSize: 26 }}>{value ?? '—'}</div>
                )}
                {subtitle && (
                    <p className="text-muted mb-0 mt-1" style={{ fontSize: 12 }}>{subtitle}</p>
                )}
            </div>
        </div>
    );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="text-center py-5">
            {Icon && (
                <div className="mb-3">
                    <Icon size={48} className="text-muted opacity-50" />
                </div>
            )}
            <h6 className="text-muted">{title ?? 'No records found'}</h6>
            {description && (
                <p className="text-muted small">{description}</p>
            )}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

// ── ConfirmModal ─────────────────────────────────────────────────────────────
export function ConfirmModal({ show, title, message, onConfirm, onCancel, loading, variant = 'danger' }) {
    if (!show) return null;

    return (
        <>
            <div className="modal-backdrop fade show" />
            <div className="modal d-block" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h6 className="modal-title d-flex align-items-center gap-2">
                                <AlertTriangle size={16} className={`text-${variant}`} />
                                {title}
                            </h6>
                            <button className="btn-close" onClick={onCancel} disabled={loading} />
                        </div>
                        <div className="modal-body">
                            <p className="mb-0">{message}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-light" onClick={onCancel} disabled={loading}>
                                Cancel
                            </button>
                            <button
                                className={`btn btn-${variant}`}
                                onClick={onConfirm}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm me-2" />Processing...</>
                                ) : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', text }) {
    const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';
    return (
        <div className="d-flex align-items-center gap-2">
            <div className={`spinner-border text-primary ${sizeClass}`} role="status" />
            {text && <span className="text-muted">{text}</span>}
        </div>
    );
}

// ── ErrorAlert ────────────────────────────────────────────────────────────────
export function ErrorAlert({ error, onRetry }) {
    const message = error?.response?.data?.message ?? error?.message ?? 'An unexpected error occurred.';
    return (
        <div className="alert alert-danger d-flex align-items-start gap-3">
            <AlertTriangle size={18} className="flex-shrink-0 mt-1" />
            <div className="flex-grow-1">
                <strong>Error:</strong> {message}
            </div>
            {onRetry && (
                <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
}

// ── FormField ─────────────────────────────────────────────────────────────────
export function FormField({ label, error, required, children, hint }) {
    return (
        <div className="mb-3">
            {label && (
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                    {label} {required && <span className="text-danger">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <div className="form-text">{hint}</div>}
            {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
    );
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ meta, onPageChange }) {
    if (!meta || meta.last_page <= 1) return null;

    const { current_page, last_page } = meta;

    const pages = [];
    const delta = 2;
    for (let i = Math.max(1, current_page - delta); i <= Math.min(last_page, current_page + delta); i++) {
        pages.push(i);
    }

    return (
        <div className="d-flex align-items-center justify-content-between mt-3">
            <small className="text-muted">
                Page {current_page} of {last_page} &nbsp;·&nbsp; {meta.total} records
            </small>
            <nav>
                <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${current_page === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(current_page - 1)}>‹</button>
                    </li>
                    {pages.map(p => (
                        <li key={p} className={`page-item ${p === current_page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
                        </li>
                    ))}
                    <li className={`page-item ${current_page === last_page ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(current_page + 1)}>›</button>
                    </li>
                </ul>
            </nav>
        </div>
    );
}