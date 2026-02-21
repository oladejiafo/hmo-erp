/**
 * FILE LOCATION: resources/js/pages/auth/LoginPage.jsx
 *
 * Login page — rendered inside AuthLayout at GET /login.
 *
 * AuthContext.login() return values:
 *   { requires_2fa: true }              → show OTP input
 *   { requires_2fa: false, success: true } → navigate to intended URL
 *   throws Error                         → show error toast + validation errors
 *
 * IMPORTANT: This component is rendered inside AuthLayout which provides
 * the card wrapper and HMO ERP branding. Do NOT add your own card here.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
    const { login }   = useAuth();
    const navigate    = useNavigate();
    const location    = useLocation();

    const [showPass, setShowPass]       = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [submitting, setSubmitting]   = useState(false);
    const [errors, setErrors]           = useState({});
    const [formData, setFormData]       = useState({ email: '', password: '', otp: '' });

    // Redirect target after login (defaults to dashboard)
    const from = location.state?.from?.pathname ?? '/';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field-level error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        try {
            const result = await login(
                formData.email,
                formData.password,
                requires2FA ? formData.otp : null
            );

            if (result?.requires_2fa) {
                setRequires2FA(true);
                toast.info('Enter your 6-digit authenticator code.');
                return;
            }

            // success:true is returned by our AuthContext after successful login
            if (result?.success) {
                toast.success('Login successful. Welcome back!');
                navigate(from, { replace: true });
                return;
            }

            // Fallback: if result doesn't have success flag but no error thrown,
            // the login still worked (user state was set in AuthContext)
            toast.success('Login successful. Welcome back!');
            navigate(from, { replace: true });

        } catch (err) {
            const responseErrors = err.response?.data?.errors ?? {};

            // Map backend validation errors to field-level state
            setErrors(responseErrors);

            // Show a general toast if there's no field-specific error
            if (!Object.keys(responseErrors).length) {
                toast.error(
                    err.response?.data?.message ?? 'Login failed. Please try again.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <h5 className="fw-bold mb-1">
                {requires2FA ? 'Two-Factor Authentication' : 'Sign In'}
            </h5>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                {requires2FA
                    ? 'Enter the 6-digit code from your authenticator app.'
                    : 'Enter your credentials to access the system.'}
            </p>

            <form onSubmit={handleSubmit} noValidate>
                {!requires2FA ? (
                    <>
                        {/* Email */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                            />
                            {errors.email && (
                                <div className="invalid-feedback">
                                    {Array.isArray(errors.email) ? errors.email[0] : errors.email}
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                                Password
                            </label>
                            <div className="input-group">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    name="password"
                                    className={`form-control border-end-0 ${errors.password ? 'is-invalid' : ''}`}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Your password"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowPass(p => !p)}
                                    tabIndex={-1}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                {errors.password && (
                                    <div className="invalid-feedback">
                                        {Array.isArray(errors.password) ? errors.password[0] : errors.password}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    /* OTP step */
                    <div className="mb-4">
                        <div className="text-center mb-3">
                            <ShieldCheck size={40} className="text-primary mb-2" />
                        </div>
                        <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                            Authenticator Code
                        </label>
                        <input
                            type="text"
                            name="otp"
                            className={`form-control form-control-lg text-center font-monospace ${errors.otp ? 'is-invalid' : ''}`}
                            value={formData.otp}
                            onChange={handleChange}
                            placeholder="000 000"
                            maxLength={6}
                            autoComplete="one-time-code"
                            autoFocus
                        />
                        {errors.otp && (
                            <div className="invalid-feedback">
                                {Array.isArray(errors.otp) ? errors.otp[0] : errors.otp}
                            </div>
                        )}
                        <div className="mt-2 text-center">
                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0"
                                onClick={() => setRequires2FA(false)}
                            >
                                ← Back to login
                            </button>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={submitting}
                >
                    {submitting
                        ? <><span className="spinner-border spinner-border-sm me-2" role="status" />Signing in...</>
                        : requires2FA ? 'Verify Code' : 'Sign In'
                    }
                </button>
            </form>
        </>
    );
}