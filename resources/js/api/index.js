import apiClient from './client';

// ============= AUTH =============
export const login = (credentials) => apiClient.post('/auth/login', credentials);
export const logout = () => apiClient.post('/auth/logout');
export const logoutAll = () => apiClient.post('/auth/logout-all');
export const fetchUser = () => apiClient.get('/auth/me');
// export const changePassword = (data) => apiClient.post('/auth/change-password', data);
export const setup2FA = () => apiClient.post('/auth/2fa/setup');
export const confirm2FA = (otp) => apiClient.post('/auth/2fa/confirm', { otp });
export const disable2FA = (otp) => apiClient.post('/auth/2fa/disable', { otp });

// ============= 🆕 PUBLIC =============
export const fetchRetailPlans = () =>
    apiClient.get('/join/plans').then(r => r.data);

export const estimateRetailPremium = (data) =>
    apiClient.post('/join/estimate', data).then(r => r.data);

export const registerRetailEnrollee = (data) =>
    apiClient.post('/join/register', data).then(r => r.data);

export const confirmRetailPayment = (data) =>
    apiClient.post('/join/payment-return', data).then(r => r.data);


// ============= 🆕 SYSTEM SETTINGS =============
export const updateProfile  = (data) => client.patch('/profile', data).then(r => r.data);
export const changePassword = (data) => client.post('/profile/password', data).then(r => r.data);

export const fetchSystemSettings = () => 
    apiClient.get('/settings/system').then(r => r.data);

export const updateSystemSettings = (data) => 
    apiClient.put('/settings/system', data).then(r => r.data);

export const updateSystemSetting = (key, value) => 
    apiClient.put(`/settings/system/${key}`, { value }).then(r => r.data);

export const resetSystemSetting = (key) => 
    apiClient.post(`/settings/system/reset/${key}`).then(r => r.data);

export const fetchPublicSettings = () => 
    apiClient.get('/settings/system/public').then(r => r.data);

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
// export const suspendCorporate = (id) => apiClient.patch(`/corporates/${id}/suspend`);
export const suspendCorporate = (id, data = {}) => apiClient.patch(`/corporates/${id}/suspend`, data);
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
export const discontinuePlan = (corporateId, planId) => 
    apiClient.patch(`/corporates/${corporateId}/plans/${planId}/discontinue`);
export const duplicatePlan = (corporateId, planId, data) => 
    apiClient.post(`/corporates/${corporateId}/plans/${planId}/duplicate`, data);
export const syncBenefitItems = (corporateId, planId, items) => 
    apiClient.put(`/corporates/${corporateId}/plans/${planId}/benefit-items`, { items });

// ============= CROSS-CORPORATE PLANS (HQ) =============
export const fetchAllPlans = (params) => 
    apiClient.get('/plans', { params });

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
// export const suspendEnrollee = (id) => apiClient.patch(`/enrollees/${id}/suspend`);
export const suspendEnrollee = async (id, data = {}) => {
    const response = await apiClient.patch(`/enrollees/${id}/suspend`, data);
    return response.data;
};

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
    return response.data;
};

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

export const unblacklistHCP = async (id, data = {}) => {
    const response = await apiClient.patch(`/hcps/${id}/unblacklist`, data);
    return response.data;
};
export const suspendHCP = async (id, data = {}) => {
    const response = await apiClient.patch(`/hcps/${id}/suspend`, data);
    return response.data;
};

export const reactivateHCP = async (id, data = {}) => {
    const response = await apiClient.patch(`/hcps/${id}/reactivate`, data);
    return response.data;
};

// ============= HCP TARIFFS =============
export const fetchTariffs = (hcpId, params) =>
    hcpId 
        ? apiClient.get(`/hcps/${hcpId}/tariffs`, { params }).then(r => r.data)
        : apiClient.get('/tariffs/base', { params }).then(r => r.data);

export const createTariff = (hcpId, data) =>
    hcpId 
        ? apiClient.post(`/hcps/${hcpId}/tariffs`, data).then(r => r.data)
        : apiClient.post('/tariffs/base', data).then(r => r.data);

export const bulkUploadTariffs = (hcpId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/hcps/${hcpId}/tariffs/bulk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
};

export const updateTariff = (hcpId, tariffId, data) =>
    hcpId 
        ? apiClient.put(`/hcps/${hcpId}/tariffs/${tariffId}`, data).then(r => r.data)
        : apiClient.put(`/tariffs/base/${tariffId}`, data).then(r => r.data);

export const deleteTariff = (hcpId, tariffId) =>
    hcpId 
        ? apiClient.delete(`/hcps/${hcpId}/tariffs/${tariffId}`).then(r => r.data)
        : apiClient.delete(`/tariffs/base/${tariffId}`).then(r => r.data);

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

