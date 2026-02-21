import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBranches, setActiveBranch } from '../api/branches';

export default function Topbar({ onToggleSidebar }) {
    const { user, logout, isHQ } = useAuth();
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(user?.branch_id);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await getBranches();
                setBranches(data.data || []);
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        };
        
        if (isHQ && isHQ()) {
            loadBranches();
        }
    }, [isHQ]);

    const handleBranchChange = (e) => {
        const branchId = e.target.value;
        setSelectedBranch(branchId);
        setActiveBranch(branchId);
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <nav className="navbar navbar-expand navbar-light bg-white shadow-sm px-3" style={{ height: '64px' }}>
            <div className="container-fluid">
                <button className="btn btn-outline-secondary" onClick={onToggleSidebar}>
                    ☰
                </button>

                <div className="ms-auto d-flex align-items-center">
                    {isHQ && isHQ() && branches.length > 0 && (
                        <select 
                            className="form-select form-select-sm me-3"
                            value={selectedBranch}
                            onChange={handleBranchChange}
                            style={{ width: '200px' }}
                        >
                            <option value="">All Branches</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="dropdown">
                        <button 
                            className="btn btn-light dropdown-toggle d-flex align-items-center gap-2" 
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            data-bs-toggle="dropdown"
                            aria-expanded={dropdownOpen}
                        >
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                 style={{ width: '32px', height: '32px' }}>
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <span className="d-none d-md-inline">{user?.name || 'User'}</span>
                        </button>
                        <ul className={`dropdown-menu dropdown-menu-end ${dropdownOpen ? 'show' : ''}`}>
                            <li><a className="dropdown-item" href="/profile">Profile</a></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <button className="dropdown-item text-danger" onClick={handleLogout}>
                                    Logout
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    );
}
