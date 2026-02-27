/**
 * FILE: resources/js/components/HelpDrawer.jsx
 *
 * Floating ? button that appears on every page.
 * Opens a slide-over drawer showing:
 *  - Articles tagged for the current page (contextual)
 *  - A search box to find any article
 *  - A "Go to full Help Centre" link
 *
 * Usage: Mount once in App.jsx or Layout.jsx
 *   import HelpDrawer from './components/HelpDrawer';
 *   // inside the layout JSX:
 *   <HelpDrawer />
 */
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, X, Search, ChevronRight, ExternalLink, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react';
import apiClient from '../../api/client';
import ReactMarkdown from 'react-markdown';

// Map React route paths → page_context strings sent to the API
const routeToContext = (pathname) => {
    const map = [
        [/^\/dashboard$/,          'dashboard'],
        [/^\/enrollees\/new$/,     'enrollees.create'],
        [/^\/enrollees\/\d+$/,     'enrollees.show'],
        [/^\/enrollees/,           'enrollees.index'],
        [/^\/claims\/import/,      'claims.import'],
        [/^\/claims\/\d+/,         'claims.show'],
        [/^\/claims/,              'claims.index'],
        [/^\/pre-auth\/\d+/,       'pre-auth.show'],
        [/^\/pre-auth/,            'pre-auth.index'],
        [/^\/reports/,             'reports'],
        [/^\/finance\/batches/,    'finance.batches'],
        [/^\/corporates\/\d+/,     'corporates.show'],
        [/^\/member\/benefits/,    'member.benefits'],
        [/^\/member\/claims/,      'member.claims'],
        [/^\/member\/hcps/,        'member.hcps'],
        [/^\/member/,              'member.dashboard'],
    ];
    for (const [regex, ctx] of map) {
        if (regex.test(pathname)) return ctx;
    }
    return null;
};

