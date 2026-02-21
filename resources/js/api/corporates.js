import apiClient from './client';

export const fetchCorporates = async (params = {}) => {
    const response = await apiClient.get('/corporates', { params });
    return response.data;
};

export const fetchCorporate = async (id) => {
    const response = await apiClient.get(`/corporates/${id}`);
    return response.data;
};

export const createCorporate = async (data) => {
    const response = await apiClient.post('/corporates', data);
    return response.data;
};

export const updateCorporate = async (id, data) => {
    const response = await apiClient.put(`/corporates/${id}`, data);
    return response.data;
};

export const deleteCorporate = async (id) => {
    const response = await apiClient.delete(`/corporates/${id}`);
    return response.data;
};

export const suspendCorporate = async (id) => {
    const response = await apiClient.patch(`/corporates/${id}/suspend`);
    return response.data;
};

export const bulkUploadEnrollees = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/corporates/${id}/bulk-upload-enrollees`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Corporate Plans
export const fetchPlans = async (corporateId, params = {}) => {
    const response = await apiClient.get(`/corporates/${corporateId}/plans`, { params });
    return response.data;
};

export const fetchPlan = async (corporateId, planId) => {
    const response = await apiClient.get(`/corporates/${corporateId}/plans/${planId}`);
    return response.data;
};

export const createPlan = async (corporateId, data) => {
    const response = await apiClient.post(`/corporates/${corporateId}/plans`, data);
    return response.data;
};

export const updatePlan = async (corporateId, planId, data) => {
    const response = await apiClient.put(`/corporates/${corporateId}/plans/${planId}`, data);
    return response.data;
};

// Corporate Invoices
export const fetchInvoices = async (corporateId, params = {}) => {
    const response = await apiClient.get(`/corporates/${corporateId}/invoices`, { params });
    return response.data;
};

export const createInvoice = async (corporateId, data) => {
    const response = await apiClient.post(`/corporates/${corporateId}/invoices`, data);
    return response.data;
};

export const markInvoicePaid = async (corporateId, invoiceId, data) => {
    const response = await apiClient.patch(`/corporates/${corporateId}/invoices/${invoiceId}/mark-paid`, data);
    return response.data;
};
