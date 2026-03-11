import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { User, Mail, Phone, MapPin, Lock, Shield, Save, X } from 'lucide-react';
import { changePassword, updateProfile } from '../../api/index';
import { PageHeader, LoadingSpinner } from '../../components/ui/index';

export default function ProfilePage() {
    const { user, setUser } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);

    const [profileData, setProfileData] = useState({
        name:  user?.name  || '',
        phone: user?.phone || '',
    });

    const [passwordData, setPasswordData] = useState({
        current_password:          '',
        new_password:              '',
        new_password_confirmation: '',
    });
    const [errors, setErrors] = useState({});

    // --- Profile update mutation ---
    const updateProfileMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (response) => {
            // Update auth context if your context exposes setUser
            if (setUser) {
                setUser(prev => ({ ...prev, ...response.data?.data }));
            }
            queryClient.invalidateQueries(['me']);
            toast.success('Profile updated successfully');
            setIsEditing(false);
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
            toast.error(error.response?.data?.message || 'Failed to update profile');
        },
    });

    // --- Password change mutation ---
    const changePasswordMutation = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success('Password changed successfully');
            setPasswordData({
                current_password:          '',
                new_password:              '',
                new_password_confirmation: '',
            });
            setErrors({});
        },
        onError: (error) => {
            setErrors(error.response?.data?.errors || {});
            toast.error(error.response?.data?.message || 'Failed to change password');
        },
    });

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        updateProfileMutation.mutate(profileData);
    };

    const handleCancelEdit = () => {
        setProfileData({ name: user?.name || '', phone: user?.phone || '' });
        setErrors({});
        setIsEditing(false);
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        changePasswordMutation.mutate(passwordData);
    };

    if (!user) return <LoadingSpinner />;

    return (
        <div>
            <PageHeader title="My Profile" subtitle="View and manage your account settings" />

            <div className="row">
                <div className="col-md-4">
                    <div className="card mb-4">
                        <div className="card-body text-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-block mb-3">
                                <User size={48} className="text-primary" />
                            </div>
                            <h4>{user.name}</h4>
                            <p className="text-muted mb-2">{user.email}</p>
                            <div className="d-flex justify-content-center gap-2 mb-3 flex-wrap">
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
                </div>

                <div className="col-md-8">
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

                    {activeTab === 'profile' && (
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">Profile Information</h5>
                                {!isEditing && (
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleProfileSubmit}>
                                    <div className="row mb-3">
                                        <label className="col-sm-3 col-form-label">Full Name</label>
                                        <div className="col-sm-9">
                                            <input
                                                type="text"
                                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                name="name"
                                                value={isEditing ? profileData.name : user.name}
                                                onChange={handleProfileChange}
                                                readOnly={!isEditing}
                                                disabled={!isEditing}
                                            />
                                            {errors.name && (
                                                <div className="invalid-feedback">{errors.name[0]}</div>
                                            )}
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
                                            <small className="text-muted">Email can only be changed by an admin.</small>
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <label className="col-sm-3 col-form-label">Phone</label>
                                        <div className="col-sm-9">
                                            <input
                                                type="text"
                                                className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                                name="phone"
                                                value={isEditing ? profileData.phone : (user.phone || '')}
                                                onChange={handleProfileChange}
                                                placeholder="Not provided"
                                                readOnly={!isEditing}
                                                disabled={!isEditing}
                                            />
                                            {errors.phone && (
                                                <div className="invalid-feedback">{errors.phone[0]}</div>
                                            )}
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

                                    {isEditing && (
                                        <div className="col-sm-9 offset-sm-3 d-flex gap-2">
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={updateProfileMutation.isPending}
                                            >
                                                <Save size={16} className="me-1" />
                                                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={handleCancelEdit}
                                            >
                                                <X size={16} className="me-1" />
                                                Cancel
                                            </button>
                                        </div>
                                    )}
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
                                            <div className="invalid-feedback">{errors.current_password[0]}</div>
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
                                            <div className="invalid-feedback">{errors.new_password[0]}</div>
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
                                        disabled={changePasswordMutation.isPending}
                                    >
                                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
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