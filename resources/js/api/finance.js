import apiClient from './client';

// Payment Batches
export const fetchPaymentBatches = async (params = {}) => {
    const response = await apiClient.get('/finance/batches', { params });
    return response.data;
};

export const fetchPaymentBatch = async (id) => {
    const response = await apiClient.get(`/finance/batches/${id}`);
    return response.data;
};

export const createPaymentBatch = async (data) => {
    const response = await apiClient.post('/finance/batches', data);
    return response.data;
};

export const submitPaymentBatch = async (id) => {
    const response = await apiClient.post(`/finance/batches/${id}/submit`);
    return response.data;
};

export const approvePaymentBatch = async (id, data = {}) => {
    const response = await apiClient.post(`/finance/batches/${id}/approve`, data);
    return response.data;
};

export const exportBankFile = async (id) => {
    const response = await apiClient.get(`/finance/batches/${id}/export`, {
        responseType: 'blob'
    });
    return response.data;
};

// Ledger
export const fetchLedger = async (params = {}) => {
    const response = await apiClient.get('/finance/ledger', { params });
    return response.data;
};

export const fetchLedgerSummary = async (params = {}) => {
    const response = await apiClient.get('/finance/ledger/summary', { params });
    return response.data;
};

// Remittance
export const generateRemittance = async (paymentId) => {
    const response = await apiClient.post(`/finance/remittance/${paymentId}`);
    return response.data;
};

export const downloadRemittance = async (paymentId) => {
    const response = await apiClient.get(`/finance/remittance/${paymentId}/download`, {
        responseType: 'blob'
    });
    return response.data;
};
