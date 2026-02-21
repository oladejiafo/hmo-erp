import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="d-flex align-items-center justify-content-center vh-100">
            <div className="text-center">
                <h1 className="display-1 fw-bold text-primary">404</h1>
                <h2 className="mb-3">Page Not Found</h2>
                <p className="text-muted mb-4">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <div className="d-flex justify-content-center gap-3">
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Go Back
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                    >
                        <Home size={18} className="me-1" />
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}
