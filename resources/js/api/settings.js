import apiClient from './client';

// Users
export const fetchUsers = async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
};

export const fetchUser = async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
};

export const createUser = async (data) => {
    const response = await apiClient.post('/users', data);
    return response.data;
};

export const updateUser = async (id, data) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
};

export const deleteUser = async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
};

export const toggleUserStatus = async (id) => {
    const response = await apiClient.patch(`/users/${id}/status`);
    return response.data;
};

export const assignUserRoles = async (id, roles) => {
    const response = await apiClient.post(`/users/${id}/roles`, { roles });
    return response.data;
};

// Roles & Permissions
export const fetchRoles = async (params = {}) => {
    const response = await apiClient.get('/roles', { params });
    return response.data;
};

export const fetchRole = async (id) => {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
};

export const fetchPermissions = async () => {
    const response = await apiClient.get('/permissions');
    return response.data;
};

export const syncRolePermissions = async (id, permissions) => {
    const response = await apiClient.put(`/roles/${id}/permissions`, { permissions });
    return response.data;
};
