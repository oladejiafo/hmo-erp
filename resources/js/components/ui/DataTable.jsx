import React from 'react';

export default function DataTable({ columns, data, loading, emptyMessage = 'No data found' }) {
    if (loading) return <div className="text-center p-4">Loading...</div>;
    if (!data?.length) return <div className="text-center p-4 text-muted">{emptyMessage}</div>;
    
    return (
        <div className="table-responsive">
            <table className="table table-hover">
                <thead><tr>{columns.map((c, i) => <th key={i}>{c.header}</th>)}</tr></thead>
                <tbody>{data.map((row, i) => (
                    <tr key={i}>{columns.map((c, j) => <td key={j}>{c.render ? c.render(row) : row[c.field]}</td>)}</tr>
                ))}</tbody>
            </table>
        </div>
    );
}
