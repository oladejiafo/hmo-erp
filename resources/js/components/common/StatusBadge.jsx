import React from 'react';

export default function StatusBadge({ status, type = 'default' }) {
    const getBadgeClass = () => {
        const statusMap = {
            'active': 'bg-success',
            'inactive': 'bg-secondary',
            'pending': 'bg-warning',
            'approved': 'bg-success',
            'rejected': 'bg-danger',
            'paid': 'bg-info',
            'submitted': 'bg-primary',
            'draft': 'bg-secondary',
            'suspended': 'bg-danger',
            'blacklisted': 'bg-dark',
        };
        
        return statusMap[status?.toLowerCase()] || 'bg-secondary';
    };

    return (
        <span className={`badge ${getBadgeClass()}`}>
            {status}
        </span>
    );
}