export const updateBankDetail = (hcpId, bankId, data) => 
    client.put(`/hcps/${hcpId}/bank-details/${bankId}`, data);

// ============= CLAIMS =============
export const fetchClaims = (params) => apiClient.get('/claims', { params });
export const fetchClaim = (id) => apiClient.get(`/claims/${id}`);
export const createClaim = (data) => apiClient.post('/claims', data);
export const processClaim = (id, data) => apiClient.post(`/claims/${id}/process`, data);
export const approveClaim = (id, data) => apiClient.post(`/claims/${id}/approve`, data);
export const rejectClaim = (id, data) => apiClient.post(`/claims/${id}/reject`, data);
export const assignClaim = (id, data) => apiClient.post(`/claims/${id}/assign`, data);
export const reverseClaim = (id, data) => apiClient.post(`/claims/${id}/reverse`, data);
export const fetchClaimTimeline = (id) => apiClient.get(`/claims/${id}/timeline`);
export const fetchClaimFraudFlags = (id) => apiClient.get(`/claims/${id}/fraud-flags`);
export const reviewFraudFlag = (id, flagId, data) => 
    apiClient.patch(`/claims/${id}/fraud-flags/${flagId}/review`, data);

// ✅ Add these missing exports
export const fetchFraudFlags = (id) => apiClient.get(`/claims/${id}/fraud-flags`);

export const fetchDashboardDigest = () => apiClient.get('/ai/dashboard-digest').then(r => r.data);
export const fetchClaimsAnomaly = (hcpId, period) => apiClient.get(`/ai/claims-anomaly/${hcpId}`, { params: { period } }).then(r => r.data);
export const fetchProviderSummary = (hcpId, period) => apiClient.get(`/ai/provider-summary/${hcpId}`, { params: { period } }).then(r => r.data);
export const fetchClaimRisk = (claimId) => apiClient.get(`/ai/claim-risk/${claimId}`).then(r => r.data);
export const draftEnrolleeResponse = (enrolleeId, inquiryText) => apiClient.post('/ai/enrollee-response', { enrollee_id: enrolleeId, inquiry_text: inquiryText }).then(r => r.data);

export const fetchClaimPaymentTimeline = (claimId) =>
    apiClient.get(`/claims/${claimId}/payment-timeline`).then(r => r.data);

export const fetchImportBatches = (params) => 
    apiClient.get('/claims/imports', { params });

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
export const submitClaim = (data) => apiClient.post('/claims', data);

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
export const fetchHCPPaymentSummary = async () => {
    const response = await apiClient.get('/finance/hcp-payment-summary');
    return response.data;
};
export const fetchLedger = (params) => apiClient.get('/finance/ledger', { params });
export const fetchLedgerSummary = (params) => apiClient.get('/finance/ledger/summary', { params });

export const generateRemittance = (paymentId) => 
    apiClient.post(`/finance/remittance/${paymentId}`);
export const downloadRemittance = (paymentId) => 
    apiClient.get(`/finance/remittance/${paymentId}/download`, {
        responseType: 'blob'
    });

export const fetchFFSProviders = async (params = {}) => {
    const response = await apiClient.get('/finance/ffs/providers', { params });
    return response.data;
};

export const fetchFFSSpendTrend = async () => {
    const response = await apiClient.get('/finance/ffs/spend-trend');
    return response.data;
};

export const createFFSBatch = async (data) => {
    const response = await apiClient.post('/finance/ffs/batch', data);
    return response.data;
};
// ============= REIMBURSEMENTS (Finance Staff) =============
export const fetchReimbursements = (params) =>
    apiClient.get('/finance/reimbursements', { params }).then(r => r.data);

export const approveReimbursement = (id, amount_approved, notes) =>
    apiClient.post(`/finance/reimbursements/${id}/approve`, { amount_approved, notes }).then(r => r.data);

export const rejectReimbursement = (id, notes) =>
    apiClient.post(`/finance/reimbursements/${id}/reject`, { notes }).then(r => r.data);

export const markReimbursementPaid = (id, payment_reference) =>
    apiClient.post(`/finance/reimbursements/${id}/mark-paid`, { payment_reference }).then(r => r.data);


// ============= REPORTS =============
export const fetchDashboard = () => apiClient.get('/reports/dashboard');
export const fetchClaimsAging = (params) => apiClient.get('/reports/claims-aging', { params });
export const fetchClaimsByHCP = (params) => apiClient.get('/reports/claims-by-hcp', { params });
export const fetchClaimsByType = (params) => apiClient.get('/reports/claims-by-type', { params });
export const fetchCostByCorporate = (params) => apiClient.get('/reports/cost-by-corporate', { params });
export const fetchHighCostEnrollees = (params) => apiClient.get('/reports/high-cost-enrollees', { params });
export const fetchHCPPerformanceReport = (params) => apiClient.get('/reports/hcp-performance', { params }); // ← RENAMED
export const fetchBranchComparison = (params) => apiClient.get('/reports/branch-comparison', { params });
export const fetchFraudHeatmap = (params) => apiClient.get('/reports/fraud-heatmap', { params });

