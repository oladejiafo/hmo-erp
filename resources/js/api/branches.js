import apiClient from './client';

// Export functions individually to avoid circular dependency
export const getBranches = async () => {
    try {
        const response = await apiClient.get('/branches');
        return response.data;
    } catch (error) {
        console.error('Error fetching branches:', error);
        throw error;
    }
};

export const getBranch = async (id) => {
    try {
        const response = await apiClient.get(`/branches/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching branch:', error);
        throw error;
    }
};

export const createBranch = async (data) => {
    try {
        const response = await apiClient.post('/branches', data);
        return response.data;
    } catch (error) {
        console.error('Error creating branch:', error);
        throw error;
    }
};

export const updateBranch = async (id, data) => {
    try {
        const response = await apiClient.put(`/branches/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating branch:', error);
        throw error;
    }
};

export const deleteBranch = async (id) => {
    try {
        const response = await apiClient.delete(`/branches/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting branch:', error);
        throw error;
    }
};

export const toggleBranchStatus = async (id) => {
    try {
        const response = await apiClient.patch(`/branches/${id}/status`);
        return response.data;
    } catch (error) {
        console.error('Error toggling branch status:', error);
        throw error;
    }
};

export const setActiveBranch = (branchId) => {
    localStorage.setItem('active_branch', branchId);
    window.location.reload();
};
