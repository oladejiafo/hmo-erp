import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
    return (
        <div className="d-flex justify-content-between align-items-center mb-4">
            <div><h2 className="mb-1">{title}</h2>{subtitle && <p className="text-muted mb-0">{subtitle}</p>}</div>
            {actions && <div className="d-flex gap-2">{actions}</div>}
        </div>
    );
}