// ============= AUDIT LOGS =============
export const fetchAuditLogs = (params) => apiClient.get('/reports/audit-logs', { params });

// ============= 🆕 PRE-AUTHORISATION (PA) =============
export const fetchPARequests = (params) => apiClient.get('/pre-auth', { params }).then(r => r.data);
export const fetchPARequest = (id) => apiClient.get(`/pre-auth/${id}`).then(r => r.data);
// export const submitPARequest = (data) => apiClient.post('/pre-auth', data);

export const submitPARequest = (data) => {
    console.log('📝 Submitting Pre-Auth. data:', data);
    return apiClient.post('/pre-auth', data)
        .then(response => {
            console.log('✅ Pre-Auth. submit response:', response);
            return response.data;
        })
        .catch(error => {
            console.error('❌ Pre-Auth. submit error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        });
};

export const approvePA = (id, data) => apiClient.post(`/pre-auth/${id}/approve`, data);
export const declinePA = (id, data) => apiClient.post(`/pre-auth/${id}/decline`, data);
export const fetchPAStats = () => apiClient.get('/pre-auth/stats').then(r => r.data);
export const revokePA = (id, data) => apiClient.post(`/pre-auth/${id}/revoke`, data);
export const validatePACode = (data) => apiClient.post('/pre-auth/validate-code', data);
export const fetchPATATReport = (params) => apiClient.get('/reports/pa-tat', { params }).then(r => r.data);
export const exportPATATReport = (params) => apiClient.get('/reports/pa-tat/export', { params, responseType: 'blob' });

// ============= 🆕 CAPITATION =============
export const fetchCapitationRuns = (params) => apiClient.get('/finance/capitation', { params }).then(r => r.data);
export const fetchCapitationRun = (id) => apiClient.get(`/finance/capitation/${id}`).then(r => r.data);
export const generateCapitationRun = (data) => apiClient.post('/finance/capitation/generate', data);
export const approveCapitationRun = (id) => apiClient.post(`/finance/capitation/${id}/approve`);
export const fetchCapitationSummary = (params) => apiClient.get('/finance/capitation/summary', { params }).then(r => r.data);

// ============= 🆕 CAPITATION RECORD ADJUSTMENT =============
export const adjustCapitationRecord = (runId, recordId, data) => 
    apiClient.patch(`/finance/capitation/${runId}/records/${recordId}`, data).then(r => r.data);

// ============= 🆕 CAPITATION RATES =============
export const fetchCapitationRates = (params) => 
    apiClient.get('/finance/capitation/rates', { params }).then(r => r.data);

export const createCapitationRate = (data) => 
    apiClient.post('/finance/capitation/rates', data).then(r => r.data);

export const updateCapitationRate = (id, data) => 
    apiClient.put(`/finance/capitation/rates/${id}`, data).then(r => r.data);

export const deleteCapitationRate = (id) => 
    apiClient.delete(`/finance/capitation/rates/${id}`).then(r => r.data);

export const saveCapitationRate = createCapitationRate; 

// ============= 🆕 SLA / OPERATIONS =============
export const fetchSLADashboard = () => apiClient.get('/reports/sla-dashboard').then(r => r.data);
export const fetchOverdueClaims = (params) => apiClient.get('/reports/overdue-claims', { params }).then(r => r.data);

// ============= 🆕 COMPLIANCE CALENDAR =============
export const fetchFilings = (params) => apiClient.get('/compliance/filings', { params }).then(r => r.data);
export const fetchFiling = (id) => apiClient.get(`/compliance/filings/${id}`).then(r => r.data);
export const createFiling = (data) => apiClient.post('/compliance/filings', data);
export const updateFiling = (id, data) => apiClient.put(`/compliance/filings/${id}`, data);
export const uploadFilingDoc = (id, formData) => apiClient.post(`/compliance/filings/${id}/documents`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
});

// Add these new compliance functions
export const fetchComplianceSummary = () => apiClient.get('/compliance/filings/summary').then(r => r.data);
export const completeFiling = (id, data) => apiClient.post(`/compliance/filings/${id}/complete`, data);

// ============= 🆕 NOTIFICATIONS / ALERTS =============
export const fetchNotifications = (params) => apiClient.get('/notifications', { params }).then(r => r.data);
export const markNotificationRead = (id) => apiClient.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiClient.post('/notifications/mark-all-read');
export const fetchNotificationCount = () => apiClient.get('/notifications/unread-count').then(r => r.data);

// ============= 🆕 CORPORATE SELF-SERVICE PORTAL =============
export const fetchCorpPortalDashboard = () => apiClient.get('/portal/corporate/dashboard').then(r => r.data);
export const fetchCorpPortalEnrollees = (params) => apiClient.get('/portal/corporate/enrollees', { params }).then(r => r.data);
export const fetchCorpPortalInvoices = (params) => apiClient.get('/portal/corporate/invoices', { params }).then(r => r.data);
export const fetchCorpPortalClaims = (params) => apiClient.get('/portal/corporate/claims', { params }).then(r => r.data);
export const corpPortalAddEnrollee = (data) => apiClient.post('/portal/corporate/enrollees', data);
export const corpPortalRemoveEnrollee = (id) => apiClient.delete(`/portal/corporate/enrollees/${id}`);
export const corpPortalBulkUpload = (fd) => apiClient.post('/portal/corporate/enrollees/bulk', fd, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
});
export const fetchCorpPortalProfile = () => apiClient.get('/portal/corporate/profile').then(r => r.data);
export const updateCorpPortalProfile = (data) => apiClient.put('/portal/corporate/profile', data);


export const fetchCorpAvailablePlans = () =>
    apiClient.get('/portal/corporate/available-plans').then(r => r.data);

// RENAMED: upgradeEnrolleeTier → corpPortalUpgradeEnrolleeTier (to match CorpEnrolleesPage.jsx)
export const corpPortalUpgradeEnrolleeTier = (enrolleeId, planId) =>
    apiClient.patch(`/portal/corporate/enrollees/${enrolleeId}/upgrade-tier`, { plan_id: planId }).then(r => r.data);

// Keep original for backward compatibility if needed
export const upgradeEnrolleeTier = corpPortalUpgradeEnrolleeTier;

export const fetchCorpPortalBudget = () =>
    apiClient.get('/portal/corporate/budget').then(r => r.data);

export const estimateCorpPlan = (data) =>
    apiClient.post('/portal/corporate/plan-requests/estimate', data).then(r => r.data);

export const submitCorpPlanRequest = (data) =>
    apiClient.post('/portal/corporate/plan-requests', data).then(r => r.data);

export const fetchCorpPlanRequests = () =>
    apiClient.get('/portal/corporate/plan-requests').then(r => r.data);

export const sendCorpBroadcast = (data) =>
    apiClient.post('/portal/corporate/broadcast', data).then(r => r.data);

// ── Staff — plan request review ─────────────────────────────────────────────
export const fetchPlanRequests = (params) =>
    apiClient.get('/plan-requests', { params }).then(r => r.data);

export const fetchPlanRequest = (id) =>
    apiClient.get(`/plan-requests/${id}`).then(r => r.data);

export const approvePlanRequest = (id, data) =>
    apiClient.post(`/plan-requests/${id}/approve`, data).then(r => r.data);

export const rejectPlanRequest = (id, notes) =>
    apiClient.post(`/plan-requests/${id}/reject`, { notes }).then(r => r.data);

// ============= 🆕 PHASE 7 - CORPORATE PORTAL ADDITIONS =============
export const corpPortalReactivateEnrollee = (id) =>
    apiClient.post(`/portal/corporate/enrollees/${id}/reactivate`).then(r => r.data);

export const corpPortalBulkUpdateEnrolleeStatus = (ids, status) =>
    apiClient.post('/portal/corporate/enrollees/bulk-status', { enrollee_ids: ids, status }).then(r => r.data);

export const exportCorpUtilizationReport = () => {
    window.open('/api/v1/portal/corporate/utilization-report/export', '_blank');
};

export const fetchCorpRenewalStatus = () =>
    apiClient.get('/portal/corporate/renewal-status').then(r => r.data);

export const corpPortalRequestRenewal = (notes) =>
    apiClient.post('/portal/corporate/request-renewal', { notes }).then(r => r.data);

// ============= 🆕 ENROLLEE SELF-SERVICE PORTAL =============
export const fetchEnrolleePortalDashboard = () => apiClient.get('/portal/enrollee/dashboard').then(r => r.data);
export const fetchEnrolleePortalIDCard = () => apiClient.get('/portal/enrollee/id-card').then(r => r.data);
export const fetchEnrolleePortalBenefits = () => apiClient.get('/portal/enrollee/benefits').then(r => r.data);
export const fetchEnrolleePortalClaims = (p) => apiClient.get('/portal/enrollee/claims', { params: p }).then(r => r.data);
export const fetchEnrolleePortalHCPs = (p) => apiClient.get('/portal/enrollee/find-hcp', { params: p }).then(r => r.data);
export const fetchEnrolleePortalComplaints = (p) => apiClient.get('/portal/enrollee/complaints', { params: p }).then(r => r.data);
export const submitEnrolleeComplaint = (d) => apiClient.post('/portal/enrollee/complaints', d);
export const fetchEnrolleePortalProfile = () => apiClient.get('/portal/enrollee/profile').then(r => r.data);
export const updateEnrolleePortalProfile = (d) => apiClient.put('/portal/enrollee/profile', d);

export const confirmEnrolleeClaimUtilization = (claimId) =>
    apiClient.post(`/portal/enrollee/claims/${claimId}/confirm-utilization`).then(r => r.data);
export const disputeEnrolleeClaimUtilization = (claimId, reason) =>
    apiClient.post(`/portal/enrollee/claims/${claimId}/dispute-utilization`, { reason }).then(r => r.data);
export const fetchEnrolleePortalReimbursements = () =>
    apiClient.get('/portal/enrollee/reimbursements').then(r => r.data);
export const submitEnrolleePortalReimbursement = (formData) =>
    apiClient.post('/portal/enrollee/reimbursements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);

// ── Enrollee — check-in ─────────────────────────────────────────────────────
export const checkInAtProvider = (hcpId, dependentId = null) =>
    apiClient.post('/portal/enrollee/check-in', { hcp_id: hcpId, dependent_id: dependentId }).then(r => r.data);

// ── Enrollee — appointments ─────────────────────────────────────────────────
export const bookEnrolleeAppointment = (data) =>
    apiClient.post('/portal/enrollee/appointments', data).then(r => r.data);

export const fetchEnrolleeAppointments = (upcomingOnly = false) =>
    apiClient.get('/portal/enrollee/appointments', { params: { upcoming: upcomingOnly ? 1 : 0 } }).then(r => r.data);

export const cancelEnrolleeAppointment = (id) =>
    apiClient.patch(`/portal/enrollee/appointments/${id}/cancel`).then(r => r.data);

// ── Enrollee — telemedicine (PHASE 1) ────────────────────────────────────────
export const fetchEnrolleeEncounters = (upcomingOnly = false) =>
    apiClient.get('/portal/enrollee/telemedicine/encounters', { params: { upcoming: upcomingOnly ? 1 : 0 } }).then(r => r.data);

export const joinEnrolleeTelemedicine = (encounterId) =>
    apiClient.post(`/portal/enrollee/telemedicine/encounters/${encounterId}/join`).then(r => r.data);

export const fetchEnrolleePrescriptions = () =>
    apiClient.get('/portal/enrollee/telemedicine/prescriptions').then(r => r.data);

export const searchDoctors = (params) =>
    apiClient.get('/portal/enrollee/doctors/search', { params }).then(r => r.data);

export const fetchDoctorSlots = (doctorId, date) =>
    apiClient.get(`/portal/enrollee/doctors/${doctorId}/slots`, { params: { date } }).then(r => r.data);

export const fetchProviderDoctors = () =>
    apiClient.get('/portal/provider/doctors').then(r => r.data);

export const createProviderDoctor = (data) =>
    apiClient.post('/portal/provider/doctors', data).then(r => r.data);

export const setDoctorSchedule = (doctorId, slots) =>
    apiClient.post(`/portal/provider/doctors/${doctorId}/schedule`, { slots }).then(r => r.data);


// ========== PROVIDER SELF-SERVICE PORTAL =============
export const fetchProviderDashboard = () =>
    apiClient.get('/portal/provider/dashboard').then(r => r.data);

export const verifyProviderEnrollee = (memberNumber) =>
    apiClient.post('/portal/provider/verify-enrollee', { member_number: memberNumber }).then(r => r.data);

export const fetchProviderClaims = (params) =>
    apiClient.get('/portal/provider/claims', { params }).then(r => r.data);

export const fetchProviderClaim = (id) =>
    apiClient.get(`/portal/provider/claims/${id}`).then(r => r.data);

export const submitProviderClaim = (data) =>
    apiClient.post('/portal/provider/claims', data).then(r => r.data);

export const fetchProviderPreAuths = (params) =>
    apiClient.get('/portal/provider/pre-auths', { params }).then(r => r.data);

export const submitProviderPreAuth = (data) =>
    apiClient.post('/portal/provider/pre-auths', data).then(r => r.data);

export const fetchProviderCheckins = () =>
    apiClient.get('/portal/provider/check-ins').then(r => r.data);

export const acknowledgeProviderCheckin = (checkinId) =>
    apiClient.post(`/portal/provider/checkins/${checkinId}/acknowledge`).then(r => r.data);

// ── Provider — appointments + QR verification ───────────────────────────────
export const fetchProviderAppointments = (status) =>
    apiClient.get('/portal/provider/appointments', { params: status ? { status } : {} }).then(r => r.data);

export const confirmProviderAppointment = (id, confirmedDate, confirmedTime = null) =>
    apiClient.post(`/portal/provider/appointments/${id}/confirm`, {
        confirmed_date: confirmedDate, confirmed_time: confirmedTime,
    }).then(r => r.data);

export const verifyProviderQrCode = (qrData) =>
    apiClient.post('/portal/provider/verify-qr', { qr_data: qrData }).then(r => r.data);

// ── Provider — telemedicine (PHASE 1) ────────────────────────────────────────
export const fetchProviderTelemedicineQueue = (status) =>
    apiClient.get('/portal/provider/telemedicine/queue', { params: status ? { status } : {} }).then(r => r.data);

export const joinProviderTelemedicine = (encounterId) =>
    apiClient.post(`/portal/provider/telemedicine/encounters/${encounterId}/join`).then(r => r.data);

export const closeProviderTelemedicineEncounter = (encounterId, payload) =>
    apiClient.post(`/portal/provider/telemedicine/encounters/${encounterId}/close`, payload).then(r => r.data);


// ── Provider bulk claims import ─────────────────────────────────────────────
export const uploadProviderClaimImport = (file, claimPeriod) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('claim_period', claimPeriod);
    return apiClient.post('/portal/provider/claims/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
};

export const confirmProviderImportMapping = (batchId, mapping) =>
    apiClient.post(`/portal/provider/claims/import/${batchId}/map`, { mapping }).then(r => r.data);

export const fetchProviderImportRows = (batchId) =>
    apiClient.get(`/portal/provider/claims/import/${batchId}/rows`).then(r => r.data);

export const pushProviderImportBatch = (batchId, notes = '') =>
    apiClient.post(`/portal/provider/claims/import/${batchId}/push`, { notes }).then(r => r.data);

// ── Provider payments & reconciliation ──────────────────────────────────────
export const fetchProviderPayments = (params) =>
    apiClient.get('/portal/provider/payments', { params }).then(r => r.data);

export const fetchProviderReconciliation = () =>
    apiClient.get('/portal/provider/reconciliation').then(r => r.data);

// ── Provider tickets ─────────────────────────────────────────────────────────
export const fetchProviderTickets = () =>
    apiClient.get('/portal/provider/tickets').then(r => r.data);

export const submitProviderTicket = (data) =>
    apiClient.post('/portal/provider/tickets', data).then(r => r.data);

export const fetchProviderTicketThread = (ticketId) =>
    apiClient.get(`/portal/provider/tickets/${ticketId}`).then(r => r.data);

export const replyProviderTicket = (ticketId, message) =>
    apiClient.post(`/portal/provider/tickets/${ticketId}/reply`, { message }).then(r => r.data);

// ── Enrollee tickets (repointed from complaints) ────────────────────────────
export const fetchEnrolleeTicketThread = (ticketId) =>
    apiClient.get(`/portal/enrollee/complaints/${ticketId}`).then(r => r.data);

export const replyEnrolleeTicket = (ticketId, message) =>
    apiClient.post(`/portal/enrollee/complaints/${ticketId}/reply`, { message }).then(r => r.data);

// ── Corporate tickets ────────────────────────────────────────────────────────
export const fetchCorpPortalTickets = () =>
    apiClient.get('/portal/corporate/tickets').then(r => r.data);

export const submitCorpPortalTicket = (data) =>
    apiClient.post('/portal/corporate/tickets', data).then(r => r.data);

export const fetchCorpPortalTicketThread = (ticketId) =>
    apiClient.get(`/portal/corporate/tickets/${ticketId}`).then(r => r.data);

export const replyCorpPortalTicket = (ticketId, message) =>
    apiClient.post(`/portal/corporate/tickets/${ticketId}/reply`, { message }).then(r => r.data);

// ── Staff ticket queue ───────────────────────────────────────────────────────
export const fetchTickets = (params) =>
    apiClient.get('/tickets', { params }).then(r => r.data);

export const fetchTicket = (id) =>
    apiClient.get(`/tickets/${id}`).then(r => r.data);

export const assignTicket = (id, userId) =>
    apiClient.post(`/tickets/${id}/assign`, { user_id: userId }).then(r => r.data);

export const replyTicket = (id, message, isInternalNote = false) =>
    apiClient.post(`/tickets/${id}/reply`, { message, is_internal_note: isInternalNote }).then(r => r.data);

export const resolveTicket = (id, resolutionNote) =>
    apiClient.post(`/tickets/${id}/resolve`, { resolution_note: resolutionNote }).then(r => r.data);

export const closeTicket = (id) =>
    apiClient.post(`/tickets/${id}/close`).then(r => r.data);

export const reopenTicket = (id, reason) =>
    apiClient.post(`/tickets/${id}/reopen`, { reason }).then(r => r.data);


// ============= USERS =============
export const fetchUsers = (params) => apiClient.get('/users', { params });
// export const fetchUser = (id) => apiClient.get(`/users/${id}`);
export const createUser = (data) => apiClient.post('/users', data);
export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data);
export const deleteUser = (id) => apiClient.delete(`/users/${id}`);
export const toggleUserStatus = (id) => apiClient.patch(`/users/${id}/status`);
export const assignUserRoles = (id, data) => apiClient.post(`/users/${id}/roles`, data);
export const fetchUserById = (id) => apiClient.get(`/users/${id}`);

// ============= ROLES & PERMISSIONS =============
export const fetchRoles = (params) => apiClient.get('/roles', { params });
export const fetchRole = (id) => apiClient.get(`/roles/${id}`);
export const fetchPermissions = () => apiClient.get('/permissions');
export const syncRolePermissions = (id, data) => 
    apiClient.put(`/roles/${id}/permissions`, data);

export const fetchHelpArticles = (params) => 
    apiClient.get('/help', { params }).then(r => r.data);


export const searchEmployers = (q) =>
    apiClient.get('/join/employers/search', { params: { q } }).then(r => r.data);

export const verifyEmployeeIdentity = (data) =>
    apiClient.post('/join/employers/verify-identity', data).then(r => r.data);

export const claimEmployeeAccount = (data) =>
    apiClient.post('/join/employers/claim-account', data).then(r => r.data);

export const payCorpInvoiceOnline = (invoiceId) =>
    apiClient.post(`/portal/corporate/invoices/${invoiceId}/pay-online`).then(r => r.data);

export const confirmCorpInvoicePayment = (data) =>
    apiClient.post('/portal/corporate/invoices/payment-return', data).then(r => r.data);



export default {
    // Auth
    login, logout, logoutAll, fetchUser, changePassword,
    setup2FA, confirm2FA, disable2FA,
    
    //Help
    fetchHelpArticles,
    // Branches
    fetchBranches, fetchBranch, createBranch, updateBranch, deleteBranch, toggleBranchStatus,
    
    // Corporates
    fetchCorporates, fetchCorporate, createCorporate, updateCorporate, deleteCorporate,
    suspendCorporate, bulkUploadEnrollees,

    searchEmployers,verifyEmployeeIdentity, claimEmployeeAccount, payCorpInvoiceOnline, confirmCorpInvoicePayment,

    // Corporate Plans
    fetchPlans, fetchPlan, createPlan, updatePlan, discontinuePlan, 
    duplicatePlan, syncBenefitItems, fetchAllPlans,

    // Plans
    fetchPlans, fetchPlan, createPlan, updatePlan,
    
    // Invoices
    fetchInvoices, createInvoice, markInvoicePaid,
    
    // Enrollees
    fetchEnrollees, fetchEnrollee, createEnrollee, updateEnrollee, suspendEnrollee,
    transferEnrollee, fetchEnrolleeClaims, fetchEnrolleeCard, regenerateEnrolleeCard,
    fetchEnrolleeBenefitSummary,
    
    // Dependents
    fetchDependents, fetchDependent, createDependent, updateDependent, deleteDependent,
    
    // HCPs
    fetchHCPs, fetchHCP, createHCP, updateHCP, accreditHCP, blacklistHCP, suspendHCP, reactivateHCP,
    fetchHCPPerformance, fetchHCPPaymentHistory,
    
    // Tariffs
    fetchTariffs, createTariff, bulkUploadTariffs, updateTariff, deleteTariff,
    
    // Contracts
    fetchContracts, fetchContract, createContract,
    
    // Bank Details
    fetchBankDetails, createBankDetail, verifyBankDetail, deleteBankDetail,
    
    // Claims
    fetchClaims, fetchClaim, createClaim, processClaim, approveClaim, rejectClaim, submitClaim,  
    assignClaim, reverseClaim, fetchClaimTimeline, fetchFraudFlags,fetchClaimFraudFlags, reviewFraudFlag,
    fetchClaimPaymentTimeline,
    
    // Claim Documents
    fetchClaimDocuments, uploadClaimDocument, downloadClaimDocument,
    
    // Finance
    fetchPaymentBatches, fetchPaymentBatch, createPaymentBatch, submitPaymentBatch,
    approvePaymentBatch, exportBankFile, fetchLedger, fetchLedgerSummary,
    generateRemittance, downloadRemittance, fetchReimbursements,
    
    // 🆕 Capitation (runs)
    fetchCapitationRuns, fetchCapitationRun, generateCapitationRun, approveCapitationRun,
    fetchCapitationSummary,
    
    // 🆕 Capitation Rates (ADD THESE)
    fetchCapitationRates, createCapitationRate, saveCapitationRate, updateCapitationRate, deleteCapitationRate,
    
    // 🆕 Capitation Record Adjustment (ADD THIS)
    adjustCapitationRecord, 
    
    // Reports
    fetchDashboard, fetchClaimsAging, fetchClaimsByHCP, fetchClaimsByType,
    fetchCostByCorporate, fetchHighCostEnrollees, fetchHCPPerformanceReport,
    fetchBranchComparison, fetchFraudHeatmap,
    
    // 🆕 SLA & Operations
    fetchSLADashboard, fetchOverdueClaims,
    
    // Audit Logs
    fetchAuditLogs,
    
    // 🆕 Compliance
    fetchFilings, fetchFiling, fetchComplianceSummary,
    createFiling, updateFiling, completeFiling, uploadFilingDoc,

    // 🆕 SYSTEM SETTINGS (ADD THESE)
    fetchSystemSettings, updateSystemSettings, updateSystemSetting, 
    resetSystemSetting, fetchPublicSettings,

    // 🆕 Pre-Authorisation
    fetchPARequests, fetchPARequest, submitPARequest, approvePA, declinePA, fetchPAStats,
    revokePA, validatePACode, fetchPATATReport, exportPATATReport,
    
    // 🆕 Notifications
    fetchNotifications, markNotificationRead, markAllNotificationsRead, fetchNotificationCount,
    
    // 🆕 Corporate Portal
    fetchCorpPortalDashboard, fetchCorpPortalEnrollees, fetchCorpPortalInvoices,
    fetchCorpPortalClaims, corpPortalAddEnrollee, corpPortalRemoveEnrollee,
    corpPortalBulkUpload, fetchCorpPortalProfile, updateCorpPortalProfile,
    
    fetchCorpAvailablePlans, corpPortalUpgradeEnrolleeTier, upgradeEnrolleeTier, fetchCorpPortalBudget, estimateCorpPlan,
    submitCorpPlanRequest, fetchCorpPlanRequests, sendCorpBroadcast, fetchPlanRequests, fetchPlanRequest,
    approvePlanRequest, rejectPlanRequest,

    // 🆕 PHASE 7 - Corporate Portal
    corpPortalReactivateEnrollee, corpPortalBulkUpdateEnrolleeStatus, 
    exportCorpUtilizationReport, fetchCorpRenewalStatus, corpPortalRequestRenewal,
 
    // 🆕 Enrollee Portal
    fetchEnrolleePortalDashboard, fetchEnrolleePortalIDCard, fetchEnrolleePortalBenefits,
    fetchEnrolleePortalClaims, fetchEnrolleePortalHCPs, fetchEnrolleePortalComplaints,
    submitEnrolleeComplaint, fetchEnrolleePortalProfile, updateEnrolleePortalProfile,
    confirmEnrolleeClaimUtilization, disputeEnrolleeClaimUtilization,
    fetchEnrolleePortalReimbursements, submitEnrolleePortalReimbursement,
    checkInAtProvider, bookEnrolleeAppointment, fetchEnrolleeAppointments, cancelEnrolleeAppointment,
    fetchEnrolleeEncounters, joinEnrolleeTelemedicine, fetchEnrolleePrescriptions,

    searchDoctors, fetchDoctorSlots, fetchProviderDoctors, createProviderDoctor, setDoctorSchedule,
    
    // 🆕 Provider Portal
    fetchProviderDashboard, verifyProviderEnrollee, fetchProviderClaims,
    fetchProviderClaim, submitProviderClaim, fetchProviderPreAuths,
    submitProviderPreAuth,
    uploadProviderClaimImport, confirmProviderImportMapping, fetchProviderImportRows, pushProviderImportBatch, fetchProviderPayments, fetchProviderReconciliation, fetchProviderTickets, submitProviderTicket, fetchProviderTicketThread, replyProviderTicket,
    fetchProviderAppointments, confirmProviderAppointment, verifyProviderQrCode,
    fetchProviderTelemedicineQueue, joinProviderTelemedicine, closeProviderTelemedicineEncounter,

    // Users
    fetchUsers, fetchUser,fetchUserById, createUser, updateUser, deleteUser,
    toggleUserStatus, assignUserRoles,
    
    // Roles
    fetchRoles, fetchRole, fetchPermissions, syncRolePermissions,

    //Public
    fetchRetailPlans, estimateRetailPremium, registerRetailEnrollee, confirmRetailPayment,
};