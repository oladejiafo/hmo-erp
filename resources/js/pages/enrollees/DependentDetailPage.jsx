import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit, User, Calendar, Heart, Droplet, Users } from 'lucide-react';
import { fetchDependent } from '../../api/index';
import { PageHeader, StatusBadge, LoadingSpinner, ErrorAlert } from '../../components/ui/index';
import { formatDate } from '../../utils/format';

export default function DependentDetailPage() {
    const { enrolleeId, dependentId } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery({
        queryKey: ['dependent', enrolleeId, dependentId],
        queryFn: () => fetchDependent(enrolleeId, dependentId),
        enabled: !!enrolleeId && !!dependentId, // Add this line
    });
    
    const dependent = data?.data || data || {};
    
    console.log('Dependent data:', data);

    // const dependent = data?.data?.data || data?.data || data;
    // const dependent = data?.data || {};
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorAlert message={error.message} />;
    if (!dependent) return <ErrorAlert message="Dependent not found" />;

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(dependent.date_of_birth);

    return (
        <div>
            <PageHeader
                title={`${dependent.first_name} ${dependent.last_name}`}
                subtitle={`Dependent of Enrollee`}
                actions={
                    <>
                        <button
                            className="btn btn-outline-secondary me-2"
                            onClick={() => navigate(`/enrollees/${enrolleeId}`)}
                        >
                            <ArrowLeft size={18} className="me-1" />
                            Back to Enrollee
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/enrollees/${enrolleeId}/dependents/${dependentId}/edit`)}
                        >
                            <Edit size={18} className="me-1" />
                            Edit
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
                            <h5>{dependent.first_name} {dependent.last_name}</h5>
                            <StatusBadge status={dependent.status || 'active'} />
                            <hr />
                            <div className="text-start">
                                <p className="mb-2">
                                    <Calendar size={16} className="text-muted me-2" />
                                    DOB: {formatDate(dependent.date_of_birth)} (Age {age})
                                </p>
                                <p className="mb-2">
                                    <Users size={16} className="text-muted me-2" />
                                    Relationship: {dependent.relationship}
                                </p>
                                <p className="mb-2">
                                    <Heart size={16} className="text-muted me-2" />
                                    Blood Group: {dependent.blood_group || 'N/A'}
                                </p>
                                <p className="mb-2">
                                    <Droplet size={16} className="text-muted me-2" />
                                    Genotype: {dependent.genotype || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">Additional Information</h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Full Name</small>
                                    <strong>{dependent.first_name} {dependent.middle_name} {dependent.last_name}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Gender</small>
                                    <strong>{dependent.gender}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Date of Birth</small>
                                    <strong>{formatDate(dependent.date_of_birth)}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Age</small>
                                    <strong>{age} years</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Blood Group</small>
                                    <strong>{dependent.blood_group || 'Not specified'}</strong>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <small className="text-muted d-block">Genotype</small>
                                    <strong>{dependent.genotype || 'Not specified'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
