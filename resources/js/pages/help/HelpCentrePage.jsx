/**
 * FILE: resources/js/pages/HelpCentrePage.jsx
 *
 * Full /help page — searchable, category-filtered, role-aware.
 * Admin users see an "Edit Articles" button and can toggle to the editor.
 */
import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search, BookOpen, ChevronRight, ThumbsUp, ThumbsDown,
    Edit, Plus, Eye, EyeOff, ArrowLeft, Star,
} from 'lucide-react';
import apiClient from '../../api/client';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/ui/index';
import { toast } from 'react-toastify';

export default function HelpCentrePage() {
    const { slug } = useParams();
    return slug ? <ArticleView slug={slug} /> : <ArticleList />;
}

// ── Article List / Home ───────────────────────────────────────────────────────
function ArticleList() {
    const navigate          = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [cat, setCat]     = useState(searchParams.get('cat') ?? '');
    const { hasPermission } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['help-articles', query, cat],
        queryFn: () => apiClient.get('/help', { params: { q: query || undefined, category: cat || undefined } }),
        staleTime: 60_000,
    });

    // const articles   = data?.data?.data?.data ?? data?.data?.data ?? [];
    const articles = data?.data?.data?.data ?? [];
    const categories = data?.data?.categories ?? [];
    const featured   = data?.data?.featured   ?? [];
    const meta       = data?.data?.data?.meta ?? data?.data?.meta ?? {};

    
    const handleSearch = (val) => {
        setQuery(val);
        setCat('');
        setSearchParams(val ? { q: val } : {});
    };

    return (
        <div>
            {/* Header */}
            <div className="text-center py-5 px-4 mb-4 rounded-3"
                 style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #1d6db5 100%)', color:'#fff' }}>
                <BookOpen size={40} className="mb-3 opacity-75" />
                <h2 className="fw-bold mb-2">Help Centre</h2>
                <p className="mb-4 opacity-75" style={{ fontSize:15 }}>
                    Find answers about enrollees, claims, reports, and everything in between.
                </p>
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                                <Search size={16} style={{ color:'#64748b' }} />
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Search articles…"
                                value={query}
                                onChange={e => handleSearch(e.target.value)}
                                style={{ fontSize:15 }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Sidebar — categories */}
                <div className="col-md-3 mb-4">
                    {hasPermission('help.admin') && (
                        <button className="btn btn-outline-primary btn-sm w-100 mb-3"
                                onClick={() => navigate('/help/admin')}>
                            <Edit size={13} className="me-1" />Manage Articles
                        </button>
                    )}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white fw-semibold" style={{ fontSize:13 }}>Browse by Category</div>
                        <div className="list-group list-group-flush">
                            <button
                                className={`list-group-item list-group-item-action d-flex justify-content-between ${!cat ? 'active' : ''}`}
                                style={{ fontSize:13 }}
                                onClick={() => { setCat(''); setQuery(''); setSearchParams({}); }}
                            >
                                All Articles
                                <span className="badge bg-secondary rounded-pill">{meta.total ?? ''}</span>
                            </button>
                            {categories.map(c => (
                                <button
                                    key={c.key}
                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${cat===c.key ? 'active' : ''}`}
                                    style={{ fontSize:13 }}
                                    onClick={() => { setCat(c.key); setQuery(''); setSearchParams({ cat: c.key }); }}
                                >
                                    <span>{c.icon} {c.label}</span>
                                    <span className="badge bg-secondary rounded-pill">{c.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="col-md-9">
                    {/* Featured / Start Here */}
                    {!query && !cat && featured.length > 0 && (
                        <div className="mb-4">
                            <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                                <Star size={15} style={{ color:'#f59e0b' }} />
                                Start Here
                            </h6>
                            <div className="row g-3 mb-4">
                                {featured.map(a => (
                                    <div key={a.id} className="col-md-6">
                                        <div
                                            className="card border-0 shadow-sm h-100"
                                            style={{ cursor:'pointer', transition:'box-shadow .15s' }}
                                            onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.1)'}
                                            onMouseLeave={e => e.currentTarget.style.boxShadow=''}
                                            onClick={() => navigate(`/help/${a.slug}`)}
                                        >
                                            <div className="card-body py-3">
                                                <div className="d-flex align-items-start gap-2">
                                                    <span style={{ fontSize:24 }}>{a.category_icon}</span>
                                                    <div>
                                                        <div className="fw-semibold" style={{ fontSize:13 }}>{a.title}</div>
                                                        <div className="text-muted" style={{ fontSize:11 }}>{a.category_label}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <hr />
                        </div>
                    )}

                    {/* Article list */}
                    {isLoading ? (
                        <div className="py-5 text-center"><LoadingSpinner /></div>
                    ) : articles.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Search size={40} className="mb-3 opacity-25" />
                            <p>No articles found{query ? ` for "${query}"` : ''}.</p>
                            {query && <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSearch('')}>Clear search</button>}
                        </div>
                    ) : (
                        <div className="card border-0 shadow-sm">
                            {articles.map((a, i) => (
                                <div
                                    key={a.id}
                                    className={`d-flex align-items-start gap-3 p-3 ${i < articles.length - 1 ? 'border-bottom' : ''}`}
                                    style={{ cursor:'pointer', transition:'background .1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                                    onClick={() => navigate(`/help/${a.slug}`)}
                                >
                                    <span style={{ fontSize:22, lineHeight:1, marginTop:3 }}>{a.category_icon}</span>
                                    <div style={{ flex:1 }}>
                                        <div className="fw-semibold" style={{ fontSize:14 }}>{a.title}</div>
                                        <div className="text-muted" style={{ fontSize:12 }}>{a.category_label}</div>
                                        {a.excerpt && (
                                            <div className="text-muted mt-1" style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                                                {a.excerpt}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight size={16} style={{ color:'#94a3b8', marginTop:4, flexShrink:0 }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Single Article View ───────────────────────────────────────────────────────
function ArticleView({ slug }) {
    const navigate        = useNavigate();
    const [feedback, setFeedback] = useState(false);
    const { hasPermission } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['help-article-full', slug],
        queryFn: () => apiClient.get(`/help/${slug}`),
        staleTime: 60_000,
    });

    const article = data?.data?.data;
    const related = data?.data?.related ?? [];

    const sendFeedback = async (helpful) => {
        await apiClient.post(`/help/${article.id}/feedback`, { helpful });
        setFeedback(true);
        toast.success('Thank you for your feedback!');
    };

    if (isLoading) return <div className="py-5 text-center"><LoadingSpinner /></div>;
    if (!article) return <div className="py-5 text-center text-muted">Article not found.</div>;

    return (
        <div className="row justify-content-center">
            <div className="col-lg-8">
                {/* Breadcrumb */}
                <nav className="mb-3" style={{ fontSize:13 }}>
                    <button className="btn btn-sm btn-link p-0 text-muted" onClick={() => navigate('/help')}>
                        <ArrowLeft size={13} className="me-1" />Help Centre
                    </button>
                    <span className="text-muted mx-2">/</span>
                    <span className="text-muted">{article.category_label}</span>
                </nav>

                <div className="card border-0 shadow-sm">
                    <div className="card-body p-4 p-md-5">
                        {/* Category badge */}
                        <span className="badge mb-3" style={{ background:'#e8f0fe', color:'#1d4ed8', fontSize:12 }}>
                            {article.category_icon} {article.category_label}
                        </span>

                        {/* Admin edit link */}
                        {hasPermission('help.admin') && (
                            <button className="btn btn-sm btn-outline-secondary float-end"
                                    onClick={() => navigate(`/help/admin/edit/${article.id}`)}>
                                <Edit size={13} className="me-1" />Edit
                            </button>
                        )}

                        {/* Article content — rendered markdown */}
                        <div className="markdown-body" style={{ fontSize:14, lineHeight:1.8 }}>
                            <ReactMarkdown
                                components={{
                                    h1: ({node,...props}) => <h2 className="fw-bold mt-0 mb-3" style={{fontSize:22}} {...props}/>,
                                    h2: ({node,...props}) => <h3 className="fw-semibold mt-4 mb-2" style={{fontSize:17}} {...props}/>,
                                    h3: ({node,...props}) => <h4 className="fw-semibold mt-3 mb-2" style={{fontSize:15}} {...props}/>,
                                    table: ({node,...props}) => <div className="table-responsive mb-3"><table className="table table-bordered table-sm" {...props}/></div>,
                                    thead: ({node,...props}) => <thead className="table-light" {...props}/>,
                                    blockquote: ({node,...props}) => (
                                        <blockquote className="border-start border-primary ps-3 text-muted" style={{fontSize:13}} {...props}/>
                                    ),
                                    code: ({node,inline,...props}) => inline
                                        ? <code className="bg-light px-1 rounded" style={{fontSize:12}} {...props}/>
                                        : <pre className="bg-light p-3 rounded" style={{fontSize:12,overflowX:'auto'}}><code {...props}/></pre>,
                                }}
                            >
                                {article.content}
                            </ReactMarkdown>
                        </div>

                        {/* Last updated */}
                        <p className="text-muted mt-4 mb-0" style={{ fontSize:11 }}>
                            Last updated: {new Date(article.updated_at).toLocaleDateString('en-NG', { day:'numeric',month:'long',year:'numeric' })}
                        </p>

                        {/* Feedback */}
                        <div className="border-top mt-4 pt-3">
                            {feedback ? (
                                <p className="text-success text-center mb-0" style={{ fontSize:13 }}>✓ Thanks for your feedback!</p>
                            ) : (
                                <div className="d-flex align-items-center gap-3 justify-content-center">
                                    <span className="text-muted" style={{ fontSize:13 }}>Was this article helpful?</span>
                                    <button className="btn btn-sm btn-outline-success" onClick={() => sendFeedback(true)}>
                                        <ThumbsUp size={13} className="me-1" />Yes, helpful
                                    </button>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => sendFeedback(false)}>
                                        <ThumbsDown size={13} className="me-1" />Not really
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related articles */}
                {related.length > 0 && (
                    <div className="mt-4">
                        <h6 className="fw-semibold mb-3">Related Articles</h6>
                        <div className="card border-0 shadow-sm">
                            {related.map((r, i) => (
                                <button
                                    key={r.id}
                                    className={`w-100 text-start px-4 py-3 d-flex align-items-center gap-2 bg-transparent border-0 ${i < related.length - 1 ? 'border-bottom' : ''}`}
                                    onClick={() => navigate(`/help/${r.slug}`)}
                                    style={{ fontSize:13, transition:'background .1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                                >
                                    <ChevronRight size={14} style={{ color:'#94a3b8' }} />
                                    {r.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center mt-4">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/help')}>
                        <ArrowLeft size={13} className="me-1" />Back to Help Centre
                    </button>
                </div>
            </div>
        </div>
    );
}
