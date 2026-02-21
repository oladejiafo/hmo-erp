import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClaims, fetchClaim, createClaim, updateClaim, deleteClaim } from '../api/claims';

export const useClaims = (params) => {
    return useQuery({
        queryKey: ['claims', params],
        queryFn: () => fetchClaims(params),
    });
};

export const useClaim = (id) => {
    return useQuery({
        queryKey: ['claims', id],
        queryFn: () => fetchClaim(id),
        enabled: !!id,
    });
};

export const useCreateClaim = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createClaim,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['claims'] });
        },
    });
};
