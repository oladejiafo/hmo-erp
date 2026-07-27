import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const { forgotPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            await forgotPassword(email);
            setSent(true);
            toast.success('Password reset instructions sent to your email.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reset email.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <h5 className="fw-bold mb-1">Forgot Password</h5>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                {sent 
                    ? 'Check your email for reset instructions.' 
                    : 'Enter your email and we\'ll send you a link to reset your password.'}
            </p>

            {!sent ? (
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                            Email Address
                        </label>
                        <div className="input-group">
                            <span className="input-group-text bg-white">
                                <Mail size={16} className="text-muted" />
                            </span>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={submitting}
                    >
                        {submitting ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
            ) : (
                <div className="text-center">
                    <p className="text-success mb-3">✓ Reset link sent!</p>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setSent(false)}
                    >
                        Try another email
                    </button>
                </div>
            )}

            <div className="text-center mt-3">
                <Link to="/login" className="text-decoration-none small">
                    <ArrowLeft size={12} className="me-1" /> Back to login
                </Link>
            </div>
        </>
    );
}