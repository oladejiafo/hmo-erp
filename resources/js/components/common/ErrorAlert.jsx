import React from 'react';

export default function ErrorAlert({ message, onRetry }) {
    return (
        <div className="alert alert-danger" role="alert">
            <div className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <div className="flex-grow-1">
                    <strong>Error:</strong> {message}
                </div>
                {onRetry && (
                    <button 
                        className="btn btn-sm btn-outline-danger ms-3" 
                        onClick={onRetry}
                    >
                        Retry
                    </button>
                )}
            </div>
        </div>
    );
}
