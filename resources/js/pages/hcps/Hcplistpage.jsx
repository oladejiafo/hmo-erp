/**
 * HCPListPage — /hcps
 * Permission: hcps.view
 *
 * Lists all health care providers with:
 *   - Status tabs (All/Pending/Active/Suspended/Blacklisted)
 *   - Search by name or HCP code
 *   - Type filter dropdown
 *   - Performance score column
 * Clicking a row navigates to /hcps/:id
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Building } from 'lucide-react';
import { fetchHCPs } from '../../api/index';
import { PageHeader, StatusBadge, Pagination, LoadingSpinner, EmptyState, ErrorAlert } from '../../components/ui/index';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_COLOR = { active:'success', pending:'warning', suspended:'warning', blacklisted:'danger', terminated:'dark' };
const TIER_COLOR = { primary:{bg:'#e8f0fe',text:'#1967d2'}, secondary:{bg:'#fff3cd',text:'#664d03'}, tertiary:{bg:'#fce8e6',text:'#c5221f'} };

export default function HCPListPage() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [type, setType]     = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage]     = useState(1);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['hcps', { search, type, status, page }],
        queryFn:  () => fetchHCPs({ search: search||undefined, type: type||undefined, status: status||undefined, page, per_page:20 }),
        keepPreviousData: true,
    });

    const hcps = data?.data?.data ?? [];
    const meta = data?.meta;
    if (error) return <ErrorAlert error={error} onRetry={refetch} />;

    return (
        <div>
            <PageHeader
                title="Health Care Providers"
                subtitle="Manage accredited hospitals, clinics, labs and pharmacies"
                breadcrumbs={['Home', 'HCPs']}
                actions={hasPermission('hcps.create') && (
                    <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => navigate('/hcps/new')}>
                        <Plus size={16}/> Register HCP
                    </button>
                )}
            />
            <div className="card border-0 shadow-sm">
                {/* Status tabs */}
                <div className="card-header bg-white border-0 pt-3">
                    <div className="d-flex gap-1 flex-wrap">
                        {['','pending','active','suspended','blacklisted'].map(s=>(
                            <button key={s||'all'}
                                className={`btn btn-sm rounded-pill ${status===s?'btn-primary':'btn-outline-secondary'}`}
                                style={{fontSize:12,textTransform:'capitalize'}}
                                onClick={()=>{setStatus(s);setPage(1);}}>
                                {s||'All'}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Search bar */}
                <div className="card-body border-bottom pb-3 pt-0">
                    <div className="d-flex gap-3 flex-wrap">
                        <div className="input-group" style={{maxWidth:300}}>
                            <span className="input-group-text bg-white border-end-0"><Search size={15} className="text-muted"/></span>
                            <input type="text" className="form-control border-start-0" placeholder="Name or HCP code..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
                        </div>
                        <select className="form-select" style={{width:160}} value={type} onChange={e=>{setType(e.target.value);setPage(1);}}>
                            <option value="">All Types</option>
                            <option value="hospital">Building</option>
                            <option value="clinic">Clinic</option>
                            <option value="pharmacy">Pharmacy</option>
                            <option value="lab">Laboratory</option>
                            <option value="specialist">Specialist</option>
                        </select>
                        <div className="ms-auto text-muted" style={{fontSize:13}}>{meta?.total!=null&&`${meta.total} providers`}</div>
                    </div>
                </div>
                {/* Table */}
                <div className="card-body p-0">
                    {isLoading ? <div className="py-5 text-center"><LoadingSpinner text="Loading..."/></div>
                    : hcps.length===0 ? <EmptyState icon={Building} title="No providers found" description="Register your first health care provider."
                        action={hasPermission('hcps.create')&&<button className="btn btn-primary btn-sm" onClick={()=>navigate('/hcps/new')}>Register HCP</button>}/>
                    : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{fontSize:12,fontWeight:600}}>Provider</th>
                                        <th style={{fontSize:12,fontWeight:600}}>Code</th>
                                        <th style={{fontSize:12,fontWeight:600}}>Type</th>
                                        <th style={{fontSize:12,fontWeight:600}}>Tier</th>
                                        <th style={{fontSize:12,fontWeight:600}}>State</th>
                                        <th style={{fontSize:12,fontWeight:600}}>Score</th>
                                        <th style={{fontSize:12,fontWeight:600}}>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hcps.map(hcp=>{
                                        const tc=TIER_COLOR[hcp.tier]??{};
                                        return (
                                        <tr key={hcp.id} style={{cursor:'pointer'}} onClick={()=>navigate(`/hcps/${hcp.id}`)}>
                                            <td><div className="fw-semibold" style={{fontSize:13}}>{hcp.name}</div><div className="text-muted" style={{fontSize:11}}>{hcp.city}</div></td>
                                            <td><span className="font-monospace badge bg-secondary-subtle text-secondary">{hcp.hcp_code}</span></td>
                                            <td style={{fontSize:12,textTransform:'capitalize'}}>{hcp.type}</td>
                                            <td><span className="badge" style={{background:tc.bg,color:tc.text,fontSize:11,textTransform:'capitalize'}}>{hcp.tier}</span></td>
                                            <td style={{fontSize:12}}>{hcp.state}</td>
                                            <td style={{fontSize:13,fontWeight:600}}>{hcp.performance_score!=null?parseFloat(hcp.performance_score).toFixed(1):'—'}</td>
                                            <td><StatusBadge status={hcp.status} color={STATUS_COLOR[hcp.status]??'secondary'} label={hcp.status_label??hcp.status}/></td>
                                            <td><button className="btn btn-sm btn-outline-primary py-0" style={{fontSize:11}} onClick={e=>{e.stopPropagation();navigate(`/hcps/${hcp.id}`);}}>View</button></td>
                                        </tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {meta && <div className="card-body border-top pt-2 pb-3"><Pagination meta={meta} onPageChange={setPage}/></div>}
            </div>
        </div>
    );
}