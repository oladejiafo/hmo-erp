/**
 * NEW FILE — resources/js/pages/portals/corporate/CorpEmployeeUtilizationPage.jsx
 *
 * The Budget Dashboard page already covers by-plan drill-down. This adds
 * the two things that only existed as a CSV download before now: a
 * searchable/sortable on-screen employee list, and a breakdown by claim
 * category, which didn't exist anywhere in the app yet.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCorpEmployeeUtilization, fetchCorpUtilizationByCategory, exportCorpUtilizationReport } from '../../../api/index';
import { formatCurrency } from '../../../utils/format';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Search, Download, ArrowUpDown, Users } from 'lucide-react';

const CATEGORY_COLORS = ['#0f4c81', '#1967d2', '#137333', '#e65100', '#8e24aa', '#c5221f', '#00838f', '#5d4037', '#616161', '#9e9d24'];

export default function CorpEmployeeUtilizationPage() {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('utilization_percent');
    const [sortDir, setSortDir] = useState('desc');

    const { data: empData, isLoading: empLoading } = useQuery({
        queryKey: ['corp-employee-utilization', search, sortBy, sortDir],
        queryFn: () => fetchCorpEmployeeUtilization({ search: search || undefined, sort_by: sortBy, sort_dir: sortDir }),
    });

    const { data: catData, isLoading: catLoading } = useQuery({
        queryKey: ['corp-utilization-by-category'],
        queryFn: fetchCorpUtilizationByCategory,
    });

    const employees = empData?.data ?? [];
    const categories = catData?.data ?? [];

    const toggleSort = (field) => {
        if (sortBy === field) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    return (
        <div>
            <div style={headerRowStyle}>
                <div>
                    <h1 style={titleStyle}>Employee Utilization</h1>
                    <p style={subtitleStyle}>Who's using their benefits, and on what</p>
                </div>
                <button onClick={exportCorpUtilizationReport} style={exportButtonStyle}>
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Category breakdown */}
            <div style={cardStyle}>
                <h2 style={sectionTitleStyle}>Utilization by category</h2>
                {catLoading ? (
                    <div style={loadingStyle}>Loading…</div>
                ) : !categories.length ? (
                    <div style={emptyStyle}>No claims recorded yet this year.</div>
                ) : (
                    <div style={categoryRowStyle}>
                        <div style={{ width: 220, height: 220 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={categories} dataKey="total_amount" nameKey="category" innerRadius={50} outerRadius={90} paddingAngle={2}>
                                        {categories.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={categoryListStyle}>
                            {categories.map((c, i) => (
                                <div key={c.category} style={categoryItemStyle}>
                                    <span style={{ ...categoryDotStyle, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                                    <span style={categoryNameStyle}>{c.category}</span>
                                    <span style={categoryCountStyle}>{c.claim_count} claim{c.claim_count === 1 ? '' : 's'}</span>
                                    <span style={categoryAmountStyle}>{formatCurrency(c.total_amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Employee table */}
            <div style={cardStyle}>
                <div style={tableHeaderRowStyle}>
                    <h2 style={sectionTitleStyle}>By employee</h2>
                    <div style={searchBoxStyle}>
                        <Search size={14} color="#a0aec0" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search name or ID"
                            style={searchInputStyle}
                        />
                    </div>
                </div>

                {empLoading ? (
                    <div style={loadingStyle}>Loading…</div>
                ) : !employees.length ? (
                    <div style={emptyStyle}>
                        <Users size={32} color="#a0aec0" />
                        <div style={{ marginTop: 8 }}>No employees match that search.</div>
                    </div>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Employee</th>
                                <th style={thStyle}>Plan</th>
                                <SortableTh label="Claims" field="claim_count" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                                <SortableTh label="Utilized" field="utilized" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                                <SortableTh label="Utilization" field="utilization_percent" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(e => (
                                <tr key={e.id} style={trStyle}>
                                    <td style={tdStyle}>
                                        <div style={empNameStyle}>{e.name}</div>
                                        <div style={empIdStyle}>{e.enrollee_id}</div>
                                    </td>
                                    <td style={tdStyle}>{e.plan_name}</td>
                                    <td style={tdStyle}>{e.claim_count}</td>
                                    <td style={tdStyle}>{formatCurrency(e.utilized)}</td>
                                    <td style={tdStyle}>
                                        <span style={pctBadgeStyle(e.utilization_percent)}>{e.utilization_percent}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function SortableTh({ label, field, sortBy, sortDir, onClick }) {
    const active = sortBy === field;
    return (
        <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => onClick(field)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: active ? '#0f4c81' : '#718096' }}>
                {label} <ArrowUpDown size={11} />
                {active && <span style={{ fontSize: 10 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
            </span>
        </th>
    );
}

function pctBadgeStyle(pct) {
    const color = pct > 90 ? '#c5221f' : pct > 70 ? '#e65100' : '#137333';
    const bg = pct > 90 ? '#fce8e6' : pct > 70 ? '#fff3e0' : '#e6f4ea';
    return { fontSize: 12, fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: 10 };
}

const headerRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 };
const titleStyle = { fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 };
const subtitleStyle = { color: '#718096', fontSize: 13, margin: '4px 0 0' };
const exportButtonStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#0f4c81', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const cardStyle = { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 12, padding: 20, marginBottom: 16 };
const sectionTitleStyle = { fontSize: 15, fontWeight: 700, color: '#2d3748', margin: 0 };
const loadingStyle = { textAlign: 'center', padding: 40, color: '#a0aec0' };
const emptyStyle = { textAlign: 'center', padding: 40, color: '#a0aec0', fontSize: 13 };
const categoryRowStyle = { display: 'flex', gap: 24, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' };
const categoryListStyle = { flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 };
const categoryItemStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 };
const categoryDotStyle = { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 };
const categoryNameStyle = { flex: 1, color: '#2d3748', fontWeight: 600 };
const categoryCountStyle = { color: '#a0aec0', fontSize: 12 };
const categoryAmountStyle = { color: '#2d3748', fontWeight: 700, minWidth: 90, textAlign: 'right' };
const tableHeaderRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 };
const searchBoxStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 220 };
const searchInputStyle = { border: 'none', outline: 'none', fontSize: 13, flex: 1 };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', borderBottom: '1px solid #e8ecf0' };
const trStyle = { borderBottom: '1px solid #f1f3f5' };
const tdStyle = { padding: '10px', fontSize: 13, color: '#4a5568' };
const empNameStyle = { fontWeight: 600, color: '#2d3748' };
const empIdStyle = { fontSize: 11, color: '#a0aec0', marginTop: 2 };
