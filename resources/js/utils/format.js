/**
 * FILE LOCATION: resources/js/utils/format.js
 *
 * CHANGE: formatCurrency() and compactCurrency() now read currency/locale
 * from window.__HMO_SETTINGS__ (populated by SettingsContext on boot)
 * instead of hard-coding NGN / ₦.
 *
 * All original functions preserved with same signatures.
 */

function getSettings() {
    return window.__HMO_SETTINGS__ || {
        currency_code:   'NGN',
        currency_symbol: '₦',
        locale:          'en-NG',
    };
}

/**
 * Format a number as the configured HMO currency.
 * Maintains backward compatibility with original signature.
 */
export const formatCurrency = (amount, showDecimals = true) => {
    if (amount == null || amount === '') return '';
    
    const { currency_code, locale } = getSettings();
    
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency_code,
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(amount || 0);
};

/**
 * Original formatDate - unchanged
 */
export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Original formatDateTime - unchanged
 */
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

/**
 * Original formatPhone - unchanged
 */
export const formatPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
};

/**
 * Original formatPercentage - unchanged
 */
export const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
};

/**
 * Original formatNumber - unchanged
 */
export const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
};

/**
 * Format currency in compact notation (e.g., 1.2M, 500K)
 * Now uses dynamic currency symbol from settings.
 */
export const compactCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    
    const { currency_symbol } = getSettings();
    
    if (num >= 1_000_000_000) {
        return `${currency_symbol}${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
        return `${currency_symbol}${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${currency_symbol}${(num / 1_000).toFixed(1)}K`;
    }
    return `${currency_symbol}${num.toFixed(0)}`;
};

// ============= NEW FUNCTIONS ADDED FROM UPGRADE =============

/**
 * Format a date string for display using configured locale.
 * e.g. '2024-01-15' → '15 Jan 2024'
 */
export const formatDateWithLocale = (dateStr) => {
    if (!dateStr) return '-';
    const { locale } = getSettings();
    return new Date(dateStr).toLocaleDateString(locale, {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
    });
};

/**
 * Format a datetime ISO string using configured locale.
 * e.g. '2024-01-15T09:32:00Z' → '15 Jan 2024, 09:32'
 */
export const formatDateTimeWithLocale = (isoStr) => {
    if (!isoStr) return '-';
    const { locale } = getSettings();
    return new Date(isoStr).toLocaleString(locale, {
        day:    '2-digit',
        month:  'short',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
    });
};

/**
 * Return relative time, e.g. "3 days ago", "in 2 hours".
 */
export const timeAgo = (isoStr) => {
    if (!isoStr) return '-';
    const diff    = Date.now() - new Date(isoStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours   = Math.floor(diff / 3600000);
    const days    = Math.floor(diff / 86400000);

    if (minutes < 1)  return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24)   return `${hours}h ago`;
    if (days < 7)     return `${days}d ago`;
    return formatDate(isoStr);
};

/**
 * Truncate long strings with ellipsis.
 */
export const truncate = (str, max = 50) => {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
};

/**
 * Convert a claim status key to a human label.
 */
export const statusLabel = (status) => {
    const map = {
        submitted:         'Submitted',
        auto_validating:   'Validating',
        auto_validated:    'Validated',
        flagged:           'Flagged',
        under_review:      'Under Review',
        supervisor_review: 'Supervisor Review',
        approved:          'Approved',
        paid:              'Paid',
        rejected:          'Rejected',
        reversed:          'Reversed',
    };
    return map[status] ?? status;
};