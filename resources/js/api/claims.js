import apiClient from './client';

export const fetchClaims = async (params = {}) => {
    const response = await apiClient.get('/claims', { params });
    return response.data;
};

export const fetchClaim = async (id) => {
    const response = await apiClient.get(`/claims/${id}`);
    return response.data;
};

export const createClaim = async (data) => {
    const response = await apiClient.post('/claims', data);
    return response.data;
};

export const updateClaim = async (id, data) => {
    const response = await apiClient.put(`/claims/${id}`, data);
    return response.data;
};

export const deleteClaim = async (id) => {
    const response = await apiClient.delete(`/claims/${id}`);
    return response.data;
};

export const approveClaim = async (id) => {
    const response = await apiClient.post(`/claims/${id}/approve`);
    return response.data;
};

export const rejectClaim = async (id, reason) => {
    const response = await apiClient.post(`/claims/${id}/reject`, { reason });
    return response.data;
};

export const processClaim = async (id, data) => {
    const response = await apiClient.post(`/claims/${id}/process`, data);
    return response.data;
};

export const assignClaim = async (id, userId) => {
    const response = await apiClient.post(`/claims/${id}/assign`, { user_id: userId });
    return response.data;
};

export const reverseClaim = async (id, reason) => {
    const response = await apiClient.post(`/claims/${id}/reverse`, { reason });
    return response.data;
};

export const fetchClaimTimeline = async (id) => {
    const response = await apiClient.get(`/claims/${id}/timeline`);
    return response.data;
};

export const fetchClaimFraudFlags = async (id) => {
    const response = await apiClient.get(`/claims/${id}/fraud-flags`);
    return response.data;
};

export const reviewFraudFlag = async (id, flagId, data) => {
    const response = await apiClient.patch(`/claims/${id}/fraud-flags/${flagId}/review`, data);
    return response.data;
};

export const fetchClaimDocuments = async (claimId) => {
    const response = await apiClient.get(`/claims/${claimId}/documents`);
    return response.data;
};

export const uploadClaimDocument = async (claimId, file, documentType, description = '') => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    formData.append('description', description);
    const response = await apiClient.post(`/claims/${claimId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const downloadClaimDocument = async (claimId, documentId) => {
    const response = await apiClient.get(`/claims/${claimId}/documents/${documentId}/download`, {
        responseType: 'blob'
    });
    return response.data;
};
