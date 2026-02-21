import apiClient from './client';

export const fetchEnrollees = async (params = {}) => {
    const response = await apiClient.get('/enrollees', { params });
    return response.data;
};

export const fetchEnrollee = async (id) => {
    const response = await apiClient.get(`/enrollees/${id}`);
    return response.data;
};

export const createEnrollee = async (data) => {
    const response = await apiClient.post('/enrollees', data);
    return response.data;
};

export const updateEnrollee = async (id, data) => {
    const response = await apiClient.put(`/enrollees/${id}`, data);
    return response.data;
};

export const deleteEnrollee = async (id) => {
    const response = await apiClient.delete(`/enrollees/${id}`);
    return response.data;
};
