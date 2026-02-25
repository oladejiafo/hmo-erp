export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 2,
    }).format(amount || 0);
};

export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
};

export const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
};

export const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
};

/**
 * Format currency in compact notation (e.g., 1.2M, 500K)
 */
export const compactCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    
    if (num >= 1_000_000_000) {
        return `₦${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
        return `₦${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `₦${(num / 1_000).toFixed(1)}K`;
    }
    return `₦${num.toFixed(0)}`;
};