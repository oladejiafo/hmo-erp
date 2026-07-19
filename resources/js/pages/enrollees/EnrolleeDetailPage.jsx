import React,{ useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, User, Calendar, Phone, Mail, MapPin, Users, FileText, PauseCircle, PlayCircle } from 'lucide-react';
import { fetchEnrollee, suspendEnrollee, draftEnrolleeResponse } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatDate } from '../../utils/format';
import { toast } from 'react-toastify';

export default function EnrolleeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [inquiryText, setInquiryText] = useState('');
    const [draftedResponse, setDraftedResponse] = useState(null);
    const [loadingResponse, setLoadingResponse] = useState(false);


    const { data, isLoading, error } = useQuery({
        queryKey: ['enrollee', id],
        queryFn: () => fetchEnrollee(id),
    });

    const suspendMutation = useMutation({
        mutationFn: () => suspendEnrollee(id, { reason: 'Status toggled by admin' }),
        onSuccess: (res) => {
            toast.success(res.message ?? 'Status updated.');
            queryClient.invalidateQueries({ queryKey: ['enrollee', id] });
        },
        onError: (err) => toast.error(err.response?.data?.message ?? 'Action failed.'),
    });

    const handleDraftResponse = async () => {
        if (!inquiryText.trim()) {
            toast.warning('Please enter the enquiry first');
            return;
        }
        setLoadingResponse(true);
        try {
            const res = await draftEnrolleeResponse(enrollee.id, inquiryText);
            if (res.success) setDraftedResponse(res.response);
        } catch (err) {
            toast.error('Failed to generate response');
        } finally {
            setLoadingResponse(false);
        }
    };

    // ── Early returns FIRST - before any data access ──
    if (isLoading) return <LoadingSpinner />;
    if (error)     return <ErrorAlert message={error.message} />;

    // ── Now safe to derive from data ──
    const enrollee    = data?.data ?.data|| data;

    if (!enrollee)    return <ErrorAlert message="Enrollee not found" />;

    const isSuspended = enrollee.status === 'suspended';
    const isExpired   = enrollee.is_expired;

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;
    if (!enrollee) return <ErrorAlert message="Enrollee not found" />;

    return (
        <div>
            <PageHeader
                title={`${enrollee.first_name} ${enrollee.last_name}`}
                subtitle={`Enrollee ID: ${enrollee.enrollee_id}`}
                actions={
                    <>
                        <button
                            className="btn btn-outline-secondary me-2"
                            onClick={() => navigate('/enrollees')}
                        >
                            <ArrowLeft size={18} className="me-1" />
                            Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/enrollees/${id}/edit`)}
                        >
                            <Edit size={18} className="me-1" />
                            Edit
                        </button>
                        <button
                            className={`btn btn-sm btn-outline-${isSuspended ? 'success' : 'warning'} d-flex align-items-center gap-1`}
                            onClick={() => suspendMutation.mutate()}
                            disabled={suspendMutation.isPending}
                        >
                            {isSuspended
                                ? <><PlayCircle size={14} /> Reactivate</>
                                : <><PauseCircle size={14} /> Suspend</>
                            }
                        </button>
                    </>
                }
            />

            <div className="row">
                <div className="col-md-4">
                    <div className="card mb-4">
                        <div className="card-body text-center">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-4 d-inline-block mb-3">
                                <User size={48} className="text-primary" />
                            </div>
                            <h5>{enrollee.first_name} {enrollee.last_name}</h5>
                            <StatusBadge status={enrollee.status} />
                            <hr />
                            <div className="text-start">
                                <p className="mb-2">
                                    <Calendar size={16} className="text-muted me-2" />
                                    DOB: {formatDate(enrollee.date_of_birth)} (Age {enrollee.age})
                                </p>
                                <p className="mb-2">
                                    <Phone size={16} className="text-muted me-2" />
                                    {enrollee.phone || 'N/A'}
                                </p>
                                <p className="mb-2">
                                    <Mail size={16} className="text-muted me-2" />
                                    {enrollee.email || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Enrolment Details</h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Corporate</small>
                                    <strong>{enrollee.corporate?.name || 'N/A'}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Plan</small>
                                    <strong>{enrollee.plan?.plan_name || 'N/A'}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Enrolment Date</small>
                                    <strong>{formatDate(enrollee.enrollment_date)}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Expiry Date</small>
                                    <strong className={enrollee.is_expired ? 'text-danger' : ''}>
                                        {formatDate(enrollee.expiry_date)}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">✉️ AI Response Drafter</h5>
                        </div>
                        <div className="card-body">
                            <textarea 
                                className="form-control mb-3"
                                rows={3}
                                value={inquiryText}
                                onChange={e => setInquiryText(e.target.value)}
                                placeholder="Paste enrollee's enquiry here..."
                            />
                            <button 
                                className="btn btn-outline-primary" 
                                onClick={handleDraftResponse} 
                                disabled={loadingResponse}
                            >
                                {loadingResponse ? 'Drafting...' : '✉️ Draft Response'}
                            </button>
                            
                            {draftedResponse && (
                                <div className="mt-3">
                                    <label className="form-label fw-semibold">Drafted Response</label>
                                    <textarea 
                                        className="form-control font-monospace small"
                                        rows={8}
                                        value={draftedResponse}
                                        onChange={e => setDraftedResponse(e.target.value)}
                                    />
                                    <button 
                                        className="btn btn-sm btn-outline-secondary mt-2"
                                        onClick={() => navigator.clipboard.writeText(draftedResponse)}
                                    >
                                        Copy to Clipboard
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Dependents</h5>
                            <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => navigate(`/enrollees/${id}/dependents/new`)}
                            >
                                <Users size={16} className="me-1" />
                                Add Dependent
                            </button>
                        </div>
                        <div className="card-body">
                            {enrollee.dependents?.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Relationship</th>
                                                <th>Age</th>
                                                <th>Status</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {enrollee.dependents.map(dep => (
                                                <tr key={dep.id}>
                                                    <td>{dep.first_name} {dep.last_name}</td>
                                                    <td>{dep.relationship}</td>
                                                    <td>{dep.age}</td>
                                                    <td><StatusBadge status={dep.status} /></td>
                                                    <td>
                                                        <button 
                                                            className="btn btn-sm btn-link"
                                                            onClick={() => navigate(`/enrollees/${id}/dependents/${dep.id}`)}
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted mb-0">No dependents found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
