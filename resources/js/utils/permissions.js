export const permissionGroups = {
    branches: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete', 'suspend', 'assign_roles'],
    roles: ['view', 'manage'],
    corporates: ['view', 'create', 'edit', 'delete', 'suspend', 'invoices'],
    enrollees: ['view', 'create', 'edit', 'suspend', 'transfer'],
    hcps: ['view', 'create', 'edit', 'accredit', 'blacklist', 'tariffs', 'contracts', 'bank_details'],
    claims: ['view', 'submit', 'process', 'approve', 'reject', 'assign', 'reverse', 'fraud_view', 'fraud_review'],
    finance: ['view', 'batch_create', 'batch_approve', 'ledger_view', 'remittance'],
    reports: ['branch', 'all_branches', 'audit_logs', 'fraud_heatmap', 'export'],
};

export const getAllPermissions = () => {
    const permissions = [];
    Object.entries(permissionGroups).forEach(([group, actions]) => {
        actions.forEach(action => {
            permissions.push(`${group}.${action}`);
        });
    });
    return permissions;
};

export const getGroupedPermissions = () => {
    return permissionGroups;
};

export const getPermissionDisplayName = (permission) => {
    const [group, action] = permission.split('.');
    const actionMap = {
        view: 'View',
        create: 'Create',
        edit: 'Edit', 
        delete: 'Delete',
        suspend: 'Suspend',
        approve: 'Approve',
        reject: 'Reject',
        submit: 'Submit',
        process: 'Process',
        assign: 'Assign',
        reverse: 'Reverse',
        accredit: 'Accredit',
        blacklist: 'Blacklist',
        manage: 'Manage',
        export: 'Export',
        import: 'Import',
        view: 'View',
        fraud_view: 'View Fraud Flags',
        fraud_review: 'Review Fraud Flags',
        batch_create: 'Create Batches',
        batch_approve: 'Approve Batches',
        ledger_view: 'View Ledger',
        remittance: 'Generate Remittance',
        bank_details: 'Manage Bank Details',
        tariffs: 'Manage Tariffs',
        contracts: 'Manage Contracts',
        invoices: 'Manage Invoices',
    };
    
    const groupMap = {
        branches: 'Branches',
        users: 'Users',
        roles: 'Roles',
        corporates: 'Corporates',
        enrollees: 'Enrollees',
        hcps: 'Healthcare Providers',
        claims: 'Claims',
        finance: 'Finance',
        reports: 'Reports',
    };
    
    const actionName = actionMap[action] || action;
    const groupName = groupMap[group] || group;
    
    return `${actionName} ${groupName}`;
};
