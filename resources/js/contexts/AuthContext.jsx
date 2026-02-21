import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/auth/me');
    
            // Null-guard for malformed response
            const userData = response.data?.data || response.data?.user || response.data;
            if (!userData) {
                console.warn('fetchUser: no user data in response');
                return;
            }
    
            setUser(userData);
            const perms = response.data?.data?.permissions || response.data?.permissions || [];
            setPermissions(perms);
    
        } catch (error) {
            console.error('fetchUser error:', error);
    
            // Only clear token on 401 (expired/invalid token)
            if (error.response?.status === 401) {
                localStorage.removeItem('auth_token');
                setUser(null);
                setPermissions([]);
            }
    
            // 5xx, network errors, etc → token remains, user stays logged in
        } finally {
            setLoading(false);
        }
    };
    

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
            
            // Handle your specific response format: { message: '...', data: { token, user, permissions } }
            if (response.data.data && response.data.data.token) {
                const { token, user, permissions } = response.data.data;
                localStorage.setItem('auth_token', token);
                setUser(user);
                setPermissions(permissions || []);
                return { success: true };
            }
            
            // Fallback for direct response
            if (response.data.token) {
                localStorage.setItem('auth_token', response.data.token);
                console.log('Token extracted:', response.data.token);
                setUser(response.data.user);
                setPermissions(response.data.permissions || []);
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

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('auth_token');
            setUser(null);
            setPermissions([]);
        }
    };

    const hasPermission = (permission) => {
        if (!permission) return true;
        return permissions.includes(permission);
    };

    const hasAnyRole = (roles) => {
        if (!user?.roles) return false;
        return roles.some(role => user.roles.includes(role));
    };

    const isHQ = () => {
        return user?.branch?.type === 'HQ' || hasAnyRole(['super_admin', 'hq_admin']);
    };

    const value = {
        user,
        loading,
        permissions,
        login,
        logout,
        hasPermission,
        hasAnyRole,
        isHQ,
        fetchUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
