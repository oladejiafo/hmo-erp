import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Renders children only if the user has the required permission.
 * Shows an "Access Denied" card otherwise — does not redirect,
 * because the user is authenticated, just not authorised for this page.
 */
export default function PermissionRoute({ permission, children }) {
    const { hasPermission } = useAuth();

    if (!hasPermission(permission)) {
        return (
            <div className="container-fluid py-5">
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card border-danger">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-shield-x fs-1 text-danger mb-3 d-block"></i>
                                <h4 className="text-danger">Access Denied</h4>
                                <p className="text-muted">
                                    You do not have permission to view this page.
                                    Contact your administrator if you believe this is an error.
                                </p>
                                <small className="text-muted font-monospace">
                                    Required: <code>{permission}</code>
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return children;
}