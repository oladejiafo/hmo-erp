/**
 * FILE LOCATION: resources/js/utils/permissions.js
 *
 * Permission constants and helpers.
 * Keeping permission strings in one place prevents typos across the app.
 *
 * USAGE:
 *   import { PERMISSIONS } from '../utils/permissions';
 *   can(PERMISSIONS.CLAIMS_APPROVE)
 */

export const PERMISSIONS = {
    // ── Branches ──────────────────────────────────────────────
    BRANCHES_VIEW:   'branches.view',
    BRANCHES_CREATE: 'branches.create',
    BRANCHES_EDIT:   'branches.edit',
    BRANCHES_DELETE: 'branches.delete',

    // ── Users ─────────────────────────────────────────────────
    USERS_VIEW:         'users.view',
    USERS_CREATE:       'users.create',
    USERS_EDIT:         'users.edit',
    USERS_DELETE:       'users.delete',
    USERS_SUSPEND:      'users.suspend',
    USERS_ASSIGN_ROLES: 'users.assign_roles',

    // ── Roles ─────────────────────────────────────────────────
    ROLES_VIEW:   'roles.view',
    ROLES_MANAGE: 'roles.manage',

    // ── Corporates ────────────────────────────────────────────
    CORPORATES_VIEW:     'corporates.view',
    CORPORATES_CREATE:   'corporates.create',
    CORPORATES_EDIT:     'corporates.edit',
    CORPORATES_SUSPEND:  'corporates.suspend',
    CORPORATES_INVOICES: 'corporates.invoices',

    // ── Enrollees ─────────────────────────────────────────────
    ENROLLEES_VIEW:   'enrollees.view',
    ENROLLEES_CREATE: 'enrollees.create',
    ENROLLEES_EDIT:   'enrollees.edit',
    ENROLLEES_SUSPEND: 'enrollees.suspend',
    ENROLLEES_TRANSFER: 'enrollees.transfer',
    ENROLLEES_DELETE: 'enrollees.delete',

    // ── HCPs ──────────────────────────────────────────────────
    HCPS_VIEW:       'hcps.view',
    HCPS_CREATE:     'hcps.create',
    HCPS_EDIT:       'hcps.edit',
    HCPS_ACCREDIT:   'hcps.accredit',
    HCPS_BLACKLIST:  'hcps.blacklist',
    HCPS_SUSPEND:    'hcps.suspend',
    HCPS_ASSESS:     'hcps.assess',
    HCPS_TARIFFS:    'hcps.tariffs',
    HCPS_CONTRACTS:  'hcps.contracts',
    HCPS_BANK_DETAILS: 'hcps.bank_details',

    // ── Claims ────────────────────────────────────────────────
    CLAIMS_VIEW:           'claims.view',
    CLAIMS_SUBMIT:         'claims.submit',
    CLAIMS_PROCESS:        'claims.process',
    CLAIMS_APPROVE:        'claims.approve',
    CLAIMS_APPROVE_HIGH:   'claims.approve_high_value',
    CLAIMS_APPROVE_CRITICAL:'claims.approve_critical',
    CLAIMS_REJECT:         'claims.reject',
    CLAIMS_ASSIGN:         'claims.assign',
    CLAIMS_REVERSE:        'claims.reverse',
    CLAIMS_FRAUD_VIEW:     'claims.fraud_view',
    CLAIMS_FRAUD_REVIEW:   'claims.fraud_review',

    // ── Pre-Authorisation ─────────────────────────────────────
    PA_VIEW:              'pa.view',
    PA_REQUEST:           'pa.request',
    PA_APPROVE_STANDARD:  'pa.approve_standard',
    PA_APPROVE_HIGH:      'pa.approve_high_value',
    PA_APPROVE_CRITICAL:  'pa.approve_critical',
    PA_DECLINE:           'pa.decline',

    // ── Finance ───────────────────────────────────────────────
    FINANCE_VIEW:             'finance.view',
    FINANCE_BATCH_CREATE:     'finance.batch_create',
    FINANCE_BATCH_APPROVE:    'finance.batch_approve',
    FINANCE_LEDGER_VIEW:      'finance.ledger_view',
    FINANCE_REMITTANCE:       'finance.remittance',
    FINANCE_CAPITATION_RUN:   'finance.capitation_run',
    FINANCE_CAPITATION_VIEW:  'finance.capitation_view',

    // ── Reports ───────────────────────────────────────────────
    REPORTS_BRANCH:       'reports.branch',
    REPORTS_ALL_BRANCHES: 'reports.all_branches',
    REPORTS_AUDIT_LOGS:   'reports.audit_logs',
    REPORTS_FRAUD:        'reports.fraud_heatmap',
    REPORTS_EXPORT:       'reports.export',

    // ── Compliance / Regulatory ───────────────────────────────
    COMPLIANCE_VIEW:   'compliance.view',
    COMPLIANCE_MANAGE: 'compliance.manage',

    // ── Portal Access ─────────────────────────────────────────
    CORP_PORTAL_ACCESS:   'portal.corporate.access',
    ENRL_PORTAL_ACCESS:   'portal.enrollee.access',
};

