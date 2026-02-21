import React from 'react';

export default function EmptyState({ message, icon, action }) {
    return (
        <div className="text-center p-5">
            <div className="display-1 mb-3 text-muted">
                {icon}
            </div>
            <p className="text-muted mb-3">{message}</p>
            {action && <div>{action}</div>}
        </div>
    );
}
