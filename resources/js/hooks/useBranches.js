import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBranches, fetchBranch, createBranch, updateBranch, deleteBranch } from '../api/branches';

export const useBranches = (params) => {
    return useQuery({
        queryKey: ['branches', params],
        queryFn: () => fetchBranches(params),
    });
};

export const useBranch = (id) => {
    return useQuery({
        queryKey: ['branches', id],
        queryFn: () => fetchBranch(id),
        enabled: !!id,
    });
};

export const useCreateBranch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createBranch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
    });
};

export const useUpdateBranch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => updateBranch(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            queryClient.invalidateQueries({ queryKey: ['branches', id] });
        },
    });
};

export const useDeleteBranch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBranch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
    });
};
