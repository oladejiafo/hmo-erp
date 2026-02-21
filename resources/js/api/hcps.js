import apiClient from './client';

export const fetchHCPs = async (params = {}) => {
    const response = await apiClient.get('/hcps', { params });
    return response.data;
};

export const fetchHCP = async (id) => {
    const response = await apiClient.get(`/hcps/${id}`);
    return response.data;
};

export const createHCP = async (data) => {
    const response = await apiClient.post('/hcps', data);
    return response.data;
};

export const updateHCP = async (id, data) => {
    const response = await apiClient.put(`/hcps/${id}`, data);
    return response.data;
};

export const deleteHCP = async (id) => {
    const response = await apiClient.delete(`/hcps/${id}`);
    return response.data;
};

export const accreditHCP = async (id, data = {}) => {
    const response = await apiClient.patch(`/hcps/${id}/accredit`, data);
    return response.data;
};

export const blacklistHCP = async (id, data) => {
    const response = await apiClient.patch(`/hcps/${id}/blacklist`, data);
    return response.data;
};

export const fetchHCPPerformance = async (id) => {
    const response = await apiClient.get(`/hcps/${id}/performance`);
    return response.data;
};

export const fetchHCPPaymentHistory = async (id, params = {}) => {
    const response = await apiClient.get(`/hcps/${id}/payment-history`, { params });
    return response.data;
};

// Tariffs
export const fetchTariffs = async (hcpId, params = {}) => {
    const response = await apiClient.get(`/hcps/${hcpId}/tariffs`, { params });
    return response.data;
};

export const addTariff = async (hcpId, data) => {
    const response = await apiClient.post(`/hcps/${hcpId}/tariffs`, data);
    return response.data;
};

export const updateTariff = async (hcpId, tariffId, data) => {
    const response = await apiClient.put(`/hcps/${hcpId}/tariffs/${tariffId}`, data);
    return response.data;
};

export const deleteTariff = async (hcpId, tariffId) => {
    const response = await apiClient.delete(`/hcps/${hcpId}/tariffs/${tariffId}`);
    return response.data;
};

export const bulkUploadTariffs = async (hcpId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/hcps/${hcpId}/tariffs/bulk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Contracts
export const fetchContracts = async (hcpId, params = {}) => {
    const response = await apiClient.get(`/hcps/${hcpId}/contracts`, { params });
    return response.data;
};

export const fetchContract = async (hcpId, contractId) => {
    const response = await apiClient.get(`/hcps/${hcpId}/contracts/${contractId}`);
    return response.data;
};


export const createContract = async (hcpId, data) => {
    let response;
    if (data instanceof FormData) {
        response = await apiClient.post(`/hcps/${hcpId}/contracts`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    } else {
        response = await apiClient.post(`/hcps/${hcpId}/contracts`, data);
    }
    return response.data;
};

// Bank Details
export const fetchBankDetails = async (hcpId) => {
    const response = await apiClient.get(`/hcps/${hcpId}/bank-details`);
    return response.data;
};

export const createBankDetail = async (hcpId, data) => {
    const response = await apiClient.post(`/hcps/${hcpId}/bank-details`, data);
    return response.data;
};

export const verifyBankDetail = async (hcpId, bankDetailId) => {
    const response = await apiClient.patch(`/hcps/${hcpId}/bank-details/${bankDetailId}/verify`);
    return response.data;
};

export const deleteBankDetail = async (hcpId, bankDetailId) => {
    const response = await apiClient.delete(`/hcps/${hcpId}/bank-details/${bankDetailId}`);
    return response.data;
};
