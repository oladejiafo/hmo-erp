// resources/js/pages/auth/SetInitialPasswordPage.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Shield } from 'lucide-react';

export default function SetInitialPasswordPage() {
    const { setInitialPassword } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        
        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        
        setSubmitting(true);
        const result = await setInitialPassword(password);
        
        if (result.success) {
            toast.success('Password set successfully!');
            navigate('/'); // Redirect to appropriate portal
        } else {
            toast.error(result.error);
        }
        setSubmitting(false);
    };

    return (
        <div className="login-container">
            <div className="login-card p-4">
                <div className="text-center mb-4">
                    <Shield size={48} className="text-primary mb-2" />
                    <h4>Set Your Password</h4>
                    <p className="text-muted">
                        This is your first login. Please set a new password to continue.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            minLength={8}
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={submitting}
                    >
                        {submitting ? 'Setting password...' : 'Set Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}