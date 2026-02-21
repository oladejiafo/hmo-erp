import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
    const { permissions, hasPermission, hasAnyRole } = useAuth();
    
    const can = (permission) => hasPermission(permission);
    
    const canAny = (permissions) => {
        return permissions.some(p => hasPermission(p));
    };
    
    const canAll = (permissions) => {
        return permissions.every(p => hasPermission(p));
    };
    
    const isInRole = (roles) => hasAnyRole(roles);
    
    return {
        permissions,
        can,
        canAny,
        canAll,
        isInRole,
    };
};
