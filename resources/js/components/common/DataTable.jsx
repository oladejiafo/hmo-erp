import React from 'react';

export default function DataTable({ columns, data, loading, emptyMessage = 'No data found' }) {
    if (loading) {
        return <div className="text-center p-4">Loading...</div>;
    }

    if (!data || data.length === 0) {
        return <div className="text-center p-4 text-muted">{emptyMessage}</div>;
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((col, colIndex) => (
                                <td key={colIndex}>
                                    {col.render ? col.render(row) : row[col.field]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
