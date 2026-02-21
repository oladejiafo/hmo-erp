import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

/**
 * FormField — wraps any form input with a consistent label, hint, error display.
 *
 * Usage:
 *   <FormField label="Email" required error={errors.email?.message}>
 *     <input className="form-control" {...register('email')} />
 *   </FormField>
 *
 *   <FormField label="Notes" hint="Optional — max 500 characters.">
 *     <textarea className="form-control" />
 *   </FormField>
 *
 *   <FormField label="Select branch" tooltip="Branch determines data access scope.">
 *     <select className="form-select">...</select>
 *   </FormField>
 */
export default function FormField({
    label,
    error,
    required = false,
    children,
    hint,
    tooltip,
    className = '',
    labelClassName = '',
    inline = false,     // horizontal layout
    noMargin = false,
}) {
    if (inline) {
        return (
            <div className={`row align-items-start ${noMargin ? '' : 'mb-3'} ${className}`}>
                {label && (
                    <label className={`col-sm-4 col-form-label fw-semibold py-2 ${labelClassName}`}
                           style={{ fontSize: 13 }}>
                        {label}
                        {required && <span className="text-danger ms-1">*</span>}
                        {tooltip && <FieldTooltip text={tooltip} />}
                    </label>
                )}
                <div className="col-sm-8">
                    {children}
                    <FieldFeedback hint={hint} error={error} />
                </div>
            </div>
        );
    }

    return (
        <div className={`${noMargin ? '' : 'mb-3'} ${className}`}>
            {label && (
                <label className={`form-label fw-semibold d-flex align-items-center gap-1 ${labelClassName}`}
                       style={{ fontSize: 13 }}>
                    {label}
                    {required && <span className="text-danger">*</span>}
                    {tooltip && <FieldTooltip text={tooltip} />}
                </label>
            )}
            {children}
            <FieldFeedback hint={hint} error={error} />
        </div>
    );
}

/* Internal: hint + error display */
function FieldFeedback({ hint, error }) {
    if (error) {
        return (
            <div
                className="d-flex align-items-center gap-1 mt-1 text-danger"
                style={{ fontSize: 12 }}
            >
                <AlertCircle size={12} className="flex-shrink-0" />
                <span>{error}</span>
            </div>
        );
    }
    if (hint) {
        return (
            <div className="form-text text-muted" style={{ fontSize: 12 }}>
                {hint}
            </div>
        );
    }
    return null;
}

/* Internal: tooltip icon */
function FieldTooltip({ text }) {
    return (
        <span title={text} style={{ cursor: 'help' }}>
            <HelpCircle size={13} className="text-muted" />
        </span>
    );
}