export default function HelpDrawer() {
    const [open, setOpen]             = useState(false);
    const [query, setQuery]           = useState('');
    const [activeArticle, setArticle] = useState(null);
    const [feedbackSent, setFeedback] = useState(false);
    const location                    = useLocation();
    const navigate                    = useNavigate();
    const searchRef                   = useRef();
    const pageContext                  = routeToContext(location.pathname);

    // Reset article view when drawer closes or page changes
    useEffect(() => { setArticle(null); setQuery(''); setFeedback(false); }, [location.pathname]);
    useEffect(() => { if (open && searchRef.current) searchRef.current.focus(); }, [open]);

    // Contextual articles for this page
    const { data: contextData } = useQuery({
        queryKey: ['help-context', pageContext],
        queryFn: () => apiClient.get('/help/for-page', { params: { page: pageContext } }),
        enabled: !!pageContext,
        staleTime: 300_000,
    });

    // Search results
    const { data: searchData, isLoading: searching } = useQuery({
        queryKey: ['help-search', query],
        queryFn: () => apiClient.get('/help', { params: { q: query, per_page: 8 } }),
        enabled: query.length > 2,
        staleTime: 30_000,
    });

    // Full article
    const { data: articleData } = useQuery({
        queryKey: ['help-article', activeArticle],
        queryFn: () => apiClient.get(`/help/${activeArticle}`),
        enabled: !!activeArticle,
        staleTime: 300_000,
        onSuccess: () => setFeedback(false),
    });

    // const contextArticles = contextData?.data?.data ?? [];
    // const searchArticles  = searchData?.data?.data?.data ?? searchData?.data?.data ?? [];
    // const article         = articleData?.data?.data;

    // Contextual articles (returns array directly)
const contextArticles = contextData?.data?.data ?? [];

// Search results (paginated - data.data.data is the array)
const searchArticles = searchData?.data?.data?.data ?? [];

// Full article
const article = articleData?.data?.data;

    const sendFeedback = async (helpful) => {
        if (activeArticle) {
            await apiClient.post(`/help/${activeArticle}/feedback`, { helpful });
            setFeedback(true);
        }
    };

    const showArticles = query.length > 2 ? searchArticles : contextArticles;
    const showContext  = query.length <= 2;

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setOpen(true)}
                className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                style={{ position:'fixed', bottom:28, right:28, width:52, height:52, zIndex:1040, fontSize:22 }}
                title="Help Centre"
                aria-label="Open Help"
            >
                <HelpCircle size={24} />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1050 }}
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '95vw',
                background: '#fff', zIndex: 1060, display: 'flex', flexDirection: 'column',
                transform: open ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
                boxShadow: '-4px 0 24px rgba(0,0,0,.12)',
            }}>
                {/* Header */}
                <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom"
                     style={{ background:'#0f4c81', color:'#fff' }}>
                    <div className="d-flex align-items-center gap-2">
                        {activeArticle && (
                            <button className="btn btn-sm btn-link text-white p-0 me-1" onClick={() => setArticle(null)}>
                                ← Back
                            </button>
                        )}
                        <BookOpen size={18} />
                        <span className="fw-semibold">{activeArticle ? (article?.title ?? 'Loading…') : 'Help Centre'}</span>
                    </div>
                    <button className="btn btn-sm btn-link text-white p-0" onClick={() => setOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>

                    {/* Article view */}
                    {activeArticle ? (
                        <div className="p-4">
                            {!article ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" />
                                </div>
                            ) : (
                                <>
                                    <div className="mb-2">
                                        <span className="badge" style={{ background:'#e8f0fe', color:'#1d4ed8', fontSize:11 }}>
                                            {article.category_icon} {article.category_label}
                                        </span>
                                    </div>
                                    <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.7 }}>
                                        <ReactMarkdown>{article.content}</ReactMarkdown>
                                    </div>

                                    {/* Feedback */}
                                    <div className="mt-4 pt-3 border-top">
                                        {feedbackSent ? (
                                            <p className="text-success text-center" style={{ fontSize:13 }}>✓ Thanks for your feedback!</p>
                                        ) : (
                                            <div className="d-flex align-items-center gap-3 justify-content-center">
                                                <span className="text-muted" style={{ fontSize:12 }}>Was this helpful?</span>
                                                <button className="btn btn-sm btn-outline-success" onClick={() => sendFeedback(true)}>
                                                    <ThumbsUp size={13} className="me-1" />Yes
                                                </button>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => sendFeedback(false)}>
                                                    <ThumbsDown size={13} className="me-1" />No
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Related articles */}
                                    {articleData?.data?.related?.length > 0 && (
                                        <div className="mt-4">
                                            <p className="fw-semibold mb-2" style={{ fontSize: 12, color: '#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>
                                                Related Articles
                                            </p>
                                            {articleData.data.related.map(r => (
                                                <button key={r.id}
                                                    className="d-block text-start w-100 btn btn-link p-0 mb-1 text-decoration-none"
                                                    style={{ fontSize:13, color:'#1d4ed8' }}
                                                    onClick={() => setArticle(r.slug)}>
                                                    {r.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Search */}
                            <div className="px-4 pt-4 pb-2">
                                <div className="input-group input-group-sm">
                                    <span className="input-group-text bg-white border-end-0"><Search size={14} /></span>
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Search help articles…"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                    />
                                    {query && (
                                        <button className="btn btn-outline-secondary border-start-0" onClick={() => setQuery('')}>
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Section label */}
                            <div className="px-4 pb-1">
                                <p className="mb-1" style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:600 }}>
                                    {searching ? 'Searching…' : query.length > 2 ? `Results for "${query}"` : pageContext ? 'Help for this page' : 'Popular articles'}
                                </p>
                            </div>

                            {/* Article list */}
                            <div>
                                {showArticles.length === 0 && !searching ? (
                                    <div className="px-4 py-3 text-muted" style={{ fontSize:13 }}>
                                        {query.length > 2
                                            ? 'No articles found. Try different keywords.'
                                            : 'No specific help for this page yet.'}
                                    </div>
                                ) : showArticles.map(a => (
                                    <button
                                        key={a.id}
                                        className="w-100 text-start px-4 py-3 border-bottom d-flex align-items-start gap-3 bg-transparent border-0"
                                        style={{ transition:'background .1s', cursor:'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => setArticle(a.slug)}
                                    >
                                        <span style={{ fontSize:20, lineHeight:1, marginTop:2 }}>{a.category_icon}</span>
                                        <div style={{ flex:1 }}>
                                            <div className="fw-semibold" style={{ fontSize:13, color:'#1e293b' }}>{a.title}</div>
                                            <div className="text-muted" style={{ fontSize:11, marginTop:2 }}>
                                                {a.category_label}
                                            </div>
                                            {a.excerpt && (
                                                <div className="text-muted" style={{ fontSize:11, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                                                    {a.excerpt}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight size={14} style={{ color:'#94a3b8', marginTop:4, flexShrink:0 }} />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer — link to full help centre */}
                <div className="px-4 py-3 border-top text-center" style={{ background:'#f8fafc' }}>
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => { setOpen(false); navigate('/help'); }}
                    >
                        <BookOpen size={13} className="me-1" />
                        Open Full Help Centre
                    </button>
                </div>
            </div>
        </>
    );
}
