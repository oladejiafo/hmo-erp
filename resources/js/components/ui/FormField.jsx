import React from 'react';

export default function FormField({ label, name, type = 'text', value, onChange, error, placeholder, required = false, disabled = false, options = [], rows = 3 }) {
    const id = `field-${name}`;
    
    const input = () => {
        if (type === 'select') {
            return <select id={id} name={name} value={value || ''} onChange={onChange} disabled={disabled} required={required} className={`form-select ${error ? 'is-invalid' : ''}`}>
                <option value="">Select {label}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>;
        }
        if (type === 'textarea') {
            return <textarea id={id} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} disabled={disabled} required={required} rows={rows} className={`form-control ${error ? 'is-invalid' : ''}`} />;
        }
        return <input type={type} id={id} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} disabled={disabled} required={required} className={`form-control ${error ? 'is-invalid' : ''}`} />;
    };

    return (
        <div className="mb-3">
            <label htmlFor={id} className="form-label">{label}{required && <span className="text-danger ms-1">*</span>}</label>
            {input()}
            {error && <div className="invalid-feedback d-block">{error}</div>}
        </div>
    );
}
