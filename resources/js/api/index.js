import apiClient from './client';

// ============= AUTH =============
export const login = (credentials) => apiClient.post('/auth/login', credentials);
export const logout = () => apiClient.post('/auth/logout');
export const logoutAll = () => apiClient.post('/auth/logout-all');
export const fetchUser = () => apiClient.get('/auth/me');
export const changePassword = (data) => apiClient.post('/auth/change-password', data);
export const setup2FA = () => apiClient.post('/auth/2fa/setup');
export const confirm2FA = (otp) => apiClient.post('/auth/2fa/confirm', { otp });
export const disable2FA = (otp) => apiClient.post('/auth/2fa/disable', { otp });

// ============= BRANCHES =============
export const fetchBranches = (params) => apiClient.get('/branches', { params });
export const fetchBranch = (id) => apiClient.get(`/branches/${id}`);
export const createBranch = (data) => apiClient.post('/branches', data);
export const updateBranch = (id, data) => apiClient.put(`/branches/${id}`, data);
export const deleteBranch = (id) => apiClient.delete(`/branches/${id}`);
export const toggleBranchStatus = (id) => apiClient.patch(`/branches/${id}/status`);

// ============= CORPORATES =============
export const fetchCorporates = (params) => apiClient.get('/corporates', { params });
export const fetchCorporate = (id) => apiClient.get(`/corporates/${id}`);
export const createCorporate = (data) => apiClient.post('/corporates', data);
export const updateCorporate = (id, data) => apiClient.put(`/corporates/${id}`, data);
export const deleteCorporate = (id) => apiClient.delete(`/corporates/${id}`);
export const suspendCorporate = (id) => apiClient.patch(`/corporates/${id}/suspend`);
export const bulkUploadEnrollees = (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/corporates/${id}/bulk-upload-enrollees`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// ============= CORPORATE PLANS =============
export const fetchPlans = (corporateId, params) => 
    apiClient.get(`/corporates/${corporateId}/plans`, { params });
export const fetchPlan = (corporateId, planId) => 
    apiClient.get(`/corporates/${corporateId}/plans/${planId}`);
export const createPlan = (corporateId, data) => 
    apiClient.post(`/corporates/${corporateId}/plans`, data);
export const updatePlan = (corporateId, planId, data) => 
    apiClient.put(`/corporates/${corporateId}/plans/${planId}`, data);

// ============= CORPORATE INVOICES =============
export const fetchInvoices = (corporateId, params) => 
    apiClient.get(`/corporates/${corporateId}/invoices`, { params });
export const createInvoice = (corporateId, data) => 
    apiClient.post(`/corporates/${corporateId}/invoices`, data);
export const markInvoicePaid = (corporateId, invoiceId, data) => 
    apiClient.patch(`/corporates/${corporateId}/invoices/${invoiceId}/mark-paid`, data);

// ============= ENROLLEES =============
export const fetchEnrollees = (params) => apiClient.get('/enrollees', { params });

export const fetchEnrollee = (id) => apiClient.get(`/enrollees/${id}`);
export const createEnrollee = (data) => apiClient.post('/enrollees', data);
export const updateEnrollee = (id, data) => apiClient.put(`/enrollees/${id}`, data);
export const suspendEnrollee = (id) => apiClient.patch(`/enrollees/${id}/suspend`);
export const transferEnrollee = (id, data) => apiClient.post(`/enrollees/${id}/transfer`, data);
export const fetchEnrolleeClaims = (id, params) => 
    apiClient.get(`/enrollees/${id}/claims`, { params });
export const fetchEnrolleeCard = (id) => apiClient.get(`/enrollees/${id}/card`);
export const regenerateEnrolleeCard = (id) => apiClient.post(`/enrollees/${id}/regenerate-card`);
export const fetchEnrolleeBenefitSummary = (id) => apiClient.get(`/enrollees/${id}/benefit-summary`);

// ============= DEPENDENTS =============
export const fetchDependents = async (enrolleeId, params) => {
    const response = await apiClient.get(`/enrollees/${enrolleeId}/dependents`, { params });
    return response.data;
};

export const fetchDependent = async (enrolleeId, dependentId) => {
    const response = await apiClient.get(`/enrollees/${enrolleeId}/dependents/${dependentId}`);
    return response.data;  // This returns { data: dependent }
};
// export const fetchDependent = (id) => apiClient.get(`/enrollees/${enrolleeId}/dependents/${dependentId}`);
export const createDependent = async (enrolleeId, data) => {
    const response = await apiClient.post(`/enrollees/${enrolleeId}/dependents`, data);
    return response.data;
};

export const updateDependent = async (enrolleeId, dependentId, data) => {
    const response = await apiClient.put(`/enrollees/${enrolleeId}/dependents/${dependentId}`, data);
    return response.data;
};

export const deleteDependent = async (enrolleeId, dependentId) => {
    const response = await apiClient.delete(`/enrollees/${enrolleeId}/dependents/${dependentId}`);
    return response.data;
};
// ============= HCPs =============
export const fetchHCPs = (params) => apiClient.get('/hcps', { params });
export const fetchHCP = (id) => apiClient.get(`/hcps/${id}`);
export const createHCP = (data) => apiClient.post('/hcps', data);
export const updateHCP = (id, data) => apiClient.put(`/hcps/${id}`, data);
export const accreditHCP = (id, data) => apiClient.patch(`/hcps/${id}/accredit`, data);
export const blacklistHCP = (id, data) => apiClient.patch(`/hcps/${id}/blacklist`, data);
export const fetchHCPPerformance = (id) => apiClient.get(`/hcps/${id}/performance`);
export const fetchHCPPaymentHistory = (id, params) => 
    apiClient.get(`/hcps/${id}/payment-history`, { params });

// ============= HCP TARIFFS =============
export const fetchTariffs = (hcpId, params) => 
    apiClient.get(`/hcps/${hcpId}/tariffs`, { params });
export const createTariff = (hcpId, data) => 
    apiClient.post(`/hcps/${hcpId}/tariffs`, data);
export const bulkUploadTariffs = (hcpId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/hcps/${hcpId}/tariffs/bulk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const updateTariff = (hcpId, tariffId, data) => 
    apiClient.put(`/hcps/${hcpId}/tariffs/${tariffId}`, data);
export const deleteTariff = (hcpId, tariffId) => 
    apiClient.delete(`/hcps/${hcpId}/tariffs/${tariffId}`);

// ============= HCP CONTRACTS =============
export const fetchContracts = (hcpId, params) => 
    apiClient.get(`/hcps/${hcpId}/contracts`, { params });
export const fetchContract = (hcpId, contractId) => 
    apiClient.get(`/hcps/${hcpId}/contracts/${contractId}`);
export const createContract = (hcpId, data) => {
    if (data instanceof FormData) {
        return apiClient.post(`/hcps/${hcpId}/contracts`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
    return apiClient.post(`/hcps/${hcpId}/contracts`, data);
};

// ============= HCP BANK DETAILS =============
export const fetchBankDetails = (hcpId) => 
    apiClient.get(`/hcps/${hcpId}/bank-details`);
export const createBankDetail = (hcpId, data) => 
    apiClient.post(`/hcps/${hcpId}/bank-details`, data);
export const verifyBankDetail = (hcpId, bankDetailId) => 
    apiClient.patch(`/hcps/${hcpId}/bank-details/${bankDetailId}/verify`);
export const deleteBankDetail = (hcpId, bankDetailId) => 
    apiClient.delete(`/hcps/${hcpId}/bank-details/${bankDetailId}`);

// ============= CLAIMS =============
export const fetchClaims = (params) => apiClient.get('/claims', { params });
export const fetchClaim = (id) => apiClient.get(`/claims/${id}`);
export const createClaim = (data) => apiClient.post('/claims', data);
export const processClaim = (id, data) => apiClient.post(`/claims/${id}/process`, data);
export const approveClaim = (id) => apiClient.post(`/claims/${id}/approve`);
export const rejectClaim = (id, data) => apiClient.post(`/claims/${id}/reject`, data);
export const assignClaim = (id, data) => apiClient.post(`/claims/${id}/assign`, data);
export const reverseClaim = (id, data) => apiClient.post(`/claims/${id}/reverse`, data);
export const fetchClaimTimeline = (id) => apiClient.get(`/claims/${id}/timeline`);
export const fetchClaimFraudFlags = (id) => apiClient.get(`/claims/${id}/fraud-flags`);
export const reviewFraudFlag = (id, flagId, data) => 
    apiClient.patch(`/claims/${id}/fraud-flags/${flagId}/review`, data);

// ============= CLAIM DOCUMENTS =============
export const fetchClaimDocuments = (claimId) => 
    apiClient.get(`/claims/${claimId}/documents`);
export const uploadClaimDocument = (claimId, file, documentType, description) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    return apiClient.post(`/claims/${claimId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const downloadClaimDocument = (claimId, documentId) => 
    apiClient.get(`/claims/${claimId}/documents/${documentId}/download`, {
        responseType: 'blob'
    });

// ============= FINANCE =============
export const fetchPaymentBatches = (params) => apiClient.get('/finance/batches', { params });
export const fetchPaymentBatch = (id) => apiClient.get(`/finance/batches/${id}`);
export const createPaymentBatch = (data) => apiClient.post('/finance/batches', data);
export const submitPaymentBatch = (id) => apiClient.post(`/finance/batches/${id}/submit`);
export const approvePaymentBatch = (id, data) => 
    apiClient.post(`/finance/batches/${id}/approve`, data);
export const exportBankFile = (id) => apiClient.get(`/finance/batches/${id}/export`, {
    responseType: 'blob'
});

export const fetchLedger = (params) => apiClient.get('/finance/ledger', { params });
export const fetchLedgerSummary = (params) => apiClient.get('/finance/ledger/summary', { params });

export const generateRemittance = (paymentId) => 
    apiClient.post(`/finance/remittance/${paymentId}`);
export const downloadRemittance = (paymentId) => 
    apiClient.get(`/finance/remittance/${paymentId}/download`, {
        responseType: 'blob'
    });

// ============= REPORTS =============
export const fetchDashboard = () => apiClient.get('/reports/dashboard');
export const fetchClaimsAging = (params) => apiClient.get('/reports/claims-aging', { params });
export const fetchClaimsByHCP = (params) => apiClient.get('/reports/claims-by-hcp', { params });
export const fetchClaimsByType = (params) => apiClient.get('/reports/claims-by-type', { params });
export const fetchCostByCorporate = (params) => apiClient.get('/reports/cost-by-corporate', { params });
export const fetchHighCostEnrollees = (params) => apiClient.get('/reports/high-cost-enrollees', { params });

export const fetchBranchComparison = (params) => apiClient.get('/reports/branch-comparison', { params });
export const fetchFraudHeatmap = (params) => apiClient.get('/reports/fraud-heatmap', { params });

// ============= AUDIT LOGS =============
export const fetchAuditLogs = (params) => apiClient.get('/reports/audit-logs', { params });

// ============= USERS =============
export const fetchUsers = (params) => apiClient.get('/users', { params });
// export const fetchUser = (id) => apiClient.get(`/users/${id}`);
export const createUser = (data) => apiClient.post('/users', data);
export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data);
export const deleteUser = (id) => apiClient.delete(`/users/${id}`);
export const toggleUserStatus = (id) => apiClient.patch(`/users/${id}/status`);
export const assignUserRoles = (id, data) => apiClient.post(`/users/${id}/roles`, data);

// ============= ROLES & PERMISSIONS =============
export const fetchRoles = (params) => apiClient.get('/roles', { params });
export const fetchRole = (id) => apiClient.get(`/roles/${id}`);
export const fetchPermissions = () => apiClient.get('/permissions');
export const syncRolePermissions = (id, data) => 
    apiClient.put(`/roles/${id}/permissions`, data);

export default {
    // Auth
    login, logout, logoutAll, fetchUser, changePassword,
    setup2FA, confirm2FA, disable2FA,
    
    // Branches
    fetchBranches, fetchBranch, createBranch, updateBranch, deleteBranch, toggleBranchStatus,
    
    // Corporates
    fetchCorporates, fetchCorporate, createCorporate, updateCorporate, deleteCorporate,
    suspendCorporate, bulkUploadEnrollees,
    
    // Plans
    fetchPlans, fetchPlan, createPlan, updatePlan,
    
    // Invoices
    fetchInvoices, createInvoice, markInvoicePaid,
    
    // Enrollees
    fetchEnrollees, fetchEnrollee, createEnrollee, updateEnrollee, suspendEnrollee,
    transferEnrollee, fetchEnrolleeClaims, fetchEnrolleeCard, regenerateEnrolleeCard,
    fetchEnrolleeBenefitSummary,
    
    // Dependents
    fetchDependents, createDependent, updateDependent, deleteDependent,
    
    // HCPs
    fetchHCPs, fetchHCP, createHCP, updateHCP, accreditHCP, blacklistHCP,
    fetchHCPPerformance, fetchHCPPaymentHistory,
    
    // Tariffs
    fetchTariffs, createTariff, bulkUploadTariffs, updateTariff, deleteTariff,
    
    // Contracts
    fetchContracts, fetchContract, createContract,
    
    // Bank Details
    fetchBankDetails, createBankDetail, verifyBankDetail, deleteBankDetail,
    
    // Claims
    fetchClaims, fetchClaim, createClaim, processClaim, approveClaim, rejectClaim,
    assignClaim, reverseClaim, fetchClaimTimeline, fetchClaimFraudFlags, reviewFraudFlag,
    
    // Claim Documents
    fetchClaimDocuments, uploadClaimDocument, downloadClaimDocument,
    
    // Finance
    fetchPaymentBatches, fetchPaymentBatch, createPaymentBatch, submitPaymentBatch,
    approvePaymentBatch, exportBankFile, fetchLedger, fetchLedgerSummary,
    generateRemittance, downloadRemittance,
    
    // Reports
    fetchDashboard, fetchClaimsAging, fetchClaimsByHCP, fetchClaimsByType,
    fetchCostByCorporate, fetchHighCostEnrollees, fetchHCPPerformance,
    fetchBranchComparison, fetchFraudHeatmap,
    
    // Audit Logs
    fetchAuditLogs,
    
    // Users
    fetchUsers, fetchUser, createUser, updateUser, deleteUser,
    toggleUserStatus, assignUserRoles,
    
    // Roles
    fetchRoles, fetchRole, fetchPermissions, syncRolePermissions,
};
