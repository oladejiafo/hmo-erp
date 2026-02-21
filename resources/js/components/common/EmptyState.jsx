import React from 'react';

export default function EmptyState({ message, icon = '📭', action }) {
    return (
        <div className="text-center p-5">
            <div className="display-1 mb-3">{icon}</div>
            <p className="text-muted mb-3">{message}</p>
            {action && action}
        </div>
    );
}
