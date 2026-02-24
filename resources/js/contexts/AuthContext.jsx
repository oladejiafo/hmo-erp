/**
 * FILE LOCATION: resources/js/contexts/AuthContext.jsx
 *
 * Global authentication state for the HMO ERP SPA.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState([]);
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [activeBranchId, setActiveBranchId] = useState(null);

    // ── Normalize Laravel Collections → plain JS arrays ─────────────────
    const normalizeCollection = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return Object.values(val);
        return [];
    };

    // ── Clear session (logout) ───────────────────────────────────────────
    const clearSession = useCallback(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setPermissions([]);
        setActiveBranchId(null);
    }, []);

    // ── Fetch current user ───────────────────────────────────────────────
    const fetchUser = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/auth/me');
            
            // Using the working pattern from old code
            const userData = response.data?.data || response.data?.user || response.data;
            if (!userData) {
                console.warn('fetchUser: no user data in response');
                return;
            }

            // Normalize permissions and roles (handle Spatie collections)
            if (userData.permissions) {
                userData.permissions = normalizeCollection(userData.permissions);
            }
            if (userData.roles) {
                userData.roles = normalizeCollection(userData.roles);
            }

            setUser(userData);
            
            // Extract permissions using the working pattern
            const perms = response.data?.data?.permissions || 
                         response.data?.permissions || 
                         userData.permissions || 
                         [];
            setPermissions(perms);

        } catch (error) {
            console.error('fetchUser error:', error);

            // Only clear token on 401 (expired/invalid token)
            if (error.response?.status === 401) {
                clearSession();
            }
        } finally {
            setLoading(false);
        }
    }, [clearSession]);

    // ── Listen for 401 events from client.js ─────────────────────────────
    useEffect(() => {
        const handleUnauthorized = () => {
            clearSession();
        };
        window.addEventListener('hmo:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('hmo:unauthorized', handleUnauthorized);
    }, [clearSession]);

    // ── Restore session on mount ─────────────────────────────────────────
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            setToken(storedToken);
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [fetchUser]);

    // ── Login ────────────────────────────────────────────────────────────
    const login = async (email, password, otp = null) => {
        try {
            const response = await apiClient.post('/auth/login', {
                email,
                password,
                otp,
            });
            
            console.log('Login response:', response.data);

            // Check if 2FA is required
            if (response.data.requires_2fa) {
                return { requires_2fa: true };
            }
            
            // ✅ NEW: Check if password change is required
            if (response.data.requires_password_change) {
                const { token, user } = response.data.data;
                
                // Normalize permissions/roles
                if (user.permissions) {
                    user.permissions = normalizeCollection(user.permissions);
                }
                if (user.roles) {
                    user.roles = normalizeCollection(user.roles);
                }
                
                localStorage.setItem('auth_token', token);
                setToken(token);
                setUser(user);
                setPermissions(user.permissions || []);
                
                return { 
                    requires_password_change: true,
                    token,
                    user 
                };
            }
            
            // Handle nested response format
            if (response.data.data && response.data.data.token) {
                const { token, user, permissions } = response.data.data;
                
                // Normalize permissions/roles
                if (user.permissions) {
                    user.permissions = normalizeCollection(user.permissions);
                }
                if (user.roles) {
                    user.roles = normalizeCollection(user.roles);
                }
                
                localStorage.setItem('auth_token', token);
                setToken(token);
                setUser(user);
                setPermissions(permissions || []);
                return { success: true };
            }
            
            // Fallback for direct response
            if (response.data.token) {
                const { token, user, permissions } = response.data;
                
                // Normalize permissions/roles
                if (user.permissions) {
                    user.permissions = normalizeCollection(user.permissions);
                }
                if (user.roles) {
                    user.roles = normalizeCollection(user.roles);
                }
                
                localStorage.setItem('auth_token', token);
                setToken(token);
                setUser(user);
                setPermissions(permissions || []);
                return { success: true };
            }
            
            return { error: 'Invalid response from server' };
            
        } catch (error) {
            console.error('Login error:', error);
            return {
                error: error.response?.data?.message || 'Login failed',
            };
        }
    };

    // ── ✅ NEW: Set initial password (first login) ────────────────────────
    const setInitialPassword = async (password) => {
        try {
            const response = await apiClient.post('/auth/set-initial-password', {
                password,
                password_confirmation: password,
            });
            
            // After setting password successfully, refresh user data
            await fetchUser();
            
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error('Set initial password error:', error);
            return {
                error: error.response?.data?.message || 'Failed to set password',
            };
        }
    };

    // ── Logout ───────────────────────────────────────────────────────────
    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearSession();
        }
    };

    // ── Permission helpers ───────────────────────────────────────────────
    const hasPermission = useCallback((permission) => {
        if (!permission) return true;
        return permissions.includes(permission);
    }, [permissions]);

    const hasAnyRole = useCallback((roles) => {
        if (!user?.roles) return false;
        return roles.some(role => user.roles.includes(role));
    }, [user]);

    const hasRole = useCallback((role) => {
        if (!user) return false;
        return (user.roles ?? []).includes(role);
    }, [user]);

    // ── HQ check ─────────────────────────────────────────────────────────
    const isHQ = useCallback(() => {
        if (!user) return false;
        return (
            user.branch?.type === 'HQ' ||
            hasAnyRole(['super_admin', 'hq_admin', 'hq_manager'])
        );
    }, [user, hasAnyRole]);

    // ── Portal type detection ────────────────────────────────────────────
    const portalType = useCallback(() => {
        if (!user) {
            console.log('portalType: No user, returning hmo');
            return 'hmo';
        }

        // Check explicit user_type if set (most reliable)
        if (user.user_type) {
            console.log('Found user_type:', user.user_type);
            if (user.user_type === 'corporate_user') {
                console.log('✓ Returning corporate portal');
                return 'corporate';
            }
            if (user.user_type === 'enrollee_user') {
                console.log('✓ Returning enrollee portal');
                return 'enrollee';
            }
        }
        
        // Fallback to role-based detection
        const roles = user.roles ?? [];
        console.log('Roles array:', roles);
        
        if (roles.length > 0) {
            if (roles.some(r => ['corporate_user', 'corporate_admin', 'corporate_hr'].includes(r))) {
                console.log('✓ Found corporate role, returning corporate');
                return 'corporate';
            }
            if (roles.some(r => ['enrollee_user', 'enrollee_self_service'].includes(r))) {
                console.log('✓ Found enrollee role, returning enrollee');
                return 'enrollee';
            }
        }
        
        console.log('✗ No portal-specific attributes found, defaulting to HMO');
        return 'hmo';
    }, [user]);

    // ── Branch switcher ──────────────────────────────────────────────────
    const getActiveBranch = useCallback(() => {
        return activeBranchId ?? user?.branch_id ?? null;
    }, [activeBranchId, user]);

    const value = {
        user,
        loading,
        permissions,
        token,
        login,
        logout,
        setInitialPassword, // ✅ NEW: Added this function
        hasPermission,
        hasAnyRole,
        hasRole,
        isHQ,
        portalType,
        activeBranchId,
        setActiveBranchId,
        getActiveBranch,
        refreshUser: fetchUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};