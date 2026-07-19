import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
    Sparkles, FileText, GitBranch, BarChart3,
    TrendingUp, ArrowLeft, AlertTriangle, Camera, MessageSquare
} from 'lucide-react';
import { PageHeader, LoadingSpinner } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';
import AIChatSidebar from '../../components/ai/AIChatSidebar';
import aiApi from '../../api/aiApi';

export default function AIToolsPage() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    const [activeTab, setActiveTab]             = useState('classify');
    const [chatOpen, setChatOpen]               = useState(false);
    const [classifyInput, setClassifyInput]     = useState('');
    const [routeClaimId, setRouteClaimId]       = useState('');
    const [ocrFile, setOcrFile]                 = useState(null);
    const [ocrResult, setOcrResult]             = useState(null);
    const [summaryReportType, setSummaryReportType] = useState('claims-aging');
    const [summaryResult, setSummaryResult]     = useState(null);

    // ── Mutations ────────────────────────────────────────────────────────────

    const classifyMutation = useMutation({
        mutationFn: () => aiApi.classifyDocument(classifyInput),
        onSuccess:  () => toast.success('Document classified'),
        onError:    (err) => toast.error(err.message),
    });

    const routeMutation = useMutation({
        mutationFn: () => aiApi.smartRoute(routeClaimId),
        onError: (err) => {
            // Axios puts the server message in err.response.data.message
            const msg = err.response?.data?.message || err.message;
            toast.error(msg);
        },
    });

    const ocrMutation = useMutation({
        mutationFn: (file) => aiApi.ocrDocument(file),
        onSuccess:  (data) => setOcrResult(data),
        onError:    (err) => toast.error(err.message),
    });

    const clustersQuery = useQuery({
        queryKey: ['fraud-clusters'],
        queryFn:  aiApi.fraudClusters,
        enabled:  activeTab === 'clusters',
    });

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleClassify = () => {
        if (!classifyInput.trim()) return;
        classifyMutation.mutate();
    };

    const handleRoute = () => {
        if (!routeClaimId.trim()) return;
        routeMutation.mutate();
    };

    const handleOcrUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setOcrFile(file);
        ocrMutation.mutate(file);
    };

    const handleSummarize = () => {
        const mockData = [
            { bucket: '0-7 days',   count: 45, value: 1250000 },
            { bucket: '8-14 days',  count: 32, value: 980000  },
            { bucket: '15-30 days', count: 18, value: 450000  },
            { bucket: '30+ days',   count: 7,  value: 210000  },
        ];
        aiApi.summarizeReport(summaryReportType, mockData)
            .then(setSummaryResult)
            .catch((err) => toast.error(err.message));
    };

    // ── Tabs ─────────────────────────────────────────────────────────────────

    const tabs = [
        { id: 'classify',  label: 'Classify Document', icon: FileText    },
        { id: 'route',     label: 'Smart Routing',     icon: GitBranch   },
        { id: 'ocr',       label: 'OCR Pipeline',      icon: Camera      },
        { id: 'summarize', label: 'Report Summaries',  icon: BarChart3   },
        { id: 'clusters',  label: 'Fraud Clusters',    icon: TrendingUp  },
        { id: 'chat',      label: 'AI Chat',           icon: MessageSquare, action: () => setChatOpen(true) },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            <PageHeader
                title="AI Tools"
                subtitle="Intelligent document processing, routing, and analytics"
                actions={
                    <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} className="me-1" />
                        Back to Dashboard
                    </button>
                }
            />

            {/* Tab Navigation */}
            <ul className="nav nav-tabs mb-4">
                {tabs.map(tab => (
                    <li key={tab.id} className="nav-item">
                        <button
                            className={`nav-link d-flex align-items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => tab.action ? tab.action() : setActiveTab(tab.id)}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* Tab Content */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-4">

                    {/* ── Classify Document ─────────────────────────────── */}
                    {activeTab === 'classify' && (
                        <div>
                            <h6 className="fw-bold mb-3">Document Classification</h6>
                            <p className="text-muted small mb-4">
                                Paste claim document text to auto-classify claim type,
                                suggest ICD-10 codes, and determine Pre-Auth. requirements.
                            </p>

                            <div className="mb-4">
                                <label className="form-label fw-semibold">Document Text</label>
                                <textarea
                                    className="form-control"
                                    rows={5}
                                    value={classifyInput}
                                    onChange={(e) => setClassifyInput(e.target.value)}
                                    placeholder="Paste extracted document text here..."
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleClassify}
                                disabled={classifyMutation.isPending || !classifyInput.trim()}
                            >
                                {classifyMutation.isPending
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Classifying...</>
                                    : <><Sparkles size={16} className="me-2" />Classify Document</>
                                }
                            </button>

                            {classifyMutation.data && (
                                <div className="mt-4 p-3 bg-light rounded">
                                    <h6 className="fw-bold mb-3">Classification Result</h6>
                                    <div className="mb-2">
                                        <span className="badge bg-primary me-2">
                                            Confidence: {classifyMutation.data.confidence}%
                                        </span>
                                        <span className="badge bg-success">
                                            Pre-Auth. Required: {classifyMutation.data.pa_required ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <p><strong>Claim Type:</strong> {classifyMutation.data.claim_type}</p>
                                    <p><strong>ICD Codes:</strong> {classifyMutation.data.icd_codes?.join(', ') || 'None'}</p>
                                    <p><strong>Reasoning:</strong> {classifyMutation.data.reasoning}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Smart Routing ─────────────────────────────────── */}
                    {activeTab === 'route' && (
                        <div>
                            <h6 className="fw-bold mb-3">Smart Routing</h6>
                            <p className="text-muted small mb-4">
                                Enter a claim ID to analyze risk and route to the appropriate processing queue.
                            </p>

                            <div className="mb-4">
                                <label className="form-label fw-semibold">Claim ID</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={routeClaimId}
                                    onChange={(e) => setRouteClaimId(e.target.value)}
                                    placeholder="Enter claim ID..."
                                />
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleRoute}
                                disabled={routeMutation.isPending || !routeClaimId.trim()}
                            >
                                {routeMutation.isPending
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Routing...</>
                                    : <><GitBranch size={16} className="me-2" />Analyze & Route</>
                                }
                            </button>

                            {routeMutation.data && (
                                <div className="mt-4 p-3 bg-light rounded">
                                    <h6 className="fw-bold mb-3">Routing Recommendation</h6>
                                    <div className="mb-3">
                                        <span className="badge bg-info me-2">Queue: {routeMutation.data.queue}</span>
                                        <span className="badge bg-warning text-dark">Priority: {routeMutation.data.priority}</span>
                                        <span className="badge bg-secondary ms-2">ETA: {routeMutation.data.eta}</span>
                                    </div>
                                    <p><strong>Reasoning:</strong> {routeMutation.data.reasoning}</p>
                                    {routeMutation.data.flags?.length > 0 && (
                                        <div className="mt-2">
                                            <strong>Risk Flags: </strong>
                                            {routeMutation.data.flags.map((flag, i) => (
                                                <span key={i} className="badge bg-danger me-1">{flag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── OCR Pipeline ──────────────────────────────────── */}
                    {activeTab === 'ocr' && (
                        <div>
                            <h6 className="fw-bold mb-3">OCR Document Processing</h6>
                            <p className="text-muted small mb-4">
                                Upload a claim document (PDF, JPG, PNG) to extract structured data automatically.
                            </p>

                            <div className="mb-4">
                                <label className="form-label fw-semibold">Upload Document</label>
                                <input
                                    type="file"
                                    className="form-control"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleOcrUpload}
                                />
                                <small className="text-muted">Max size: 10MB</small>
                            </div>

                            {ocrMutation.isPending && (
                                <div className="text-center py-4">
                                    <LoadingSpinner />
                                    <p className="mt-2 text-muted">Processing document...</p>
                                </div>
                            )}

                            {ocrResult && (
                                <div className="mt-4 p-3 bg-light rounded">
                                    <h6 className="fw-bold mb-3">Extracted Data</h6>
                                    <div className="row">
                                        <div className="col-md-6 mb-2">
                                            <small className="text-muted">Patient Name</small>
                                            <p className="fw-semibold mb-0">{ocrResult.patient_name || '-'}</p>
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <small className="text-muted">Service Date</small>
                                            <p className="fw-semibold mb-0">{ocrResult.service_date || '-'}</p>
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <small className="text-muted">Diagnosis</small>
                                            <p className="fw-semibold mb-0">{ocrResult.diagnosis || '-'}</p>
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <small className="text-muted">Total Amount</small>
                                            <p className="fw-semibold mb-0">
                                                ₦{ocrResult.total_amount?.toLocaleString() || '-'}
                                            </p>
                                        </div>
                                        <div className="col-md-6 mb-2">
                                            <small className="text-muted">Provider</small>
                                            <p className="fw-semibold mb-0">{ocrResult.provider_name || '-'}</p>
                                        </div>
                                    </div>

                                    {ocrResult.items?.length > 0 && (
                                        <>
                                            <h6 className="fw-bold mt-3 mb-2">Line Items</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Service</th>
                                                            <th>Qty</th>
                                                            <th>Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ocrResult.items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td>{item.service}</td>
                                                                <td>{item.quantity}</td>
                                                                <td>₦{item.price?.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Report Summaries ──────────────────────────────── */}
                    {activeTab === 'summarize' && (
                        <div>
                            <h6 className="fw-bold mb-3">AI Report Summaries</h6>
                            <p className="text-muted small mb-4">
                                Generate executive summaries of any report with key metrics and recommendations.
                            </p>

                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Report Type</label>
                                    <select
                                        className="form-select"
                                        value={summaryReportType}
                                        onChange={(e) => setSummaryReportType(e.target.value)}
                                    >
                                        <option value="claims-aging">Claims Aging</option>
                                        <option value="claims-by-hcp">Claims by HCP</option>
                                        <option value="cost-by-corporate">Cost per Corporate</option>
                                        <option value="high-cost-enrollees">High-Cost Enrollees</option>
                                        <option value="branch-comparison">Branch Comparison</option>
                                    </select>
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={handleSummarize}>
                                <Sparkles size={16} className="me-2" />Generate Summary
                            </button>

                            {summaryResult && (
                                <div className="mt-4 p-3 bg-light rounded">
                                    <h6 className="fw-bold mb-3">Executive Summary</h6>
                                    <p className="mb-3">{summaryResult.summary}</p>

                                    <h6 className="fw-bold mb-2">Key Points</h6>
                                    <ul className="mb-3">
                                        {summaryResult.bullets?.map((point, idx) => (
                                            <li key={idx}>{point}</li>
                                        ))}
                                    </ul>

                                    <div className="row">
                                        <div className="col-md-6">
                                            <small className="text-muted">Key Metric</small>
                                            <p className="fw-bold text-primary">{summaryResult.key_metric}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <small className="text-muted">Recommendation</small>
                                            <p className="fw-bold text-success">{summaryResult.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Fraud Clusters ────────────────────────────────── */}
                    {activeTab === 'clusters' && (
                        <div>
                            <h6 className="fw-bold mb-3">Fraud Pattern Clustering</h6>
                            <p className="text-muted small mb-4">
                                AI-discovered fraud patterns from the last 3 months of claims.
                            </p>

                            {clustersQuery.isLoading && <LoadingSpinner />}

                            {clustersQuery.isError && (
                                <div className="alert alert-danger">
                                    Failed to load fraud clusters. Please try again.
                                </div>
                            )}

                            {clustersQuery.data?.clusters?.map((cluster, idx) => (
                                <div key={idx} className="card mb-3 border-0 shadow-sm">
                                    <div className="card-body">
                                        <h6 className="fw-bold d-flex align-items-center gap-2">
                                            <AlertTriangle size={16} className="text-warning" />
                                            {cluster.label}
                                        </h6>
                                        <p className="text-muted small mb-2">{cluster.description}</p>
                                        <div className="d-flex gap-3">
                                            <span className="badge bg-light text-dark">{cluster.count} cases</span>
                                            <span className="badge bg-light text-dark">Avg Score: {cluster.avg_score}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {clustersQuery.data?.noise_points > 0 && (
                                <div className="alert alert-warning">
                                    <strong>{clustersQuery.data.noise_points} isolated anomalies</strong> - individual cases not fitting any pattern
                                </div>
                            )}

                            {clustersQuery.data?.clusters?.length === 0 && !clustersQuery.isLoading && (
                                <div className="text-center py-4 text-muted">
                                    No fraud patterns detected in the last 3 months.
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* AI Chat Sidebar */}
            <AIChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    );
}