// ── Permission Groups for UI Display ───────────────────────────
export const permissionGroups = {
    branches: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete', 'suspend', 'assign_roles'],
    roles: ['view', 'manage'],
    corporates: ['view', 'create', 'edit', 'delete', 'suspend', 'invoices'],
    enrollees: ['view', 'create', 'edit', 'delete', 'suspend', 'transfer'],
    hcps: ['view', 'create', 'edit', 'accredit', 'blacklist', 'suspend', 'assess', 'tariffs', 'contracts', 'bank_details'],
    claims: ['view', 'submit', 'process', 'approve', 'approve_high_value', 'approve_critical', 'reject', 'assign', 'reverse', 'fraud_view', 'fraud_review'],
    pa: ['view', 'request', 'approve_standard', 'approve_high_value', 'approve_critical', 'decline'],
    finance: ['view', 'batch_create', 'batch_approve', 'ledger_view', 'remittance', 'capitation_run', 'capitation_view'],
    reports: ['branch', 'all_branches', 'audit_logs', 'fraud_heatmap', 'export'],
    compliance: ['view', 'manage'],
    portal: ['corporate.access', 'enrollee.access'],
};

/**
 * Get all permissions as a flat array.
 */
export const getAllPermissions = () => {
    const permissions = [];
    Object.entries(permissionGroups).forEach(([group, actions]) => {
        actions.forEach(action => {
            permissions.push(`${group}.${action}`);
        });
    });
    return permissions;
};

/**
 * Get permissions grouped by module.
 */
export const getGroupedPermissions = () => {
    return permissionGroups;
};

/**
 * Get a human-readable display name for a permission.
 * @param {string} permission 
 */
export const getPermissionDisplayName = (permission) => {
    const [group, action] = permission.split('.');
    
    const actionMap = {
        // Basic CRUD
        view: 'View',
        create: 'Create',
        edit: 'Edit', 
        delete: 'Delete',
        
        // User management
        suspend: 'Suspend',
        assign_roles: 'Assign Roles',
        
        // Role management
        manage: 'Manage',
        
        // Corporate
        invoices: 'Manage Invoices',
        
        // Enrollee
        transfer: 'Transfer',
        
        // HCP
        accredit: 'Accredit',
        blacklist: 'Blacklist',
        assess: 'Quarterly Assessment',
        tariffs: 'Manage Tariffs',
        contracts: 'Manage Contracts',
        bank_details: 'Manage Bank Details',
        
        // Claims
        submit: 'Submit',
        process: 'Process',
        approve: 'Approve',
        approve_high_value: 'Approve High Value',
        approve_critical: 'Approve Critical',
        reject: 'Reject',
        assign: 'Assign',
        reverse: 'Reverse',
        fraud_view: 'View Fraud Flags',
        fraud_review: 'Review Fraud Flags',
        
        // Pre-Authorisation
        request: 'Request PA',
        approve_standard: 'Approve Standard PA',
        approve_high_value: 'Approve High Value PA',
        approve_critical: 'Approve Critical PA',
        decline: 'Decline PA',
        
        // Finance
        batch_create: 'Create Batches',
        batch_approve: 'Approve Batches',
        ledger_view: 'View Ledger',
        remittance: 'Generate Remittance',
        capitation_run: 'Run Capitation',
        capitation_view: 'View Capitation',
        
        // Reports
        branch: 'Branch Reports',
        all_branches: 'All Branches Reports',
        audit_logs: 'View Audit Logs',
        fraud_heatmap: 'View Fraud Heatmap',
        export: 'Export Reports',
        
        // Compliance
        manage: 'Manage Filings',
        
        // Portal
        'corporate.access': 'Access Corporate Portal',
        'enrollee.access': 'Access Enrollee Portal',
        
        // Existing action map (for backward compatibility)
        import: 'Import',
    };
    
    const groupMap = {
        branches: 'Branches',
        users: 'Users',
        roles: 'Roles',
        corporates: 'Corporates',
        enrollees: 'Enrollees',
        hcps: 'Healthcare Providers',
        claims: 'Claims',
        pa: 'Pre-Authorisation',
        finance: 'Finance',
        reports: 'Reports',
        compliance: 'Compliance',
        portal: 'Portal Access',
    };
    
    const actionName = actionMap[action] || action.split('_').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
    
    const groupName = groupMap[group] || group.charAt(0).toUpperCase() + group.slice(1);
    
    return `${actionName} ${groupName}`;
};

/**
 * Group permissions by module for role management UI.
 * @param {string[]} permissionNames 
 * @returns {{ [module: string]: string[] }}
 */
export function groupPermissions(permissionNames) {
    return permissionNames.reduce((acc, name) => {
        const module = name.split('.')[0];
        if (!acc[module]) acc[module] = [];
        acc[module].push(name);
        return acc;
    }, {});
}

/**
 * Convert a raw permission slug to a human-readable label (simplified version).
 * @param {string} permission 
 */
export function permissionLabel(permission) {
    const [, action] = permission.split('.');
    return (action ?? permission)
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}