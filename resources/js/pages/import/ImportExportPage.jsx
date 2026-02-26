import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Upload, Download, FileText, CheckCircle, XCircle,
    AlertTriangle, ArrowLeft, Database, Users, DollarSign,
    Building2, Loader, FileSpreadsheet
} from 'lucide-react';
import { PageHeader } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import { useDropzone } from 'react-dropzone';

export default function ImportExportPage() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('import');
    const [importType, setImportType] = useState('enrollees');
    const [importResults, setImportResults] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    const importMutation = useMutation({
        mutationFn: async ({ type, file }) => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/import/${type}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Import failed');
            }

            return response.json();
        },
        onSuccess: (data) => {
            setImportResults(data);
            const successCount = data.success?.length || 0;
            const errorCount = data.errors?.length || 0;
            
            if (errorCount === 0) {
                toast.success(`Successfully imported ${successCount} records`);
            } else {
                toast.warning(`Imported ${successCount} records with ${errorCount} errors`);
            }
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        
        const file = acceptedFiles[0];
        setUploadProgress(0);
        importMutation.mutate({ type: importType, file });
    }, [importType]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv'],
        },
        maxFiles: 1,
    });

    const downloadTemplate = (type, e) => {
        e.stopPropagation();
        toast.info(`Preparing ${type} template...`);
        
        fetch(`/api/import/template/${type}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Template download failed');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}_template.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Template downloaded');
            })
            .catch(error => {
                console.error('Template download error:', error);
                toast.error('Failed to download template');
            });
    };

    const exportData = (type) => {
        // Show loading toast
        toast.info(`Preparing ${type} export...`);
        
        // Use fetch to handle errors better
        fetch(`/api/export/${type}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Export failed');
                }
                return response.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Export completed');
            })
            .catch(error => {
                console.error('Export error:', error);
                toast.error('Export failed. Please try again.');
            });
    };

    const tabs = [
        { id: 'import', label: 'Import Data', icon: Upload },
        { id: 'export', label: 'Export Data', icon: Download },
    ];

    const importTypes = [
        { id: 'enrollees', label: 'Enrollees', icon: Users, permission: 'import.enrollees' },
        { id: 'tariffs', label: 'Tariffs', icon: DollarSign, permission: 'import.tariffs' },
        { id: 'hcps', label: 'Healthcare Providers', icon: Building2, permission: 'import.hcps' },
    ];

    const exportTypes = [
        { id: 'enrollees', label: 'Enrollees', icon: Users },
        { id: 'hcps', label: 'Healthcare Providers', icon: Building2 },
        { id: 'tariffs', label: 'Tariffs', icon: DollarSign },
        { id: 'claims-aging', label: 'Claims Aging Report', icon: FileText },
        { id: 'claims-by-hcp', label: 'Claims by HCP', icon: FileText },
        { id: 'cost-by-corporate', label: 'Cost per Corporate', icon: FileText },
        { id: 'high-cost-enrollees', label: 'High-Cost Enrollees', icon: FileText },
        { id: 'branch-comparison', label: 'Branch Comparison', icon: FileText },
    ];

    return (
        <div>
            <PageHeader
                title="Import / Export"
                subtitle="Bulk import enrollees, tariffs, HCPs and export reports"
                actions={
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft size={18} className="me-1" />
                        Back to Dashboard
                    </button>
                }
            />

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                {tabs.map(tab => (
                    <li key={tab.id} className="nav-item">
                        <button
                            className={`nav-link d-flex align-items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* Import Tab */}
            {activeTab === 'import' && (
                <div className="row">
                    <div className="col-md-4">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white">
                                <h6 className="mb-0 fw-bold">Import Type</h6>
                            </div>
                            <div className="list-group list-group-flush">
                                {importTypes.map(type => (
                                    hasPermission(type.permission) && (
                                        <div
                                            key={type.id}
                                            className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${importType === type.id ? 'active' : ''}`}
                                            onClick={() => setImportType(type.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <type.icon size={18} />
                                            <span className="flex-grow-1">{type.label}</span>
                                            <span
                                                className="btn btn-sm btn-link"
                                                onClick={(e) => downloadTemplate(type.id, e)}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <Download size={14} /> Template
                                            </span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-8">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body">
                                <h6 className="fw-bold mb-3">Upload File</h6>
                                <p className="text-muted small mb-4">
                                    Upload a CSV file with the correct column headers. 
                                    <span
                                        className="ms-2 text-primary"
                                        onClick={(e) => downloadTemplate(importType, e)}
                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Download template
                                    </span>
                                </p>

                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-3 p-5 text-center cursor-pointer transition ${
                                        isDragActive ? 'border-primary bg-primary-subtle' : 'border-secondary'
                                    }`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <input {...getInputProps()} />
                                    <Upload size={40} className="text-muted mb-3" />
                                    {isDragActive ? (
                                        <p className="mb-0">Drop the file here...</p>
                                    ) : (
                                        <>
                                            <p className="mb-1">Drag & drop a CSV file here, or click to select</p>
                                            <small className="text-muted">Maximum file size: 10MB</small>
                                        </>
                                    )}
                                </div>

                                {importMutation.isPending && (
                                    <div className="text-center mt-4">
                                        <Loader className="spinner-border text-primary mb-2" />
                                        <p className="mb-0">Processing upload...</p>
                                    </div>
                                )}

                                {importResults && (
                                    <div className="mt-4">
                                        <div className="d-flex align-items-center gap-3 mb-3">
                                            <div className="bg-success-subtle p-2 rounded">
                                                <CheckCircle size={20} className="text-success" />
                                            </div>
                                            <div>
                                                <h6 className="mb-0">Import Complete</h6>
                                                <small className="text-muted">
                                                    {importResults.success?.length || 0} succeeded, {importResults.errors?.length || 0} failed
                                                </small>
                                            </div>
                                        </div>

                                        {importResults.errors?.length > 0 && (
                                            <div className="mt-3">
                                                <h6 className="fw-bold mb-2 text-danger">Errors</h6>
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Row</th>
                                                                <th>Data</th>
                                                                <th>Error</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {importResults.errors.map((error, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{error.row}</td>
                                                                    <td>
                                                                        <pre className="small mb-0">
                                                                            {JSON.stringify(error.data)}
                                                                        </pre>
                                                                    </td>
                                                                    <td>
                                                                        {error.errors?.map((e, i) => (
                                                                            <div key={i} className="text-danger small">{e}</div>
                                                                        ))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        <h6 className="fw-bold mb-3">Export Data</h6>
                        <p className="text-muted small mb-4">
                            Select a dataset to export as CSV. Exports will download immediately.
                        </p>

                        <div className="row g-3">
                            {exportTypes.map(type => (
                                <div key={type.id} className="col-md-4">
                                    <button
                                        className="btn btn-outline-primary w-100 d-flex align-items-center gap-2 p-3"
                                        onClick={() => exportData(type.id)}
                                    >
                                        <type.icon size={18} />
                                        <span className="flex-grow-1 text-start">{type.label}</span>
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}