import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showPass, setShowPass] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        otp: ''
    });
    const [errors, setErrors] = useState({});

    const from = location.state?.from?.pathname || '/';

    // If already logged in, redirect to dashboard
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            const result = await login(formData.email, formData.password, formData.otp || null);

            if (result?.requires_2fa) {
                setRequires2FA(true);
                toast.info('Enter your 6-digit authenticator code.');
                setSubmitting(false);
                return;
            }

            if (result?.success) {
                toast.success('Login successful!');
                navigate(from, { replace: true });
            } else if (result?.error) {
                toast.error(result.error);
            }
        } catch (err) {
            console.error('Login error:', err);
            const responseErrors = err.response?.data?.errors ?? {};
            setErrors(responseErrors);
            
            if (!Object.keys(responseErrors).length) {
                toast.error(err.response?.data?.message || 'Login failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card p-4">
                <h4 className="text-center mb-4">
                    {requires2FA ? 'Two-Factor Authentication' : 'HMO ERP Login'}
                </h4>
                
                {!requires2FA ? (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            {errors.email && (
                                <div className="invalid-feedback">{errors.email[0]}</div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Password</label>
                            <div className="input-group">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    name="password"
                                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowPass(!showPass)}
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <div className="invalid-feedback d-block">{errors.password[0]}</div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                            disabled={submitting}
                        >
                            {submitting ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="text-center mb-4">
                            <ShieldCheck size={48} className="text-primary mb-2" />
                            <p>Enter the 6-digit code from your authenticator app</p>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                name="otp"
                                className={`form-control form-control-lg text-center ${errors.otp ? 'is-invalid' : ''}`}
                                value={formData.otp}
                                onChange={handleChange}
                                placeholder="000000"
                                maxLength={6}
                                autoFocus
                            />
                            {errors.otp && (
                                <div className="invalid-feedback text-center">{errors.otp[0]}</div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-100 mb-2"
                            disabled={submitting}
                        >
                            {submitting ? 'Verifying...' : 'Verify Code'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-link w-100"
                            onClick={() => setRequires2FA(false)}
                        >
                            Back to login
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
