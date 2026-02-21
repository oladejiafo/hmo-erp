import React from 'react';

export default function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary me-2" role="status">
                <span className="visually-hidden">{text}</span>
            </div>
            <span>{text}</span>
        </div>
    );
}
