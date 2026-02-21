import apiClient from './client';

export const fetchDashboard = async () => {
    const response = await apiClient.get('/reports/dashboard');
    return response.data;
};

export const fetchClaimsAging = async (params = {}) => {
    const response = await apiClient.get('/reports/claims-aging', { params });
    return response.data;
};

export const fetchClaimsByHCP = async (params = {}) => {
    const response = await apiClient.get('/reports/claims-by-hcp', { params });
    return response.data;
};

export const fetchClaimsByType = async (params = {}) => {
    const response = await apiClient.get('/reports/claims-by-type', { params });
    return response.data;
};

export const fetchCostByCorporate = async (params = {}) => {
    const response = await apiClient.get('/reports/cost-by-corporate', { params });
    return response.data;
};

export const fetchHighCostEnrollees = async (params = {}) => {
    const response = await apiClient.get('/reports/high-cost-enrollees', { params });
    return response.data;
};

export const fetchHCPPerformance = async (params = {}) => {
    const response = await apiClient.get('/reports/hcp-performance', { params });
    return response.data;
};

export const fetchBranchComparison = async (params = {}) => {
    const response = await apiClient.get('/reports/branch-comparison', { params });
    return response.data;
};

export const fetchFraudHeatmap = async (params = {}) => {
    const response = await apiClient.get('/reports/fraud-heatmap', { params });
    return response.data;
};

export const fetchAuditLogs = async (params = {}) => {
    const response = await apiClient.get('/reports/audit-logs', { params });
    return response.data;
};
