import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { User, Mail, Phone, MapPin, Lock, Shield } from 'lucide-react';
import { changePassword } from '../../api/index';
import { PageHeader, LoadingSpinner } from '../../components/ui/index';

export default function ProfilePage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });
    const [errors, setErrors] = useState({});

    const changePasswordMutation = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success('Password changed successfully');
            setPasswordData({
                current_password: '',
                new_password: '',
                new_password_confirmation: '',
            });
            setErrors({});
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
            toast.error('Failed to change password');
        },
    });

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        changePasswordMutation.mutate(passwordData);
    };

    if (!user) return <LoadingSpinner />;

    return (
        <div>
            <PageHeader title="My Profile" subtitle="View and manage your account settings" />

            <div className="row">
                <div className="col-md-4">
                    {/* Profile Summary Card */}
                    <div className="card mb-4">
                        <div className="card-body text-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-block mb-3">
                                <User size={48} className="text-primary" />
                            </div>
                            <h4>{user.name}</h4>
                            <p className="text-muted mb-2">{user.email}</p>
                            <div className="d-flex justify-content-center gap-2 mb-3">
                                {user.roles?.map((role, index) => (
                                    <span key={index} className="badge bg-info">
                                        {role.display_name || role.name || role}
                                    </span>
                                ))}
                            </div>
                            <hr />
                            <div className="text-start">
                                <p className="mb-2">
                                    <Mail size={16} className="text-muted me-2" />
                                    {user.email}
                                </p>
                                <p className="mb-2">
                                    <Phone size={16} className="text-muted me-2" />
                                    {user.phone || 'Not provided'}
                                </p>
                                <p className="mb-2">
                                    <MapPin size={16} className="text-muted me-2" />
                                    {user.branch?.name || 'No branch assigned'}
                                </p>
                                <p className="mb-0">
                                    <Shield size={16} className="text-muted me-2" />
                                    2FA: {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2FA Status Card */}
                    <div className="card">
                        <div className="card-body">
                            <h6 className="card-title">Two-Factor Authentication</h6>
                            {user.two_factor_enabled ? (
                                <>
                                    <p className="text-success mb-2">✓ 2FA is enabled</p>
                                    <button className="btn btn-sm btn-outline-danger">
                                        Disable 2FA
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-muted mb-2">Enhance your account security</p>
                                    <button className="btn btn-sm btn-primary">
                                        Enable 2FA
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    {/* Tabs */}
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                <User size={16} className="me-1" />
                                Profile Information
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
                                onClick={() => setActiveTab('security')}
                            >
                                <Lock size={16} className="me-1" />
                                Security
                            </button>
                        </li>
                    </ul>

                    {/* Tab Content */}
                    {activeTab === 'profile' && (
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Profile Information</h5>
                            </div>
                            <div className="card-body">
                                <form>
                                    <div className="row mb-3">
                                        <label className="col-sm-3 col-form-label">Full Name</label>
                                        <div className="col-sm-9">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={user.name}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <div className="row mb-3">
                                        <label className="col-sm-3 col-form-label">Email</label>
                                        <div className="col-sm-9">
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={user.email}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <div className="row mb-3">
                                        <label className="col-sm-3 col-form-label">Phone</label>
                                        <div className="col-sm-9">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={user.phone || ''}
                                                placeholder="Not provided"
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <div className="row mb-3">
                                        <label className="col-sm-3 col-form-label">Branch</label>
                                        <div className="col-sm-9">
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={user.branch?.name || 'Not assigned'}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-sm-9 offset-sm-3">
                                            <button type="button" className="btn btn-primary" disabled>
                                                Edit Profile (Coming Soon)
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">Change Password</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePasswordSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Current Password</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.current_password ? 'is-invalid' : ''}`}
                                            name="current_password"
                                            value={passwordData.current_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                        {errors.current_password && (
                                            <div className="invalid-feedback">
                                                {errors.current_password[0]}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">New Password</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.new_password ? 'is-invalid' : ''}`}
                                            name="new_password"
                                            value={passwordData.new_password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                        {errors.new_password && (
                                            <div className="invalid-feedback">
                                                {errors.new_password[0]}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            name="new_password_confirmation"
                                            value={passwordData.new_password_confirmation}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={changePasswordMutation.isLoading}
                                    >
                                        {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
